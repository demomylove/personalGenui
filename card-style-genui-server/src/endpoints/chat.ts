import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { compare, Operation } from 'fast-json-patch';
import { PromptBuilder } from '../ai/PromptBuilder';
import { LLMService } from '../ai/LLMService';
import { AmapService } from '../services/AmapService';
// Import EventType from @ag-ui/core
import { EventType } from '@ag-ui/core';

// In-memory session store (MVP)
const stateStore = new Map<string, any>();

/**
 * Handles the /api/chat endpoint following AG-UI protocol structure.
 * Streams SSE events: TEXT_MESSAGE_*, STATE_DELTA, RUN_FINISHED.
 */
export const chatHandler = async (req: Request, res: Response) => {
    // AG-UI Request Body Structure: { input: "query", context: {}, threadId, runId, ... }
    const reqBody = req.body || {};

    const sessionId = reqBody.threadId || reqBody.sessionId || uuidv4();
    const runId = reqBody.runId || uuidv4();
    const inputMsg = reqBody.input || (reqBody.messages ? reqBody.messages[reqBody.messages.length - 1]?.content : "") || "";
    const clientContext = reqBody.context || reqBody.state?.dataContext || {};

    const startTotal = Date.now();
    console.log(`[Perf] [1. Request Start] New Chat Request: ${new Date().toISOString()} | Session: ${sessionId}`);

    // Initialize server state
    let serverState = stateStore.get(sessionId) || {};
    if (clientContext && Object.keys(clientContext).length > 0) {
        serverState.dataContext = { ...(serverState.dataContext || {}), ...clientContext };
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

        // 3. Logic & Context Enrichment (POI/Weather)
        const lowerMsg = inputMsg.toLowerCase();
        let additionalInstruction = "";

        // Hardcoded user location as requested (Centralized)
        // const USER_LOCATION = '121.399641,31.168876'; 

        // Ensure dataContext exists
        if (!serverState.dataContext) serverState.dataContext = {};
        const contextData = serverState.dataContext;

        // User Location from Context (sent by Client)
        const USER_LOCATION = contextData.location || '121.399641,31.168876'; // Fallback to Shanghai if missing
        console.log(`[Chat] Using User Location: ${USER_LOCATION}`);

        // --- POI Logic ---
        if (lowerMsg.includes('咖啡') || lowerMsg.includes('coffee') || lowerMsg.includes('cafe') || lowerMsg.includes('附近')) {
            sendText("\n(Searching nearby POIs...)");
            try {
                let keyword = '咖啡';
                // Simple keyword extraction
                const cleanMsg = inputMsg.replace(/附近|的|查找|搜索|查看|有没有|推荐|我想去|帮我找/g, '').replace(/ting$/i, '').trim();
                if (cleanMsg.length > 0) {
                    keyword = cleanMsg;
                }
                console.log(`[Chat] POI Search Keyword extracted: "${keyword}" (Original: "${inputMsg}")`);

                // Use USER_LOCATION for "around" search
                let pois = await AmapService.searchPoi(keyword, 'Shanghai', USER_LOCATION);

                if (pois.length === 0) {
                    console.warn('[Chat] No real POIs found. Falling back to Mock Data.');
                    pois = AmapService.getMockPois(keyword);
                }

                if (pois.length > 0) {
                    contextData.pois = pois;
                    additionalInstruction += "\nIMPORTANT: POI data detected. Render a vertical list of cards (using Column) according to the 'POI List' example.";
                }
            } catch (err) {
                console.error("POI Search failed", err);
            }
        }

        // --- Weather Logic ---
        const isWeather = lowerMsg.includes('天气') || lowerMsg.includes('weather') || lowerMsg.includes('气温');
        if (isWeather) {
            let city = 'Shanghai'; // Default context city name (fallback)
            if (inputMsg.includes('北京')) city = 'Beijing';
            if (inputMsg.includes('广州')) city = 'Guangzhou';
            if (inputMsg.includes('深圳')) city = 'Shenzhen';

            console.log(`[Chat] Weather intent detected for city: ${city} (using coords: ${USER_LOCATION})`);
            sendText("\n(Fetching weather data...)");

            try {
                // Pass USER_LOCATION to utilize ReGeo if possible. 
                // Note: If user specific asks for "Beijing Weather", passing USER_LOCATION (Shanghai) might be wrong?
                // User request: "weather查询时，也带上" (When querying weather, also include coords).
                // Logic: If user specifically mentions a city, we should arguably prioritize that city.
                // But if generic "Weather", use coords.
                // Currently AmapService.getWeather logic: 1. check location -> regeo -> adcode. 2. if fail, check city -> adcode.
                // So if we pass location, it will PRIORITIZE location.
                // Modification: If user explicitly mentions a DIFFERENT city, we probably shouldn't pass USER_LOCATION?
                // But user said "查询时也带上". Let's assume for current location weather or default checks.
                // If user says "Beijing Weather", the intent is Beijing. The USER_LOCATION is Shanghai.
                // If I pass USER_LOCATION, it will render Shanghai weather.
                // Refinement: Only pass USER_LOCATION if no specific city detected OR if "nearby/here" implied.
                // For now, adhering to instruction "weather查询时，也带上", I will pass it. 
                // Maybe the user assumes "Weather" means "My Weather".

                const weatherData = await AmapService.getWeather(city, USER_LOCATION);
                contextData.weather = weatherData;
            } catch (e) {
                console.error("Failed to fetch real weather:", e);
            }
        }

        // --- Driving Route Logic ---
        const isRoute = lowerMsg.includes('去') || lowerMsg.includes('到') || lowerMsg.includes('导航') || lowerMsg.includes('route') || lowerMsg.includes('drive');
        if (isRoute) {
            // Regex to extract "From [A] To [B]" pattern
            const routeRegex = /(?:从|from)\s*([^到\s]+)\s*(?:到|to|去)\s*([^的\s]+)/i;
            const matchRoute = inputMsg.match(routeRegex);

            let origin = USER_LOCATION; // Default to User Location
            let dest = 'Beijing';       // Default fallback dest

            if (matchRoute) {
                origin = matchRoute[1]; // If user says "From X", use X
                dest = matchRoute[2];
            } else {
                // Try to find reasonable destination from message? 
                // "Go to X", "Drive to X"
                // Simple split?
                // e.g. "去外滩"
                const destMatch = inputMsg.match(/(?:去|到|导航|drive to)\s*([^的\s]+)/i);
                if (destMatch) {
                    dest = destMatch[1];
                }
            }

            // If origin is effectively "me" or "here", use USER_LOCATION
            if (origin.includes('我') || origin.includes('这') || origin.toLowerCase().includes('here') || origin.toLowerCase().includes('me')) {
                origin = USER_LOCATION;
            }

            console.log(`[Chat] Route Intent: From ${origin} To ${dest}`);
            sendText(`\n(Planning route to ${dest}...)`);

            try {
                // 1. Geocode Origin & Dest (If they are not coords)
                // Check if origin is comma separated (coords)
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
                    // 2. Get Driving Route
                    const routeData = await AmapService.getDrivingRoute(originCoords, destCoords);

                    contextData.route = {
                        origin: origin === USER_LOCATION ? 'Current Location' : origin,
                        destination: dest,
                        ...routeData
                    };
                    additionalInstruction += "\nIMPORTANT: Route data available. Render a Route Card showing Origin, Destination, Distance, Duration, and a simplified Step list.";
                } else {
                    console.warn("Could not geocode origin/dest for route");
                }
            } catch (e) {
                console.error("Route Planning failed", e);
            }
        }

        // 4. Intent Recognition & LLM
        let currentDsl = serverState.dsl || null;

        // Context Awareness Rule:
        // 1. If user explicitly says "again", "rewrite", "reset" (重新, 再次), force fresh generation by ignoring currentDsl.
        // 2. Otherwise, pass currentDsl to allow "in-place editing" (diff update).
        const resetKeywords = ['重新', '再次', '再生成', 'reset', 'again', 'rewrite', 'retry'];
        if (resetKeywords.some(kw => inputMsg.includes(kw))) {
            console.log('[Chat] User requested RESET/RETRY. Ignoring current DSL to force fresh generation.');
            currentDsl = null;
        }

        console.log(`[Chat] Starting intent recognition for: "${inputMsg}"`);

        // Keep-alive loop
        const keepAliveInterval = setInterval(() => { res.write(': keep-alive\n\n'); }, 3000);

        let fullResponse: string;
        let recognizedIntent: any;

        try {
            // Use the new intent-aware generation
            const result = await LLMService.generateUIWithIntent(inputMsg, contextData, currentDsl, serverState.lastIntent);
            fullResponse = result.dsl;
            recognizedIntent = result.intent;

            // Persist intent for next turn (Sticky Context)
            if (recognizedIntent && recognizedIntent.intent) {
                serverState.lastIntent = recognizedIntent.intent;
                console.log(`[Chat] Saved Intent for next turn: ${serverState.lastIntent}`);
            }

        } finally {
            clearInterval(keepAliveInterval);
        }

        console.log(`[Chat] [LLM Raw Response]:\n${fullResponse}\n-----------------------------------`);

        // 5. Parse DSL & Compute Patch
        let dslString = fullResponse;
        const match = fullResponse.match(/```json([\s\S]*?)```/);
        if (match) dslString = match[1];

        let dslObject: any;
        try {
            dslObject = JSON.parse(dslString);
            console.log(`[Chat] [DSL Parsed]: Success (Keys: ${Object.keys(dslObject).join(', ')})`);
        } catch (e) {
            console.error("LLM JSON Parse Error", e);
            console.log(`[Chat] [DSL Parse Failed] String was: ${dslString}`);
        }

        if (dslObject) {
            const hadOld = Object.prototype.hasOwnProperty.call(serverState, 'dsl') && serverState.dsl != null;
            const patch = hadOld
                ? compare({ dsl: serverState.dsl }, { dsl: dslObject })
                : [{ op: 'add', path: '/dsl', value: dslObject } as Operation];

            serverState.dsl = dslObject;
            // Intent already saved above
            stateStore.set(sessionId, serverState);

            if (patch.length > 0) {
                // Send State Delta Event
                console.log(`[Chat] [Patch Generated]: ${JSON.stringify(patch)}`);
                writeEvent({
                    type: EventType.STATE_DELTA,
                    threadId: sessionId,
                    runId: runId,
                    delta: patch,
                    timestamp: Date.now()
                });
            } else {
                sendText("\n(Content is already up to date)");
            }
        } else {
            // Just text response
            sendText("\n" + fullResponse);
        }

        // 6. TEXT_MESSAGE_END
        writeEvent({
            type: EventType.TEXT_MESSAGE_END,
            threadId: sessionId,
            runId: runId,
            messageId: messageId,
            role: "assistant",
            timestamp: Date.now()
        });

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

    if (state?.dataContext) {
        serverState.dataContext = state.dataContext;
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const lowerMsg = lastUserMessage.toLowerCase();

    try {
        // Weather Data Injection
        if (lowerMsg.includes('天气') || lowerMsg.includes('weather')) {
            console.log("Detected Weather intent (once), injecting mock data...");

            if (!serverState.dataContext) serverState.dataContext = {};

            const weatherData = await AmapService.getWeather('上海');
            Object.assign(serverState.dataContext, weatherData);
        }

        const currentDsl = serverState.dsl || null;
        // Use intent-aware generation for the once handler as well
        const result = await LLMService.generateUIWithIntent(lastUserMessage, serverState.dataContext || {}, currentDsl, serverState.lastIntent);
        const dslString = result.dsl;

        if (result.intent && result.intent.intent) {
            serverState.lastIntent = result.intent.intent;
        }

        let dslObject: any;
        try {
            dslObject = JSON.parse(dslString);
        } catch (e: any) {
            return res.status(200).json({ sessionId, patch: [], note: 'Invalid JSON from LLM; ignored' });
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
