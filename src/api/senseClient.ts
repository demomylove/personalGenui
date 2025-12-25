// axios is no longer needed - using @ag-ui/client
import { HttpAgent } from '@ag-ui/client';

const BASE_URL_LEGACY = 'http://10.210.0.58:21683';
const OMPHALOS_URL = `${BASE_URL_LEGACY}/intention_v2/omphalos`; 

type EnvType = 'DEV' | 'PROD' | 'LEGACY';
// Fix: Use type assertion or just string to avoid literal comparison error if TS is strict about 'DEV' vs EnvType
const CURRENT_ENV: EnvType = 'DEV'; 

const HOST_DEV = "https://innovation-dev.senseauto.com:31684";
const HOST_PROD = "https://innovation.senseauto.com:80";
const HOST_LEGACY = BASE_URL_LEGACY;

const getHost = () => {
    // Fix: Simple return based on var, avoiding switch case literal errors
    if (CURRENT_ENV === 'PROD') return HOST_PROD;
    if (CURRENT_ENV === 'LEGACY') return HOST_LEGACY;
    return HOST_DEV;
};
const HOST = getHost();

export const CHAT_URL = `${HOST}/novel/agent/chat/v1`;

const getQueryParams = (input: string) => ({
  user_query: input,
  user_info: {
    faceid: '',
    nickname: '',
    gps_info: '121.40030914855207,31.16835650149113',
    human_info: [],
    face_info: [],
  },
  memory_info: [],
  context_info: [],
});

export const getDsl = (domain: string, content: any): string => {
   return ''; 
};

// AG-UI Agent Instance
let agentInstance: HttpAgent | null = null;

const createAgent = () => {
    return new HttpAgent({
        url: CHAT_URL,
        headers: {
            'Content-Type': 'application/json',
        },
        agentId: 'weather-agent',
        debug: true,
    });
};

export const weather = async (input: string): Promise<string> => {
    console.log('[AG-UI] Starting Weather Request:', input);
    
    if (!agentInstance) agentInstance = createAgent();
    // Use any to bypass strict type check on getQueryParams structure vs ContextItem
    const context: any = getQueryParams(input);

    try {
        const result = await agentInstance.runAgent({
            context: { ...context, input }, 
        });

        // Fix: Cast result to any to access state if types are missing/mismatched in 0.0.42
        const resAny = result as any;
        if (resAny.state && resAny.state.dsl) {
            console.log('[AG-UI] Final DSL from State:', JSON.stringify(resAny.state.dsl));
            return JSON.stringify(resAny.state.dsl);
        }
        
    } catch (err) {
        console.error('[AG-UI] Error:', err);
    }
    
    return ""; 
};

export const chatWithAgent = async (input: string, onPartial?: (text: string) => void): Promise<string> => {
    if (!agentInstance) agentInstance = createAgent();
    let accumulatedText = "";

    try {
         // Fix: subscribe returns an subscription object with unsubscribe method, NOT a function directly
         const subscription = agentInstance.subscribe({
             // Fix: Payload structure is { event: { ... } }
             onTextMessageContentEvent: (payload: any) => {
                 const delta = payload.event?.delta || "";
                 accumulatedText += delta;
                 if (onPartial) onPartial(accumulatedText);
             }
         });

         const result = await agentInstance.runAgent({
            context: { input: input } as any
         });
         
         // Fix: Correct unsubscribe usage
         if (subscription && typeof subscription.unsubscribe === 'function') {
             subscription.unsubscribe();
         }

         const resAny = result as any;
         if (resAny.state && resAny.state.dsl) {
             return JSON.stringify(resAny.state.dsl);
         }
         return accumulatedText; 
    } catch (e) {
        console.error("Chat with Agent failed", e);
        return "";
    }
}

// ... legacy exports ...
export const omphalos = async (input: string) => { return []; } 
export const music = async (input: string) => { return ""; }
export const poi = async (input: string) => { return ""; }


