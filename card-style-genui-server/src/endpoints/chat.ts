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
  // OR the legacy structure { messages, state, sessionId }
  // We adapt both.
  const reqBody = req.body || {};
  
  // Adapt legacy inputs to AG-UI concepts
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
  - Context Keys: ${Object.keys(clientContext).join(', ')}
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
    let forceImmediatePoiRender = false;

    // POI Logic
    if (lowerMsg.includes('咖啡') || lowerMsg.includes('coffee') || lowerMsg.includes('cafe') || lowerMsg.includes('附近')) {
        sendText("\n(Searching nearby POIs...)");
        try {
            let keyword = '咖啡';
            // Simple keyword extraction: remove "nearby" and other common words
            const cleanMsg = inputMsg.replace(/附近|的|查找|搜索|查看|有没有|推荐|我想去|帮我找/g, '').trim();
            if (cleanMsg.length > 0) {
                keyword = cleanMsg; 
            }
            console.log(`[Chat] POI Search Keyword extracted: "${keyword}" (Original: "${inputMsg}")`);
            
            const pois = await AmapService.searchPoi(keyword);
            if (pois.length > 0) {
                 if (!serverState.dataContext) serverState.dataContext = {};
                 serverState.dataContext.pois = pois;
                 additionalInstruction = "\nIMPORTANT: POI data detected. Render a vertical list of cards (using Column) according to the 'POI List' example.";
                 // forceImmediatePoiRender = true; // Use LLM for rendering
            }
        } catch (err) {
            console.error("POI Search failed", err);
        }
    }

    // Weather Logic
    if (lowerMsg.includes('天气') || lowerMsg.includes('weather')) {
        sendText("\n(Fetching weather data...)");
        if (!serverState.dataContext) serverState.dataContext = {};
        try {
            const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆'];
            let city = '上海';
            for (const c of cities) if (inputMsg.includes(c)) { city = c; break; }
            
            const weatherData = await AmapService.getWeather(city);
            Object.assign(serverState.dataContext, weatherData);
        } catch (e) {
            console.error("Failed to fetch real weather:", e);
        }
    }

    // Route Planning Logic
     // Regex to extract "From [A] To [B]" pattern, supporting Chinese "从...到..." or "去了..."
    const routeRegex = /(?:从|from)\s*([^到\s]+)\s*(?:到|to|去)\s*([^的\s]+)/i; 
    const matchRoute = inputMsg.match(routeRegex);

    if (matchRoute || lowerMsg.includes('路线') || lowerMsg.includes('行程') || lowerMsg.includes('route')) {
         let origin = '上海'; // Default
         let dest = '北京';   // Default

         if (matchRoute) {
             origin = matchRoute[1];
             dest = matchRoute[2];
         }

         sendText(`\n(Planning route from ${origin} to ${dest}...)`);
         try {
             // 1. Geocode Origin & Dest
             const originCoords = await AmapService.getCoordinates(origin);
             const destCoords = await AmapService.getCoordinates(dest);

             if (originCoords && destCoords) {
                 // 2. Get Driving Route
                 const routeData = await AmapService.getDrivingRoute(originCoords, destCoords);
                 if (!serverState.dataContext) serverState.dataContext = {};
                 
                 serverState.dataContext.route = {
                     origin: origin,
                     destination: dest,
                     ...routeData
                 };
                 additionalInstruction += "\nIMPORTANT: Route data available. Render a Route Card showing Origin, Destination, Distance, Duration, and a simplified Step list.";
             } else {
                 sendText("\n(Could not find coordinates for locations)");
             }
         } catch(e) {
             console.error("Route Planning failed", e);
         }
    }

    // 4. Prompt & LLM
    const dataContext = serverState.dataContext || {}; 
    const currentDsl = serverState.dsl || null;
    let prompt = PromptBuilder.constructPrompt(inputMsg, dataContext, currentDsl);
    if (additionalInstruction) prompt += additionalInstruction;

    console.log(`[Chat] [Prompt Constructed]:\n${prompt}\n-----------------------------------`);

    // Keep-alive loop
    const keepAliveInterval = setInterval(() => { res.write(': keep-alive\n\n'); }, 3000);
    
    let fullResponse;
    try {
        fullResponse = await LLMService.generateUI(prompt);
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

    // Fallback logic for POI - REMOVED, relying on LLM to follow PromptBuilder example
    /*
    if (forceImmediatePoiRender && (!dslObject || !dslObject.card)) {
         // ...
    }
    */

    if (dslObject) {
         const hadOld = Object.prototype.hasOwnProperty.call(serverState, 'dsl') && serverState.dsl != null;
         const patch = hadOld 
            ? compare({ dsl: serverState.dsl }, { dsl: dslObject })
            : [{ op: 'add', path: '/dsl', value: dslObject } as Operation];
         
         serverState.dsl = dslObject;
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
    const prompt = PromptBuilder.constructPrompt(lastUserMessage, serverState.dataContext || {}, currentDsl);
    const dslString = await LLMService.generateUI(prompt);

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
