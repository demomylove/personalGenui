/**
 * LLMService.ts
 * 
 * Handles interactions with the Large Language Model.
 * Currently allows toggling between a Mock mode and a Real API mode.
 * Integrated with intent recognition for better UI generation.
 */

// Basic fetch polyfill/implementation for Node.js if needed (Node 18+ has native fetch)
// import fetch from 'node-fetch'; 
import { IntentRecognitionService, IntentResult } from './IntentRecognitionService';
import { IntentTemplateService } from './IntentTemplateService';
import { PromptBuilder } from './PromptBuilder';

export class LLMService {
    // Toggle mock via env; default to REAL API (false) per deployment requirement
    static USE_MOCK = process.env.LLM_USE_MOCK === 'true';

    // Qwen API Endpoint (configurable via env)
    static API_ENDPOINT = process.env.QWEN_API_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'; 
  // IMPORTANT: Do not commit real API keys; use env var only
  static API_KEY = process.env.QWEN_API_KEY || 'sk-7fa0884c562d4009b1a23bb5d52e965a';
  
    /**
     * Generates UI DSL based on the prompt with intent recognition.
     */
    static async generateUI(prompt: string, userQuery?: string, dataContext?: any, currentDsl?: any): Promise<string> {
      if (this.USE_MOCK) {
        return this.mockGenerate(prompt, userQuery, dataContext, currentDsl);
      } else {
        return this.callRealLLM(prompt, userQuery, dataContext, currentDsl);
      }
    }

    /**
     * Generates UI DSL with intent recognition integration.
     */
    static async generateUIWithIntent(userQuery: string, dataContext: any, currentDsl?: any): Promise<string> {
      try {
        // Step 1: Recognize intent
        let intentResult: IntentResult;
        try {
          intentResult = await IntentRecognitionService.recognizeIntent(userQuery);
          console.log(`[LLMService] Intent recognized: ${intentResult.intent} (confidence: ${intentResult.confidence})`);
        } catch (error) {
          console.warn('[LLMService] Intent recognition failed, using quick recognition:', error);
          intentResult = IntentRecognitionService.quickIntentRecognition(userQuery);
        }

        // Step 2: Generate prompt based on intent
        const intentPrompt = IntentTemplateService.getIntentSpecificPrompt(intentResult, userQuery, dataContext, currentDsl);
        
        // Step 3: Generate UI using intent-specific prompt
        return this.generateUI(intentPrompt, userQuery, dataContext, currentDsl);
      } catch (error) {
        console.error('[LLMService] Intent-based generation failed, falling back to default:', error);
        const fallbackPrompt = PromptBuilder.constructPrompt(userQuery, dataContext, currentDsl);
        return this.generateUI(fallbackPrompt, userQuery, dataContext, currentDsl);
      }
    }
  
    private static async mockGenerate(prompt: string, userQuery?: string, dataContext?: any, currentDsl?: any): Promise<string> {
      // Simulate network delay
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
  
      console.log('[LLM Mock] Received Prompt length:', prompt.length);

      // Use intent recognition for mock as well
      let intentResult: IntentResult;
      try {
        intentResult = IntentRecognitionService.quickIntentRecognition(userQuery || prompt);
        console.log(`[LLM Mock] Intent recognized: ${intentResult.intent}`);
      } catch (error) {
        intentResult = { intent: 'chat' as any, confidence: 0.5 };
      }

      // Generate mock response based on intent
      switch (intentResult.intent) {
        case 'weather':
          return this.generateWeatherMock(dataContext);
        case 'music':
          return this.generateMusicMock();
        case 'poi':
          return this.generatePoiMock(dataContext);
        case 'route_planning':
          return this.generateRouteMock(dataContext);
        case 'cartoon_image':
          return this.generateCartoonImageMock(userQuery);
        default:
          return this.generateDefaultMock();
      }
    }

    private static generateWeatherMock(dataContext?: any): string {
      const weatherData = dataContext?.weather || {
        temp: "15",
        city: "上海市",
        date: "2025-12-23",
        weekday: "周二",
        cond: "阴",
        feels_like: "15",
        humidity: "60%",
        wind: "西风≤3级"
      };

      const mockResponse = {
        component_type: "Center",
        properties: { background_color: "#FFFFFF" },
        children: [
          {
            component_type: "Card",
            properties: {
              background_color: "#FFCC80",
              padding: 24,
              shape_border_radius: 24,
              elevation: 8,
              width: 340
            },
            children: [
              {
                component_type: "Column",
                properties: { cross_axis_alignment: "center" },
                children: [
                  {
                    component_type: "Row",
                    properties: { main_axis_alignment: "center", spacing: 8 },
                    children: [
                      { component_type: "Text", properties: { text: weatherData.city, font_size: 24, font_weight: "bold", color: "#333333" } },
                      { component_type: "Text", properties: { text: `${weatherData.date} ${weatherData.weekday}`, font_size: 16, color: "#E65100" } }
                    ]
                  },
                  { component_type: "SizedBox", properties: { height: 24 } },
                  {
                    component_type: "Row",
                    properties: { main_axis_alignment: "center", cross_axis_alignment: "center", spacing: 16 },
                    children: [
                      { component_type: "Text", properties: { text: "☁️", font_size: 64 } },
                      { component_type: "Text", properties: { text: `${weatherData.temp}°C`, font_size: 72, font_weight: "bold", color: "#E65100" } }
                    ]
                  },
                  { component_type: "SizedBox", properties: { height: 8 } },
                  { component_type: "Text", properties: { text: `体感: ${weatherData.feels_like}°C`, font_size: 14, color: "#E65100" } },
                  { component_type: "SizedBox", properties: { height: 16 } },
                  { component_type: "Text", properties: { text: weatherData.cond, font_size: 20, font_weight: "bold", color: "#4E342E" } },
                  { component_type: "SizedBox", properties: { height: 12 } },
                  { component_type: "Text", properties: { text: `湿度: ${weatherData.humidity} 风向: ${weatherData.wind}`, font_size: 14, color: "#5D4037" } }
                ]
              }
            ]
          }
        ]
      };

      return JSON.stringify(mockResponse);
    }

    private static generateMusicMock(): string {
      const mockResponse = {
        component_type: "Center",
        properties: {},
        children: [
          {
            component_type: "SizedBox",
            properties: { width: 280 },
            children: [
              {
                component_type: "Card",
                properties: {
                  background_color: "#6200EA",
                  padding: 12,
                  shape_border_radius: 16,
                  elevation: 8,
                  margin: 0
                },
                children: [
                  {
                    component_type: "Column",
                    properties: { spacing: 8, cross_axis_alignment: "center" },
                    children: [
                       {
                         component_type: "Image",
                         properties: { 
                           source: "https://p1.music.126.net/s8rG2Jc8R9w0g7_l_G8jRg==/109951165792276536.jpg", 
                           width: "100%", 
                           height: 150, 
                           border_radius: 12 
                         }
                       },
                      {
                        component_type: "Text",
                        properties: { text: "七里香", font_size: 18, font_weight: "bold", color: "#FFFFFF" }
                      },
                      {
                        component_type: "Text",
                        properties: { text: "周杰伦", font_size: 14, color: "#DDDDDD" }
                      },
                      {
                        component_type: "Row",
                        properties: { spacing: 8, main_axis_alignment: "center" },
                        children: [
                           { component_type: "Text", properties: { text: "▶", font_size: 20, color: "#00E676" } },
                           { component_type: "Text", properties: { text: "❤️", font_size: 18, color: "#FF4081" } }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      return JSON.stringify(mockResponse);
    }

    private static generatePoiMock(dataContext?: any): string {
      const pois = dataContext?.pois || [
        { name: "Starbucks Reserve", address: "123 Main St", rating: "4.8", cost: "¥45", image: "http://img.com/1" }
      ];

      const poiCards = pois.map((poi: any) => ({
        component_type: "Card",
        properties: { background_color: "#E8F5E9", elevation: 4, border_radius: 24, padding: 20, width: 380 },
        children: [
          {
            component_type: "Row",
            properties: { spacing: 20, cross_axis_alignment: "center", width: "100%" },
            children: [
              { component_type: "Image", properties: { source: poi.image, width: 120, height: 120, border_radius: 16, content_fit: "cover" } },
              {
                component_type: "Column",
                properties: { flex: 1, spacing: 8 },
                children: [
                  { component_type: "Text", properties: { text: poi.name, font_size: 22, font_weight: "bold", color: "#1B5E20" } },
                  { component_type: "Text", properties: { text: `⭐ ${poi.rating} ${poi.cost}/人`, font_size: 18, color: "#388E3C" } },
                  { component_type: "Text", properties: { text: poi.address, font_size: 16, color: "#757575", max_lines: 1 } }
                ]
              }
            ]
          }
        ]
      }));

      const mockResponse = {
        component_type: "Center",
        properties: { background_color: "#FFFFFF" },
        children: [
          {
            component_type: "Column",
            properties: { spacing: 16, padding: 20 },
            children: [
               { component_type: "Text", properties: { text: "附近的精选好店", font_size: 28, font_weight: "bold", color: "#2E7D32" } },
               ...poiCards
            ]
          }
        ]
      };

      return JSON.stringify(mockResponse);
    }

    private static generateRouteMock(dataContext?: any): string {
      const routeData = dataContext?.route || {
        origin: "Shanghai",
        destination: "Beijing",
        distance: "1214.3km",
        duration: "14 hours",
        steps: ["Start from People's Square", "Enter G2 Highway"]
      };

      const mockResponse = {
        component_type: "Center",
        properties: { background_color: "#FFFFFF" },
        children: [
          {
            component_type: "Card",
            properties: { background_color: "#E3F2FD", padding: 20, shape_border_radius: 20, elevation: 4, width: 380 },
            children: [
              {
                component_type: "Column",
                properties: { spacing: 16 },
                children: [
                   { 
                     component_type: "Text", 
                     properties: { text: "🚗 Driving Route", font_size: 20, font_weight: "bold", color: "#1565C0" } 
                   },
                   {
                     component_type: "Row",
                     properties: { main_axis_alignment: "space_between", width: "100%" },
                     children: [
                        { component_type: "Text", properties: { text: routeData.origin, font_size: 18, font_weight: "bold", color: "#333" } },
                        { component_type: "Text", properties: { text: "➝", font_size: 18, color: "#999" } },
                        { component_type: "Text", properties: { text: routeData.destination, font_size: 18, font_weight: "bold", color: "#333" } }
                     ]
                   },
                   {
                     component_type: "Row",
                     properties: { spacing: 20 },
                     children: [
                        {
                          component_type: "Column",
                          properties: { spacing: 4 },
                          children: [
                             { component_type: "Text", properties: { text: "DISTANCE", font_size: 12, color: "#1976D2" } },
                             { component_type: "Text", properties: { text: routeData.distance, font_size: 24, font_weight: "bold", color: "#0D47A1" } }
                          ]
                        },
                        {
                          component_type: "Column",
                          properties: { spacing: 4 },
                          children: [
                             { component_type: "Text", properties: { text: "DURATION", font_size: 12, color: "#1976D2" } },
                             { component_type: "Text", properties: { text: routeData.duration, font_size: 24, font_weight: "bold", color: "#0D47A1" } }
                          ]
                        }
                     ]
                   },
                   { component_type: "Text", properties: { text: routeData.steps.map((step: string) => `• ${step}`).join('\\n'), font_size: 14, color: "#546E7A", max_lines: 10 } }
                ]
              }
            ]
          }
        ]
      };

      return JSON.stringify(mockResponse);
    }

    private static generateCartoonImageMock(userQuery?: string): string {
      const keyword = userQuery?.includes('小狗') ? 'puppy' : userQuery?.includes('猫') ? 'cat' : 'cartoon';
      
      const mockResponse = {
        component_type: "Center",
        properties: { background_color: "#FFFFFF" },
        children: [
          {
            component_type: "Card",
            properties: { padding: 16, shape_border_radius: 16, elevation: 4 },
            children: [
              {
                component_type: "Column",
                properties: { cross_axis_alignment: "center", spacing: 12 },
                children: [
                  { component_type: "Text", properties: { text: "Here is a cartoon image for you:", font_size: 18, font_weight: "bold" } },
                  { 
                    component_type: "Image", 
                    properties: { 
                      source: `https://loremflickr.com/800/600/${keyword}`,
                      width: 200,
                      height: 150,
                      content_fit: "cover",
                      border_radius: 12
                    } 
                  }
                ]
              }
            ]
          }
        ]
      };

      return JSON.stringify(mockResponse);
    }

    private static generateDefaultMock(): string {
      const mockResponse = {
        component_type: "Center",
        properties: { background_color: "#FFFFFF" },
        children: [
          {
            component_type: "Card",
            properties: { padding: 16, shape_border_radius: 16, elevation: 4 },
            children: [
              {
                component_type: "Text",
                properties: { text: "你好！很高兴为您服务。有什么我可以帮助您的吗？", font_size: 16, color: "#333333" }
              }
            ]
          }
        ]
      };

      return JSON.stringify(mockResponse);
    }
   
    private static async callRealLLM(prompt: string, userQuery?: string, dataContext?: any, currentDsl?: any): Promise<string> {
      console.log(`[LLMService] Calling Qwen API... (Prompt Len: ${prompt.length})`);
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
            messages: [
              { role: "system", content: "You are a helpful assistant. Please respond with valid JSON." },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
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
        console.log(`[LLMService] API Response Received (Content Len: ${content.length})`);
        return content;
      } catch (error) {
        console.error('LLM Request Failed:', error);
        // Fallback to mock for resilience (optional)
        return this.mockGenerate(prompt, userQuery, dataContext, currentDsl); 
      }
    }
  }
