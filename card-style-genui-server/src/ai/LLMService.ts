/**
 * LLMService.ts
 * 
 * Handles interactions with the Large Language Model.
 * Currently allows toggling between a Mock mode and a Real API mode.
 * Integrated with intent recognition for better UI generation.
 */

// Basic fetch polyfill/implementation for Node.js if needed (Node 18+ has native fetch)
// import fetch from 'node-fetch';
import { IntentRecognitionService, IntentResult, IntentType, ConversationTurn, Message } from './IntentRecognitionService';
import { IntentTemplateService } from './IntentTemplateService';
import { PromptBuilder } from './PromptBuilder';
// @ts-ignore
import { jsonrepair } from 'jsonrepair';
import { createParser } from 'eventsource-parser';

export class LLMService {
  // Qwen API Endpoint (configurable via env)
  static API_ENDPOINT = process.env.QWEN_API_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  // IMPORTANT: Do not commit real API keys; use env var only
  static API_KEY = process.env.QWEN_API_KEY || 'sk-7fa0884c562d4009b1a23bb5d52e965a';
  
  // Mock Flag
  static USE_MOCK = false;

  static async mockGenerate(prompt: string, userQuery?: string, dataContext?: any, currentDsl?: any): Promise<string> {
      return "{}";
  }

  /**
   * Generates UI DSL based on the prompt with intent recognition.
   * @param prompt The prompt for generating UI
   * @param userQuery The original user query
   * @param dataContext Context data for UI generation
   * @param currentDsl Current DSL state
   * @param conversationHistory Optional conversation history for multi-turn context
   * @returns Generated UI DSL as string
   */
  static async generateUI(
    prompt: string,
    userQuery?: string,
    dataContext?: any,
    currentDsl?: any,
    conversationHistory?: ConversationTurn[]
  ): Promise<string> {
    return this.callRealLLM(prompt, userQuery, dataContext, currentDsl, conversationHistory);
  }

  /**
   * Generates UI DSL with full message history support
   * @param prompt The prompt for generating UI
   * @param messages Full message history for multi-turn conversation
   * @param dataContext Context data for UI generation
   * @param currentDsl Current DSL state
   * @returns Generated UI DSL as string
   */
  static async generateUIWithMessages(
    prompt: string,
    messages: Message[],
    dataContext?: any,
    currentDsl?: any
  ): Promise<string> {
    return this.callRealLLMWithMessages(prompt, messages, dataContext, currentDsl);
  }

  private static async callRealLLM(
    prompt: string,
    userQuery?: string,
    dataContext?: any,
    currentDsl?: any,
    conversationHistory?: ConversationTurn[]
  ): Promise<string> {
    const startTime = Date.now();
    console.log(`[LLMService] Calling Qwen API... (Prompt Len: ${prompt.length})`);
    
    // 构建消息数组，支持多轮对话
    const messages: Message[] = [];
    
    // 添加系统消息
    messages.push({
      role: "system",
      content: "You are a helpful assistant. Please respond with valid JSON."
    });
    
    // 如果有对话历史，将其转换为消息格式并添加
    if (conversationHistory && conversationHistory.length > 0) {
      // 限制历史对话数量，最多保留5轮对话（10条消息）
      const maxTurns = 5;
      const recentHistory = conversationHistory.slice(-maxTurns);
      
      recentHistory.forEach(turn => {
        messages.push({
          role: "user",
          content: turn.query
        });
        messages.push({
          role: "assistant",
          content: turn.response
        });
      });
    }
    
    // 添加当前用户输入
    messages.push({
      role: "user",
      content: prompt
    });
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify({
          model: "qwen-flash",
          messages: messages,
          response_format: { type: "json_object" },
          enable_search: true
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`LLM API Error Body: ${errorText}`);
        throw new Error(`LLM API Error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const content = data.choices[0].message.content;
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`[LLMService] API Response Received (Content Len: ${content.length})`);
      console.log(`[LLMService] Total API call duration: ${duration}ms`);
      return content;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error('LLM Request Failed:', error);
      console.error(`[LLMService] Failed API call duration: ${duration}ms`);
      throw error;
    }
  }

  private static async callRealLLMWithMessages(
    prompt: string,
    messages: Message[],
    dataContext?: any,
    currentDsl?: any
  ): Promise<string> {
    const startTime = Date.now();
    console.log(`[LLMService] Calling Qwen API with messages... (Prompt Len: ${prompt.length})`);
    
    // 构建最终的消息数组
    const finalMessages: Message[] = [];
    
    // 添加系统消息
    finalMessages.push({
      role: "system",
      content: "You are a helpful assistant. Please respond with valid JSON."
    });
    
    // 添加历史消息（确保不超过最大数量）
    const maxMessages = 12; // 5轮对话 + 系统消息 + 当前消息
    const limitedMessages = messages.slice(-maxMessages);
    finalMessages.push(...limitedMessages);
    
    // 添加当前用户输入
    finalMessages.push({
      role: "user",
      content: prompt
    });
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify({
          model: "qwen-flash",
          messages: finalMessages,
          response_format: { type: "json_object" },
          enable_search: true
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`LLM API Error Body: ${errorText}`);
        throw new Error(`LLM API Error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const content = data.choices[0].message.content;
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`[LLMService] API Response Received (Content Len: ${content.length})`);
      console.log(`[LLMService] Total API call duration: ${duration}ms`);
      return content;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error('LLM Request Failed:', error);
      console.error(`[LLMService] Failed API call duration: ${duration}ms`);
      throw error;
    }
  }

  /**
   * Generates UI DSL in a streaming fashion.
   * Calls onProgress(dslObject) whenever a valid (repaired) JSON object is constructed.
   */
  static async streamUI(
    prompt: string,
    userQuery: string | undefined,
    dataContext: any,
    currentDsl: any,
    onProgress: (dsl: any, fullText: string) => void
  ): Promise<string> {
    if (this.USE_MOCK) {
        // Mock streaming: just return the full mock result after delay
        const mockRes = await this.mockGenerate(prompt, userQuery, dataContext, currentDsl);
        try {
            const mockObj = JSON.parse(mockRes);
            onProgress(mockObj, mockRes);
        } catch(e) {}
        return mockRes;
    }

    console.log(`[LLMService] Calling Qwen API (Streaming)...`);
    const llmStartTime = Date.now();
    console.log(`[Perf] [LLM Start] Request sent to Qwen at: ${new Date(llmStartTime).toISOString()}`);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 120s timeout for stream

      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
          // 'X-DashScope-SSE': 'enable' // Removing potentially conflicting header for compatible mode
        },
        body: JSON.stringify({
          model: "qwen-flash", 
          messages: [
            { role: "system", content: "You are a helpful assistant. Please respond with valid JSON." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          enable_search: true,
          stream: true
          // incremental_output: true // Removing specific param for compatible mode
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      console.log(`[LLMService] Response Status: ${response.status} ${response.statusText}`);
      console.log(`[LLMService] Content-Type: ${response.headers.get('content-type')}`);

      if (!response.ok) {
         throw new Error(`LLM API Error: ${response.statusText}`);
      }

      // Manual SSE parsing (eventsource-parser has issues with fragmented chunks)
      let fullContent = "";
      let sseBuffer = ""; // Buffer to handle SSE messages split across chunks

      // @ts-ignore
      if (response.body?.getReader) {
          // Web Stream (Standard)
          // @ts-ignore
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          console.log('[LLMService] Stream: Reader acquired.');
          let chunkCount = 0;
          let isFirstChunk = true;

          while (true) {
              const { done, value } = await reader.read();
              if (done) {
                  console.log(`[LLMService] Stream: Reader done. Total chunks: ${chunkCount}, fullContent length: ${fullContent.length}`);
                  break;
              }
              if (isFirstChunk) {
                  const firstChunkLatency = Date.now() - llmStartTime;
                  console.log(`[Perf] [LLM First Chunk] Received first chunk after ${firstChunkLatency}ms`);
                  isFirstChunk = false;
              }
              chunkCount++;
              
              // [DEBUG] Artificial delay
              await new Promise(r => setTimeout(r, 200));
              
              const text = decoder.decode(value, { stream: true });
              // console.log(`[LLMService] Stream Chunk #${chunkCount}: ${text.length} chars`);
              
              // Manual SSE parsing
              sseBuffer += text;
              const lines = sseBuffer.split('\n');
              sseBuffer = lines.pop() || ""; // Keep incomplete line in buffer
              
              for (const line of lines) {
                  if (line.startsWith('data: ')) {
                      const dataStr = line.slice(6); // Remove "data: " prefix
                      if (dataStr === '[DONE]') continue;
                      try {
                          const chunk = JSON.parse(dataStr);
                          const delta = chunk.choices?.[0]?.delta?.content || "";
                          if (delta) {
                              fullContent += delta;
                              try {
                                  // Strip markdown code blocks for cleaner parsing
                                  const cleanContent = fullContent.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
                                  const repaired = jsonrepair(cleanContent);
                                  const dslObj = JSON.parse(repaired);
                                  onProgress(dslObj, fullContent);
                              } catch (e) {
                                  // JSON not yet complete, continue accumulating
                              }
                          }
                      } catch (e) {
                          // Ignore parse errors for incomplete JSON
                      }
                  }
              }
          }
      } else {
          // Node Stream / Fallback
          console.log('[LLMService] Stream: Fallback to async iterator.');
          const decoder = new TextDecoder();
          // @ts-ignore
          for await (const chunk of response.body) {
              await new Promise(r => setTimeout(r, 200));
              const text = decoder.decode(chunk, { stream: true });
              
              // Manual SSE parsing (same as above)
              sseBuffer += text;
              const lines = sseBuffer.split('\n');
              sseBuffer = lines.pop() || "";
              
              for (const line of lines) {
                  if (line.startsWith('data: ')) {
                      const dataStr = line.slice(6);
                      if (dataStr === '[DONE]') continue;
                      try {
                          const chunkData = JSON.parse(dataStr);
                          const delta = chunkData.choices?.[0]?.delta?.content || "";
                          if (delta) {
                              fullContent += delta;
                              try {
                                  const cleanContent = fullContent.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
                                  const repaired = jsonrepair(cleanContent);
                                  const dslObj = JSON.parse(repaired);
                                  onProgress(dslObj, fullContent);
                              } catch (e) { }
                          }
                      } catch (e) { }
                  }
              }
          }
      }

      return fullContent;

    } catch (error) {
       console.error('[LLMService] Stream Request Failed:', error);
       throw error;
    }
  }
}
