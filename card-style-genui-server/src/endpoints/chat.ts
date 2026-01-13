import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { compare, Operation } from 'fast-json-patch';
import { PromptBuilder } from '../ai/PromptBuilder';
import { LLMService } from '../ai/LLMService';
import { AmapService } from '../services/AmapService';
// Import EventType from @ag-ui/core
import { EventType } from '@ag-ui/core';
import { ConversationTurn, IntentRecognitionService } from '../ai/IntentRecognitionService';
import { IntentTemplateService } from '../ai/IntentTemplateService';

// In-memory session store (MVP)
const stateStore = new Map<string, any>();

/**
 * Handles the /api/chat endpoint following AG-UI protocol structure.
 * Streams SSE events: TEXT_MESSAGE_*, STATE_DELTA, RUN_FINISHED.
 */
export const chatHandler = async (req: Request, res: Response) => {
    // AG-UI Request Body Structure: { input: "query", context: {}, threadId, runId, messages: [...], ... }
    const reqBody = req.body || {};

    const sessionId = reqBody.threadId || reqBody.sessionId || uuidv4();
    const runId = reqBody.runId || uuidv4();
    const inputMsg = reqBody.input || (reqBody.messages ? reqBody.messages[reqBody.messages.length - 1]?.content : "") || "";
    const clientContext = reqBody.context || reqBody.state?.dataContext || {};
    const clientMessages = reqBody.messages || []; // 客户端发送的完整对话历史

    const startTotal = Date.now();
    console.log(`[Perf] [1. Request Start] New Chat Request: ${new Date().toISOString()} | Session: ${sessionId}`);

    // Initialize server state
    let serverState = stateStore.get(sessionId) || {};
    if (!serverState.conversationHistory) {
        serverState.conversationHistory = [];
    }
    if (clientContext && Object.keys(clientContext).length > 0) {
        serverState.dataContext = { ...(serverState.dataContext || {}), ...clientContext };
    }

    // 同步客户端的对话历史到服务端
    // 将客户端的 messages 数组转换为服务端的 ConversationTurn 格式
    if (clientMessages && clientMessages.length > 0) {
        console.log(`[Chat] Syncing conversation history from client. Client messages: ${clientMessages.length}, Server history: ${serverState.conversationHistory.length}`);
        
        // 将客户端消息转换为服务端格式
        const clientHistory: ConversationTurn[] = [];
        for (let i = 0; i < clientMessages.length - 1; i += 2) {
            const userMsg = clientMessages[i];
            const assistantMsg = clientMessages[i + 1];
            
            if (userMsg?.role === 'user' && userMsg?.content) {
                clientHistory.push({
                    query: userMsg.content,
                    response: assistantMsg?.content || '',
                    timestamp: Date.now() - (clientMessages.length - i) * 1000 // 估算时间戳
                });
            }
        }

        // 如果客户端历史比服务端长，使用客户端历史
        if (clientHistory.length > serverState.conversationHistory.length) {
            serverState.conversationHistory = clientHistory;
            console.log(`[Chat] Updated server history from client. New length: ${serverState.conversationHistory.length}`);
        }
    }

    // Hydrate DSL from client if server lost it (e.g. restart)
    if (!serverState.dsl && reqBody.state?.dsl) {
        serverState.dsl = reqBody.state.dsl;
        console.log(`[Chat] Hydrated DSL from Client Request (Keys: ${Object.keys(serverState.dsl).join(', ')})`);
    }

    console.log(`[Chat] Incoming Request:
  - SessionID: ${sessionId}
  - RunID: ${runId}
  - Input: "${inputMsg}"
  `);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const writeEvent = (event: any) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
        // 1. RUN_STARTED
        writeEvent({
            type: EventType.RUN_STARTED,
            threadId: sessionId,
            runId: runId,
            timestamp: Date.now()
        });

        const messageId = uuidv4();

        // 2. TEXT_MESSAGE_START
        writeEvent({
            type: EventType.TEXT_MESSAGE_START,
            threadId: sessionId,
            runId: runId,
            messageId: messageId,
            role: "assistant",
            timestamp: Date.now()
        });

        // Helper to send text delta
        const sendText = (text: string) => {
            writeEvent({
                type: EventType.TEXT_MESSAGE_CONTENT,
                threadId: sessionId,
                runId: runId,
                messageId: messageId,
                role: "assistant",
                delta: text,
                timestamp: Date.now()
            });
        };

        sendText("Thinking...");

        // 3. Setup Context Data
        const lowerMsg = inputMsg.toLowerCase();

        // Ensure dataContext exists
        if (!serverState.dataContext) serverState.dataContext = {};
        const contextData = serverState.dataContext;

        // User Location from Context (sent by Client)
        const USER_LOCATION = contextData.location || '121.399641,31.168876'; // Fallback to Shanghai if missing
        console.log(`[Chat] Using User Location: ${USER_LOCATION}`);

        // --- STEP 1: Intent Recognition ---
        console.log(`[Chat] Starting intent recognition for: "${inputMsg}"`);

        // Get conversation history for context-aware intent recognition
        const conversationHistory: ConversationTurn[] = serverState.conversationHistory || [];
        console.log(`[Chat] Conversation history length: ${conversationHistory.length}`);
        
        let recognizedIntent: any; // IntentResult

        // Keep-alive loop
        const keepAliveInterval = setInterval(() => { res.write(': keep-alive\n\n'); }, 3000);

        try {
            // Recognize Intent FIRST
            recognizedIntent = await IntentRecognitionService.recognizeIntent(
                inputMsg, 
                conversationHistory,
                { maxTurns: 10, enableContextAwareness: true }
            );

            console.log(`[LLMService] Intent recognized: ${recognizedIntent.intent} (confidence: ${recognizedIntent.confidence})`);
            console.log(`[LLMService] Intent reasoning: ${recognizedIntent.reasoning}`);

            // Apply Sticky Intent Logic
            const lastIntent = serverState.lastIntent;
             if (lastIntent && lastIntent !== 'chat' && lastIntent !== 'unknown') {
                // KEYWORDS: Visual or Content modifications
                const modificationKeywords = [
                  '改成', '换成', '颜色', '变为', 'adjust', 'change', 'color', 'background', 'larger', 'smaller', 'font', 'red', 'green', 'blue', 'purple',
                  '标题', '文字', '文本', '修改', 'title', 'text', 'size', '字体', '字号', '内容', '大小', 'updated'
                ];
         
                if (modificationKeywords.some(kw => inputMsg.includes(kw))) {
                  if (recognizedIntent.intent === 'chat' || recognizedIntent.intent === 'cartoon_image' || recognizedIntent.confidence < 0.9) {
                    console.log(`[LLMService] Sticky Intent Triggered: Overriding '${recognizedIntent.intent}' with LastIntent '${lastIntent}' due to modification keywords.`);
                    recognizedIntent.intent = lastIntent;
                    recognizedIntent.reasoning = "Sticky Intent: User requested style modification on previous context.";
                  }
                }
              }

            // Valid extracted keyword?
            if (recognizedIntent.extractedKeyword) {
                console.log(`[Chat] Using extracted keyword from intent recognition: "${recognizedIntent.extractedKeyword}"`);
            }
            
            // Persist intent
            serverState.lastIntent = recognizedIntent.intent;
            console.log(`[Chat] Saved Intent for next turn: ${serverState.lastIntent}`);

        } catch (err) {
            console.error('[Chat] Intent recognition failed, using fallback:', err);
             // Fallback
             recognizedIntent = { intent: 'chat', confidence: 0 };
        }

        // --- STEP 2: Data Fetching (Pre-Generation) ---
        // Now use recogzinedIntent to fetch data *before* generating UI
        
        if (recognizedIntent.intent === 'poi') {
            // --- POI Logic ---
            let poiKeyword = recognizedIntent.extractedKeyword;
            if (!poiKeyword) {
                 const cleanMsg = inputMsg.replace(/附近|的|查找|搜索|查看|有没有|推荐|我想去|帮我找|找|一下/g, '').replace(/ting$/i, '').trim();
                 poiKeyword = cleanMsg;
            }
             if (!poiKeyword && (lowerMsg.includes('咖啡') || lowerMsg.includes('coffee'))) {
                    poiKeyword = '咖啡';
             }

             if(poiKeyword) {
                 sendText(`\n(Searching nearby POIs: ${poiKeyword}...)`);
                 console.log(`[Chat] POI Search: using keyword: "${poiKeyword}" (Original: "${inputMsg}")`);
                 try {
                     let pois = await AmapService.searchPoi(poiKeyword, 'Shanghai', USER_LOCATION);
                     if (pois.length === 0) {
                         console.warn('[Chat] No real POIs found. Falling back to Mock Data.');
                         pois = AmapService.getMockPois(poiKeyword);
                     }
                     if (pois.length > 0) {
                         contextData.pois = pois; // Inject into context
                     }
                 } catch(e) {
                     console.error("POI Search Failed", e);
                 }
             }
        } else if (recognizedIntent.intent === 'weather') {
             // --- Weather Logic ---
             let city = 'Shanghai';
             if (inputMsg.includes('北京')) city = 'Beijing';
             if (inputMsg.includes('广州')) city = 'Guangzhou';
             if (inputMsg.includes('深圳')) city = 'Shenzhen';
             
             sendText("\n(Fetching weather data...)");
             try {
                 const weatherData = await AmapService.getWeather(city, USER_LOCATION);
                 contextData.weather = weatherData;
             } catch(e) { console.error("Weather fetch failed", e); }

        } else if (recognizedIntent.intent === 'route_planning') {
             // --- Route Logic ---
             // Extract Origin/Dest logic similar to before...
            const routeRegex = /(?:从|from)\s*([^到\s]+)\s*(?:到|to|去)\s*([^的\s]+)/i;
            const matchRoute = inputMsg.match(routeRegex);

            let origin = USER_LOCATION;
            let dest = 'Beijing';

            if (matchRoute) {
                origin = matchRoute[1]; 
                dest = matchRoute[2];
            } else {
                const destMatch = inputMsg.match(/(?:去|到|导航|drive to)\s*([^的\s]+)/i);
                if (destMatch) { dest = destMatch[1]; }
            }
            if (origin.includes('我') || origin.includes('这') || origin.toLowerCase().includes('here') || origin.toLowerCase().includes('me')) {
                origin = USER_LOCATION;
            }

            sendText(`\n(Planning route to ${dest}...)`);
            try {
                 let originCoords = origin;
                if (!origin.includes(',')) {
                    const coords = await AmapService.getCoordinates(origin);
                    if (coords) originCoords = coords;
                }
                let destCoords = dest;
                if (!dest.includes(',')) {
                    const coords = await AmapService.getCoordinates(dest);
                    if (coords) destCoords = coords;
                }
                if (originCoords && destCoords) {
                    const routeData = await AmapService.getDrivingRoute(originCoords, destCoords);
                    contextData.route = {
                        origin: origin === USER_LOCATION ? 'Current Location' : origin,
                        destination: dest,
                        originLocation: originCoords,
                        destinationLocation: destCoords,
                        ...routeData
                    };
                }
            } catch(e) { console.error("Route planning failed", e); }
        } else if (recognizedIntent.intent === 'cartoon_image') {
            // --- Image Generation Logic ---
            sendText(`\n(Generating image for: "${inputMsg}"...)`);
            const { AliyunImageService } = require('../services/AliyunImageService');
            try {
                // Use extracted entities for better prompt if available, else inputMsg
                // For cartoon_image, prompt is key.
                const imagePrompt = inputMsg; 
                const imageUrl = await AliyunImageService.generateImage(imagePrompt);
                
                if (imageUrl) {
                    contextData.generatedImage = {
                        url: imageUrl,
                        prompt: imagePrompt
                    };
                    console.log(`[Chat] Image generated: ${imageUrl}`);
                } else {
                    sendText("\n(Image generation failed, using placeholder)");
                }
            } catch (e) {
                console.error("Image generation error", e);
            }
        } else if (recognizedIntent.intent === 'flight') {
             // --- Flight/Train Logic ---
             // No specific service to call. We rely on LLM's 'enable_search: true' (Qwen-Flash/Max).
             // Just pass through.
             sendText(`\n(Searching for flight/train info: "${inputMsg}"...)`);
             console.log(`[Chat] Flight Intent: Delegating to LLM with Search.`);
        }

        // --- STEP 3: UI Generation ---
        
        let currentDsl = serverState.dsl || null;
        // Context Awareness Rule: Reset if requested
        const resetKeywords = ['重新', '再次', '再生成', 'reset', 'again', 'rewrite', 'retry'];
        if (resetKeywords.some(kw => inputMsg.includes(kw))) {
             currentDsl = null;
        }

        // Import IntentTemplateService (Use dynamic import or ensure it is imported at top)
        const { IntentTemplateService } = require('../ai/IntentTemplateService'); // Or rely on top-level import

        // Generate Prompt using the Intent + Context Data
        const intentPrompt = PromptBuilder.constructPrompt(inputMsg, contextData, currentDsl);

        // Call LLM with Streaming
        let lastEmittedDsl = serverState.dsl ? JSON.parse(JSON.stringify(serverState.dsl)) : null; 
        let isDslUpdateStarted = false;

        // streaming callback
        const fullResponse = await LLMService.streamUI(intentPrompt, inputMsg, contextData, currentDsl, (newDsl, _) => {
            if (!isDslUpdateStarted) {
                const firstFrameTime = Date.now();
                const latency = firstFrameTime - startTotal;
                console.log(`[Perf] [3. First Frame DSL] Time to First Frame: ${latency}ms`);
            }
            isDslUpdateStarted = true;
            
            // Compute incremental patch
            const patch = lastEmittedDsl
                ? compare({ dsl: lastEmittedDsl }, { dsl: newDsl })
                : [{ op: 'add', path: '/dsl', value: newDsl } as Operation];

            if (patch.length > 0) {
                // Update local tracking state
                lastEmittedDsl = JSON.parse(JSON.stringify(newDsl));
                
                // Persist to server state periodically (or at end, but nice to have in case of crash)
                serverState.dsl = newDsl;
                stateStore.set(sessionId, serverState);

                console.log(`[Chat] [Stream Patch]: ${patch.length} ops`);
                writeEvent({
                    type: EventType.STATE_DELTA,
                    threadId: sessionId,
                    runId: runId,
                    delta: patch,
                    timestamp: Date.now()
                });
            }
        });

        clearInterval(keepAliveInterval);
        console.log(`[Chat] [LLM Raw Response Length]: ${fullResponse.length}`);

        // Final consistency check or fallback for non-JSON response
        if (!isDslUpdateStarted) {
             // If no DSL was ever generated, treated as pure text response
             sendText("\n" + fullResponse);
        } else {
             // Ensure final state is saved (redundant if done in callback, but safe)
             serverState.dsl = lastEmittedDsl;
             stateStore.set(sessionId, serverState);
        }

        // Just for logging/debugging
        const dslObject = lastEmittedDsl;

        // 6. TEXT_MESSAGE_END
        writeEvent({
            type: EventType.TEXT_MESSAGE_END,
            threadId: sessionId,
            runId: runId,
            messageId: messageId,
            role: "assistant",
            timestamp: Date.now()
        });

        // Save conversation history for context-aware intent recognition
        // Extract the assistant's response from DSL
        let assistantResponse = fullResponse;
        if (dslObject) {
            // Try to extract a meaningful response from DSL
            assistantResponse = JSON.stringify(dslObject);
        }

        // Add current turn to conversation history
        serverState.conversationHistory.push({
            query: inputMsg,
            response: assistantResponse,
            timestamp: Date.now()
        });

        // Keep only the last 10 turns
        const maxHistoryTurns = 10;
        if (serverState.conversationHistory.length > maxHistoryTurns) {
            serverState.conversationHistory = serverState.conversationHistory.slice(-maxHistoryTurns);
        }

        console.log(`[Chat] Conversation history updated. Total turns: ${serverState.conversationHistory.length}`);

        // 7. RUN_FINISHED
        writeEvent({
            type: EventType.RUN_FINISHED,
            threadId: sessionId,
            runId: runId,
            status: "success",
            timestamp: Date.now()
        });

        res.end();

    } catch (error: any) {
        console.error("Error in chatHandler:", error);
        writeEvent({
            type: EventType.RUN_ERROR,
            threadId: sessionId,
            runId: runId,
            code: "INTERNAL_ERROR",
            message: error.message,
            timestamp: Date.now()
        });
        res.end();
    }
};

/**
 * Non-streaming handler for simple request/response (REST-like).
 * Useful for debugging or clients that don't support SSE.
 * Returns: { sessionId, patch, dataContext? }
 */
export const chatOnceHandler = async (req: Request, res: Response) => {
    const { messages, state, sessionId: reqSessionId } = req.body;
    const sessionId = reqSessionId || uuidv4();
    let serverState = stateStore.get(sessionId) || {};

    // Initialize conversation history if not exists
    if (!serverState.conversationHistory) {
        serverState.conversationHistory = [];
    }

    if (state?.dataContext) {
        serverState.dataContext = state.dataContext;
    }
    
    // Ensure dataContext exists
    if (!serverState.dataContext) serverState.dataContext = {};
    const contextData = serverState.dataContext;

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const lowerMsg = lastUserMessage.toLowerCase();
    
    // User Location from Context (sent by Client)
    const USER_LOCATION = contextData.location || '121.399641,31.168876'; // Fallback to Shanghai if missing

    try {
        // --- STEP 1: Intent Recognition ---
        // Get conversation history for context-aware intent recognition
        const conversationHistory: ConversationTurn[] = serverState.conversationHistory || [];
        
        let recognizedIntent: any; 

        try {
            // Recognize Intent FIRST
            recognizedIntent = await IntentRecognitionService.recognizeIntent(
                lastUserMessage, 
                conversationHistory,
                { maxTurns: 10, enableContextAwareness: true }
            );
            console.log(`[ChatOnce] Intent: ${recognizedIntent.intent}`);

            // Apply Sticky Intent Logic
            const lastIntent = serverState.lastIntent;
             if (lastIntent && lastIntent !== 'chat' && lastIntent !== 'unknown') {
                const modificationKeywords = [
                  '改成', '换成', '颜色', '变为', 'adjust', 'change', 'color', 'background', 'larger', 'smaller', 'font', 'red', 'green', 'blue', 'purple',
                  '标题', '文字', '文本', '修改', 'title', 'text', 'size', '字体', '字号', '内容', '大小', 'updated'
                ];
                if (modificationKeywords.some(kw => lastUserMessage.includes(kw))) {
                  if (recognizedIntent.intent === 'chat' || recognizedIntent.intent === 'cartoon_image' || recognizedIntent.confidence < 0.9) {
                    recognizedIntent.intent = lastIntent;
                  }
                }
              }
            
            // Persist intent
            serverState.lastIntent = recognizedIntent.intent;

        } catch (err) {
             recognizedIntent = { intent: 'chat', confidence: 0 };
        }

        // --- STEP 2: Data Fetching (Pre-Generation) ---
        
        if (recognizedIntent.intent === 'poi') {
            let poiKeyword = recognizedIntent.extractedKeyword;
            if (!poiKeyword) {
                 const cleanMsg = lastUserMessage.replace(/附近|的|查找|搜索|查看|有没有|推荐|我想去|帮我找|找|一下/g, '').replace(/ting$/i, '').trim();
                 poiKeyword = cleanMsg;
            }
             if (!poiKeyword && (lowerMsg.includes('咖啡') || lowerMsg.includes('coffee'))) {
                    poiKeyword = '咖啡';
             }

             if(poiKeyword) {
                 try {
                     let pois = await AmapService.searchPoi(poiKeyword, 'Shanghai', USER_LOCATION);
                     if (pois.length > 0) {
                         contextData.pois = pois;
                     } else {
                         contextData.pois = AmapService.getMockPois(poiKeyword); // Fallback
                     }
                 } catch(e) { console.error("POI Search Failed", e); }
             }
        } else if (recognizedIntent.intent === 'weather') {
             let city = 'Shanghai';
             if (lastUserMessage.includes('北京')) city = 'Beijing';
             if (lastUserMessage.includes('广州')) city = 'Guangzhou';
             if (lastUserMessage.includes('深圳')) city = 'Shenzhen';
             
             try {
                 const weatherData = await AmapService.getWeather(city, USER_LOCATION);
                 contextData.weather = weatherData;
             } catch(e) { console.error("Weather fetch failed", e); }

        } else if (recognizedIntent.intent === 'route_planning') {
            const routeRegex = /(?:从|from)\s*([^到\s]+)\s*(?:到|to|去)\s*([^的\s]+)/i;
            const matchRoute = lastUserMessage.match(routeRegex);

            let origin = USER_LOCATION;
            let dest = 'Beijing';

            if (matchRoute) {
                origin = matchRoute[1]; 
                dest = matchRoute[2];
            } else {
                const destMatch = lastUserMessage.match(/(?:去|到|导航|drive to)\s*([^的\s]+)/i);
                if (destMatch) { dest = destMatch[1]; }
            }
            if (origin.includes('我') || origin.includes('这') || origin.toLowerCase().includes('here') || origin.toLowerCase().includes('me')) {
                origin = USER_LOCATION;
            }

            try {
                 let originCoords = origin;
                if (!origin.includes(',')) {
                    const coords = await AmapService.getCoordinates(origin);
                    if (coords) originCoords = coords;
                }
                let destCoords = dest;
                if (!dest.includes(',')) {
                    const coords = await AmapService.getCoordinates(dest);
                    if (coords) destCoords = coords;
                }
                if (originCoords && destCoords) {
                    const routeData = await AmapService.getDrivingRoute(originCoords, destCoords);
                    contextData.route = {
                        origin: origin === USER_LOCATION ? 'Current Location' : origin,
                        destination: dest,
                        ...routeData
                    };
                }
            } catch(e) { console.error("Route planning failed", e); }
        }

        const currentDsl = serverState.dsl || null;
        
        // Import IntentTemplateService (dynamic or top-level)
        const { IntentTemplateService } = require('../ai/IntentTemplateService');

        // Generate Prompt using the Intent + Context Data
        const intentPrompt = IntentTemplateService.getIntentSpecificPrompt(recognizedIntent, lastUserMessage, contextData, currentDsl);

        // Call LLM with conversation history for multi-turn context
        const fullResponse = await LLMService.generateUI(intentPrompt, lastUserMessage, contextData, currentDsl, serverState.conversationHistory);
        const dslString = fullResponse;

        // Save conversation history
        serverState.conversationHistory.push({
            query: lastUserMessage,
            response: dslString,
            timestamp: Date.now()
        });

        // Keep only the last 10 turns
        const maxHistoryTurns = 10;
        if (serverState.conversationHistory.length > maxHistoryTurns) {
            serverState.conversationHistory = serverState.conversationHistory.slice(-maxHistoryTurns);
        }

        let dslObject: any;
        try {
            // Try to extract JSON if mixed with text
            const match = dslString.match(/```json([\s\S]*?)```/);
            const cleanDsl = match ? match[1] : dslString;
            dslObject = JSON.parse(cleanDsl);
        } catch (e: any) {
            return res.status(200).json({ sessionId, patch: [], note: 'Invalid JSON from LLM; ignored', raw: dslString });
        }

        const hadOld = Object.prototype.hasOwnProperty.call(serverState, 'dsl') && serverState.dsl != null;
        const patch = hadOld
            ? compare({ dsl: serverState.dsl }, { dsl: dslObject })
            : [{ op: 'add', path: '/dsl', value: dslObject } as any];

        serverState.dsl = dslObject;
        stateStore.set(sessionId, serverState);

        return res.status(200).json({ sessionId, patch, dataContext: serverState.dataContext || {} });
    } catch (e: any) {
        return res.status(500).json({ error: e?.message || 'Server error' });
    }
};
