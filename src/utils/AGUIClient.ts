
// src/utils/AGUIClient.ts
import EventSource from 'react-native-sse';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type AgentState = Record<string, any>;

type AGUIEvent =
  | { type: 'TEXT_MESSAGE_CONTENT'; delta: string }
  | { type: 'MESSAGE_START'; messageId: string }
  | { type: 'MESSAGE_END'; messageId: string }
  | { type: 'STATE_DELTA'; delta: any[] }
  | { type: 'TOOL_CALL_START'; name: string; args: any }
  | { type: 'TOOL_CALL_END'; name: string; result: any }
  | { type: 'REQUEST_HUMAN_INPUT'; prompt: string; options?: string[] }
  | { type: 'THREAD_START' | 'THREAD_END' }
  | { type: 'DONE' }
  | { type: 'RUN_FINISHED' }
  | { type: 'ERROR'; message: string };

type Listener = {
  onMessageDelta: (delta: string) => void;
  onStateUpdate: (newState: AgentState) => void;
  onToolStart: (name: string, args: any) => void;
  onToolEnd: (name: string, result: any) => void;
  onHumanInputRequest: (prompt: string, options?: string[]) => Promise<any>;
  onError: (error: string) => void;
  onDone: () => void;
};

export class AGUIClient {
  private es: EventSource | null = null;
  private currentState: AgentState = {};
  private listeners: Partial<Listener> = {};
  private sessionId: string | null = null;
  private messages: Message[] = []; 

  constructor(private endpoint: string) { }

  setListeners(listeners: Partial<Listener>) {
    this.listeners = listeners;
  }

  async sendMessage(userMessage: string, initialState: AgentState = {}) {
    this.currentState = { ...this.currentState, ...initialState };

    const stateToSend = { ...this.currentState };

    this.messages.push({ role: 'user', content: userMessage });

    this.es?.close();

    const requestBody = {
        messages: [...this.messages], 
        state: stateToSend,
        sessionId: this.sessionId,
    };
    
    console.log('[AGUIClient Request] URL:', this.endpoint);
    console.log('[AGUIClient Request] Body:', JSON.stringify(requestBody, null, 2));

    this.es = new EventSource(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(requestBody),
    });

    this.es.addEventListener('message', (event: any) => {
      console.log('[AGUIClient Stream] data:', event.data);
      if (event.data === '[DONE]') {
        this.listeners.onDone?.(); 
        this.es?.close();
        return;
      }
      try {
        const data: any = JSON.parse(event.data);
        this.handleEvent(data);
      } catch (e) {
      }
    });

    this.es.addEventListener('error', (_err: any) => {
      this.listeners.onError?.('Connection interrupted');
      this.es?.close();
    });
  }

  private handleEvent(event: AGUIEvent | { type: 'SESSION_INIT'; sessionId: string }) {
    switch (event.type) {
      case 'SESSION_INIT':
        this.sessionId = event.sessionId;
        break;
      case 'MESSAGE_START':
        this.messages.push({ role: 'assistant', content: '' });
        break;
      case 'TEXT_MESSAGE_CONTENT':
        this.listeners.onMessageDelta?.((event as any).delta);
        const lastMsg = this.messages[this.messages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content += (event as any).delta;
        }
        break;
      case 'STATE_DELTA':
        // Use Immutable Patcher to ensure React.memo works
        this.currentState = this.applyImmutablePatch(this.currentState, (event as any).delta);
        this.listeners.onStateUpdate?.(this.currentState);
        break;
      case 'TOOL_CALL_START':
        this.listeners.onToolStart?.((event as any).name, (event as any).args);
        break;
      case 'TOOL_CALL_END':
        this.listeners.onToolEnd?.((event as any).name, (event as any).result);
        break;
      case 'DONE':
      case 'RUN_FINISHED':
        this.listeners.onDone?.();
        this.close();
        break;
      case 'ERROR':
        this.listeners.onError?.((event as any).message || 'Unknown Error');
        this.close();
        break;
      default:
        break;
    }
  }

  close() {
    this.es?.close();
  }

  resetHistory() {
    this.messages = [];
  }

  /**
   * Applies RFC 6902 patches immutably (Copy-on-Write).
   * This ensures that unchanged subtrees maintain referential equality,
   * which is crucial for React.memo optimizations.
   */
  private applyImmutablePatch(state: any, ops: Array<{ op: string; path: string; value?: any }>): any {
    let nextState = state; 

    for (const op of ops) {
      if (!op.path || !op.path.startsWith('/')) continue;
      
      const pathParts = op.path
        .split('/')
        .slice(1)
        .map((k) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
        
      nextState = this.applyOperationImmutable(nextState, pathParts, op);
    }
    return nextState;
  }

  private applyOperationImmutable(root: any, path: string[], op: { op: string; value?: any }): any {
    if (path.length === 0) {
      // Replacing root
      if (op.op === 'add' || op.op === 'replace') return op.value;
      return root;
    }

    const [head, ...tail] = path;
    
    // Copy current level
    let nextRoot: any;
    if (Array.isArray(root)) {
        nextRoot = [...root];
        // Handle array index
        const index = parseInt(head, 10);
        if (tail.length === 0) {
             // Leaf operation on array
             if (op.op === 'add') {
                 // splice insert
                 if (head === '-') nextRoot.push(op.value);
                 else nextRoot.splice(index, 0, op.value);
             } else if (op.op === 'replace') {
                 nextRoot[index] = op.value;
             } else if (op.op === 'remove') {
                 nextRoot.splice(index, 1);
             }
        } else {
            // Recurse
            nextRoot[index] = this.applyOperationImmutable(root[index], tail, op);
        }
    } else {
        // Object
        nextRoot = { ...root };
        if (tail.length === 0) {
            // Leaf operation on object
            if (op.op === 'add' || op.op === 'replace') {
                nextRoot[head] = op.value;
            } else if (op.op === 'remove') {
                delete nextRoot[head];
            }
        } else {
            // Recurse
            nextRoot[head] = this.applyOperationImmutable(root[head] || {}, tail, op);
        }
    }

    return nextRoot;
  }
}
