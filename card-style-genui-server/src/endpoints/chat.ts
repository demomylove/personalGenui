import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { compare } from 'fast-json-patch';
import { PromptBuilder } from '../ai/PromptBuilder';
import { LLMService } from '../ai/LLMService';
import { AmapService } from '../services/AmapService';

// In-memory session store (MVP)
// In a real app, use Redis or a database.
const stateStore = new Map<string, any>();

/**
 * Handles the /api/chat endpoint following AG-UI protocol structure.
 * Streams SSE events: TEXT_MESSAGE_CONTENT, STATE_DELTA, DONE.
 */
export const chatHandler = async (req: Request, res: Response) => {
  const { messages, state, sessionId: reqSessionId } = req.body;
  
  // 1. Session Management
  const sessionId = reqSessionId || uuidv4();
  // Initialize state if new session, or retrieve existing
  // For robustness, we might merge client-provided state if session is missing?
  // But for this "Server Source of Truth" pattern, we rely on server state.
  let serverState = stateStore.get(sessionId) || {};
  
  // If client provided dataContext in state, update our server record
  if (state?.dataContext) {
      serverState.dataContext = state.dataContext;
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type: string, data: any) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    // Send session ID so client can store it
    if (!reqSessionId) {
       // We can send a custom event or metadata, or just ensure client gets it via some mechanism.
       // AG-UI doesn't strictly define "SESSION_START", but usually the first response implies it.
       // We'll trust the client to handle the IDs if we were strict, but here let's just 
       // let the client know. Actually, sending it in a specific event might be needed if not standard.
       // For now, let's assume client handles the ID from the response if we send it in a custom event or headers?
       // SSE headers are already sent. We can send a custom event "SESSION_INIT".
       sendEvent('SESSION_INIT', { sessionId });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    
    // 2. Lifecycle & Initial Thought
    if (!serverState.dsl) {
         sendEvent('THREAD_START', { threadId: sessionId });
    }
    
    const messageId = uuidv4();
    sendEvent('TEXT_MESSAGE_CONTENT', { delta: "Thinking..." });

    // 2.5 RAG / Context Enrichment (Video Demo Optimization)
    // If user asks about 'coffee', 'nearby', etc., fetch POI data
    const lowerMsg = lastUserMessage.toLowerCase();
    let additionalInstruction = "";
    let forceImmediatePoiRender = false;
    
    // POI Logic
    if (lowerMsg.includes('咖啡') || lowerMsg.includes('coffee') || lowerMsg.includes('cafe') || lowerMsg.includes('附近')) {
        console.log("Detected POI intent, fetching data...");
        sendEvent('TEXT_MESSAGE_CONTENT', { delta: "\n(Searching nearby POIs...)" });
        
        try {
            let keyword = '咖啡';
            if (lowerMsg.includes('咖啡')) keyword = '咖啡';

            const pois = await AmapService.searchPoi(keyword);
            if (pois.length > 0) {
                 if (!serverState.dataContext) serverState.dataContext = {};
                 serverState.dataContext.pois = pois;
                 console.log(`Injecting ${pois.length} POIs into context.`);
                 
                 // FORCE INSTRUCTION: Do not ask for confirmation
                 additionalInstruction = "\nIMPORTANT: POI data is provided in the Data Context. You MUST render the 'PoiList' component immediately. Do NOT ask 'Do you want to search?'. Do NOT return request_human_input. Just render the card.";
                 // Deterministic fallback: if LLM ignores instruction, we still render directly
                 forceImmediatePoiRender = true;
            }
        } catch (err) {
            console.error("POI Search failed", err);
        }
    }

    // Weather Data Injection
    if (lowerMsg.includes('天气') || lowerMsg.includes('weather')) {
        console.log("Detected Weather intent, injecting mock data...");
        sendEvent('TEXT_MESSAGE_CONTENT', { delta: "\n(Fetching weather data...)" });
        
        if (!serverState.dataContext) serverState.dataContext = {};
        
        // Mock Weather Data
        // We provide both flat fields (for simple templates) and nested objects (for complex bindings)
        const mockWeather = {
            city: "上海",
            date: { year: 2025, month: 12, day: 20, weekday: "周六" },
            high: "12",
            low: "5",
            cond: "多云",
            extra: "AQI 55 良",
            // Nested structure matching the user's screenshot: ${weather.location.name}
            weather: {
                location: { name: "上海" },
                current: { 
                    tempC: "12", 
                    text: "多云", 
                    humidity: "55", 
                    windDir: "东北风", 
                    windPower: "3" 
                },
                reportTime: "2025-12-19 16:00"
            }
        };
        
        Object.assign(serverState.dataContext, mockWeather);
    }
    
    // 3. Construct Prompt
    const dataContext = serverState.dataContext || {}; 
    const currentDsl = serverState.dsl || null;
    let prompt = PromptBuilder.constructPrompt(lastUserMessage, dataContext, currentDsl);
    
    // Append force instruction if any
    if (additionalInstruction) {
        prompt += additionalInstruction;
    }
    
    // 4. Call LLM (Streaming - Simplified to await for now as LLMService doesn't support stream yet)
    let fullResponse = await LLMService.generateUI(prompt);
    
    // Simulate streaming if needed for client UX, or just process it.
    // In future, update LLMService to return ReadableStream.
    
    console.log("LLM Response:", fullResponse);

    // 5. Parse LLM Response & Compute State Delta
    // The LLM might return Markdown JSON ```json ... ```
    let dslString = fullResponse;
    const match = fullResponse.match(/```json([\s\S]*?)```/);
    if (match) {
        dslString = match[1];
    }
    
    let dslObject: any;
    try {
        dslObject = JSON.parse(dslString);
    } catch (e) {
        console.error("Failed to parse LLM JSON:", e);
        // Fallback: treat as plain text message?
        // Or if POI forced render didn't happen via LLM, we force it here?
        sendEvent('TEXT_MESSAGE_CONTENT', { delta: "\n(Received invalid format from LLM, using fallback logic if applicable...)" });
    }

    // Force POI fallback if LLM failed to produce valid JSON or ignored instruction
    if (forceImmediatePoiRender) {
        // Check if dslObject is valid and has poi list?
        // If not, overwrite with our deterministic template
        // Actually, we can just merge or ensure the card is there.
        // For simplicity, if we have POIs and LLM failed, we rely on client or we construct a simple DSL here?
        // Let's assume LLMService usually works. If not, we could manually construct the DSL.
        if (!dslObject || !dslObject.card) {
             console.log("LLM failed to render POI card, using manual fallback.");
             dslObject = {
                 card: {
                     type: "column",
                     children: [
                         { type: "text", text: "Found nearby places:" },
                         { type: "poi_list", pois: "${pois}" } // Template binding
                     ]
                 }
             };
        }
    }

    if (dslObject) {
         // Create JSON Patch
         // Compare new dslObject with serverState.dsl
         const hadOld = Object.prototype.hasOwnProperty.call(serverState, 'dsl') && serverState.dsl != null;
         const patch = hadOld 
            ? compare({ dsl: serverState.dsl }, { dsl: dslObject })
            : [{ op: 'add', path: '/dsl', value: dslObject } as any];
         
         // In strict JSON Patch, we don't just replace root usually? 
         // But here we diff the wrapper object `{ dsl: ... }` to get path `/dsl/...`
         
         // Update Server State
         serverState.dsl = dslObject;
         stateStore.set(sessionId, serverState);
         
         // Send Delta
         if (patch.length > 0) {
             sendEvent('STATE_DELTA', { delta: patch });
         }
    } else {
        // If no JSON, maybe it was just a text reply (if we allowed it).
        // Since we enforced JSON, this is an error case or simple chat.
        sendEvent('TEXT_MESSAGE_CONTENT', { delta: "\n" + fullResponse });
    }

    sendEvent('DONE', {});
    res.end();

  } catch (error: any) {
    console.error("Error in chatHandler:", error);
    sendEvent('ERROR', { message: error.message });
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
        
        // Mock Weather Data
        const mockWeather = {
            city: "上海",
            date: { year: 2025, month: 12, day: 20, weekday: "周六" },
            high: "12",
            low: "5",
            cond: "多云",
            extra: "AQI 55 良",
            weather: {
                location: { name: "上海" },
                current: { 
                    tempC: "12", 
                    text: "多云", 
                    humidity: "55", 
                    windDir: "东北风", 
                    windPower: "3" 
                },
                reportTime: "2025-12-19 16:00"
            }
        };
        Object.assign(serverState.dataContext, mockWeather);
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
