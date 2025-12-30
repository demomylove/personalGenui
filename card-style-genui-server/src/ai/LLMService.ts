/**
 * LLMService.ts
 * 
 * Handles interactions with the Large Language Model.
 * Currently allows toggling between a Mock mode and a Real API mode.
 * Integrated with intent recognition for better UI generation.
 */

// Basic fetch polyfill/implementation for Node.js if needed (Node 18+ has native fetch)
// import fetch from 'node-fetch';
import { IntentRecognitionService, IntentResult, IntentType, ConversationTurn } from './IntentRecognitionService';
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
   * Returns validation of intent + dsl.
   */
  static async generateUIWithIntent(
    userQuery: string,
    dataContext: any,
    currentDsl?: any,
    lastIntent?: IntentType,
    conversationHistory?: ConversationTurn[]
  ): Promise<{ dsl: string, intent: IntentResult }> {
    try {
      // Step 1: Recognize intent with conversation history (context-aware, not keyword-based)
      let intentResult: IntentResult;
      try {
        intentResult = await IntentRecognitionService.recognizeIntent(
          userQuery,
          conversationHistory,
          { maxTurns: 10, enableContextAwareness: true }
        );
        console.log(`[LLMService] Intent recognized: ${intentResult.intent} (confidence: ${intentResult.confidence})`);
        console.log(`[LLMService] Intent reasoning: ${intentResult.reasoning}`);
      } catch (error) {
        console.warn('[LLMService] Intent recognition failed, using quick recognition:', error);
        intentResult = IntentRecognitionService.quickIntentRecognition(userQuery);
      }

      // Step 1.5: Sticky Intent Logic (Override if modification detected)
      // If user says "change color", "make bigger", etc., they likely want to keep the previous intent (e.g. Route, POI)
      // provided the previous intent wasn't CHAT or UNKNOWN.
      if (lastIntent && lastIntent !== IntentType.CHAT && lastIntent !== IntentType.UNKNOWN) {
        // KEYWORDS: Visual or Content modifications
        const modificationKeywords = [
          // Visual/Style
          '改成', '换成', '颜色', '变为', 'adjust', 'change', 'color', 'background', 'larger', 'smaller', 'font', 'red', 'green', 'blue', 'purple',
          // Text/Content - NEW
          '标题', '文字', '文本', '修改', 'title', 'text', 'size', '字体', '字号', '内容', '大小', 'updated'
        ];
        // Also check for specific "Route" context words to avoid false sticky if user switches topics completely
        // But strict "switch topic" usually has new intent keywords. 
        // If recognized intent is low confidence or Chat, AND mod keywords present -> Override.

        if (modificationKeywords.some(kw => userQuery.includes(kw))) {
          if (intentResult.intent === IntentType.CHAT || intentResult.intent === IntentType.CARTOON_IMAGE || intentResult.confidence < 0.9) {
            console.log(`[LLMService] Sticky Intent Triggered: Overriding '${intentResult.intent}' with LastIntent '${lastIntent}' due to modification keywords.`);
            intentResult.intent = lastIntent;
            intentResult.reasoning = "Sticky Intent: User requested style modification on previous context.";
          }
        }
      }

      // Step 2: Generate prompt based on intent
      const intentPrompt = IntentTemplateService.getIntentSpecificPrompt(intentResult, userQuery, dataContext, currentDsl);

      // Step 3: Generate UI using intent-specific prompt
      const dsl = await this.generateUI(intentPrompt, userQuery, dataContext, currentDsl);
      return { dsl, intent: intentResult };

    } catch (error) {
      console.error('[LLMService] Intent-based generation failed, falling back to default:', error);
      const fallbackPrompt = PromptBuilder.constructPrompt(userQuery, dataContext, currentDsl);
      const dsl = await this.generateUI(fallbackPrompt, userQuery, dataContext, currentDsl);
      return { dsl, intent: { intent: IntentType.UNKNOWN, confidence: 0 } };
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
      case 'car_control':
        return this.generateCarControlMock(intentResult.carControlSubType);
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
            background_color: "#E3F2FD",
            padding: 24,
            shape_border_radius: 24,
            elevation: 8,
            width: 380
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
      properties: { background_color: "#E8F5E9", elevation: 4, border_radius: 24, padding: 20, width: "100%" },
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
          properties: { spacing: 12, padding: 16, width: 380 },
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
                  properties: { text: "🚗 驾车路线", font_size: 20, font_weight: "bold", color: "#1565C0" }
                },
                {
                  component_type: "Row",
                  properties: { main_axis_alignment: "space_between", width: "100%" },
                  children: [
                    { component_type: "Text", properties: { text: "上海市", font_size: 18, font_weight: "bold", color: "#333" } },
                    { component_type: "Text", properties: { text: "➝", font_size: 18, color: "#999" } },
                    { component_type: "Text", properties: { text: "北京市", font_size: 18, font_weight: "bold", color: "#333" } }
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
                        { component_type: "Text", properties: { text: "距离", font_size: 12, color: "#1976D2" } },
                        { component_type: "Text", properties: { text: "1214 公里", font_size: 24, font_weight: "bold", color: "#0D47A1" } }
                      ]
                    },
                    {
                      component_type: "Column",
                      properties: { spacing: 4 },
                      children: [
                        { component_type: "Text", properties: { text: "预计耗时", font_size: 12, color: "#1976D2" } },
                        { component_type: "Text", properties: { text: "14 小时", font_size: 24, font_weight: "bold", color: "#0D47A1" } }
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
          properties: {
            background_color: "#FFFFFF",
            padding: 24,
            shape_border_radius: 24,
            elevation: 4,
            width: 380
          },
          children: [
            {
              component_type: "Column",
              properties: { cross_axis_alignment: "center", spacing: 16 },
              children: [
                { component_type: "Text", properties: { text: "为您生成的卡通图片:", font_size: 20, font_weight: "bold", color: "#333333" } },
                {
                  component_type: "Image",
                  properties: {
                    source: `https://loremflickr.com/800/600/${keyword}?random=${new Date().getTime()}`,
                    width: "100%",
                    height: 320,
                    content_fit: "cover",
                    border_radius: 16
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

  private static generateCarControlMock(carControlSubType?: 'ac' | 'window' | 'seat' | 'light' | 'general'): string {
    const subType = carControlSubType || 'general';
    
    switch (subType) {
      case 'ac':
        return this.generateAcControlMock();
      case 'window':
        return this.generateWindowControlMock();
      case 'seat':
        return this.generateSeatControlMock();
      case 'light':
        return this.generateLightControlMock();
      default:
        return this.generateGeneralCarControlMock();
    }
  }

  private static generateAcControlMock(): string {
    const mockResponse = {
      component_type: "Center",
      properties: { background_color: "#FFFFFF" },
      children: [
        {
          component_type: "Card",
          properties: { background_color: "#FFFFFF", padding: 24, shape_border_radius: 24, elevation: 4, width: 380 },
          children: [
            {
              component_type: "Column",
              properties: { spacing: 24 },
              children: [
                 {
                   component_type: "Row",
                   properties: { main_axis_alignment: "space_between", width: "100%", cross_axis_alignment: "center" },
                   children: [
                     { component_type: "Text", properties: { text: "空调控制", font_size: 24, font_weight: "bold", color: "#333" } },
                     { component_type: "Text", properties: { text: "❄️", font_size: 24, color: "#4285F4" } }
                   ]
                 },
                 {
                   component_type: "Row",
                   properties: { main_axis_alignment: "space_between", "cross_axis_alignment": "center" },
                   children: [
                       {
                         component_type: "Button",
                         properties: { text: "−", background_color: "#E3F2FD", "text_color": "#1976D2", "font_size": 32, "width": 64, "height": 64, "border_radius": 16, "on_click": { "action_type": "ac_temp_down" } }
                       },
                       { component_type: "Text", properties: { text: "24°", "font_size": 64, "font_weight": "bold", "color": "#212121" } },
                       {
                         component_type: "Button",
                         properties: { text: "+", "background_color": "#E3F2FD", "text_color": "#1976D2", "font_size": 32, "width": 64, "height": 64, "border_radius": 16, "on_click": { "action_type": "ac_temp_up" } }
                       }
                    ]
                 },
                 {
                   component_type: "Row",
                   properties: { main_axis_alignment: "space_between" },
                   children: [
                       { component_type: "Button", properties: { text: "❄️ 制冷", "background_color": "#FFFFFF", "border_color": "#E0E0E0", "border_width": 1, "text_color": "#4285F4", "width": 88, "height": 40, "border_radius": 20 } },
                       { component_type: "Button", properties: { text: "⚙️ 自动", "background_color": "#E3F2FD", "text_color": "#1976D2", "width": 88, "height": 40, "border_radius": 20 } },
                       { component_type: "Button", properties: { text: "☀️ 制热", "background_color": "#FFFFFF", "border_color": "#E0E0E0", "border_width": 1, "text_color": "#FF7043", "width": 88, "height": 40, "border_radius": 20 } }
                    ]
                 },
                 {
                   component_type: "Button",
                   properties: { text: "开启空调", "background_color": "#E3F2FD", "text_color": "#4285F4", "font_size": 20, "font_weight": "bold", "width": "100%", "height": 56, "border_radius": 28, "on_click": { "action_type": "ac_toggle" } }
                 }
              ]
            }
          ]
        }
      ]
    };

    return JSON.stringify(mockResponse);
  }

  private static generateGeneralCarControlMock(): string {
    const mockResponse = {
      component_type: "Center",
      properties: { background_color: "#FFFFFF" },
      children: [
        {
          component_type: "Card",
          properties: { background_color: "#FFFFFF", "padding": 24, "shape_border_radius": 24, "elevation": 4, "width": 380 },
          children: [
            {
              component_type: "Column",
              properties: { "spacing": 20 },
              "children": [
                 {
                   component_type: "Row",
                   properties: { "main_axis_alignment": "space_between", "width": "100%", "cross_axis_alignment": "center" },
                   "children": [
                     { "component_type": "Text", "properties": { "text": "车控", "font_size": 24, "font_weight": "bold", "color": "#333" } },
                     { "component_type": "Text", "properties": { "text": "🚗", "font_size": 24, "color": "#4285F4" } }
                   ]
                 },
                 {
                   "component_type": "Column",
                   "properties": { "spacing": 12 },
                   "children": [
                      {
                        "component_type": "Button",
                        "properties": { "text": "❄️ 空调控制", "background_color": "#E3F2FD", "text_color": "#1976D2", "font_size": 16, "width": "100%", "height": 48, "border_radius": 12, "on_click": { "action_type": "ac_control" } }
                      },
                      {
                        "component_type": "Button",
                        "properties": { "text": "🪟 车窗控制", "background_color": "#E8F5E9", "text_color": "#2E7D32", "font_size": 16, "width": "100%", "height": 48, "border_radius": 12, "on_click": { "action_type": "window_control" } }
                      },
                      {
                        "component_type": "Button",
                        "properties": { "text": "💺 座椅控制", "background_color": "#FFF3E0", "text_color": "#E65100", "font_size": 16, "width": "100%", "height": 48, "border_radius": 12, "on_click": { "action_type": "seat_control" } }
                      },
                      {
                        "component_type": "Button",
                        "properties": { "text": "💡 灯光控制", "background_color": "#FFF9C4", "text_color": "#F57F17", "font_size": 16, "width": "100%", "height": 48, "border_radius": 12, "on_click": { "action_type": "light_control" } }
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

  private static generateWindowControlMock(): string {
    const mockResponse = {
      component_type: "Center",
      properties: { background_color: "#FFFFFF" },
      children: [
        {
          component_type: "Card",
          properties: { background_color: "#FFFFFF", padding: 24, shape_border_radius: 24, elevation: 4, width: 380 },
          children: [
            {
              component_type: "Column",
              properties: { spacing: 20 },
              children: [
                 {
                   component_type: "Row",
                   properties: { main_axis_alignment: "space_between", width: "100%", cross_axis_alignment: "center" },
                   children: [
                     { component_type: "Text", properties: { text: "车窗控制", font_size: 24, font_weight: "bold", color: "#333" } },
                     { component_type: "Text", properties: { text: "🪟", font_size: 24, "color": "#2E7D32" } }
                   ]
                 },
                 {
                   component_type: "Column",
                   properties: { spacing: 12 },
                   children: [
                      {
                        component_type: "Row",
                        properties: { main_axis_alignment: "space_between" },
                        children: [
                           { component_type: "Button", properties: { text: "前左", "background_color": "#E8F5E9", "text_color": "#2E7D32", "width": 88, "height": 40, "border_radius": 12 } },
                           { component_type: "Button", properties: { text: "前右", "background_color": "#E8F5E9", "text_color": "#2E7D32", "width": 88, "height": 40, "border_radius": 12 } },
                           { component_type: "Button", properties: { text: "后左", "background_color": "#E8F5E9", "text_color": "#2E7D32", "width": 88, "height": 40, "border_radius": 12 } },
                           { component_type: "Button", properties: { text: "后右", "background_color": "#E8F5E9", "text_color": "#2E7D32", "width": 88, "height": 40, "border_radius": 12 } }
                        ]
                      },
                      {
                        component_type: "Row",
                        properties: { main_axis_alignment: "space_between" },
                        children: [
                           { component_type: "Button", properties: { text: "打开", "background_color": "#2E7D32", "text_color": "#FFFFFF", "width": 120, "height": 48, "border_radius": 12, "on_click": { "action_type": "window_open" } } },
                           { component_type: "Button", properties: { text: "关闭", "background_color": "#757575", "text_color": "#FFFFFF", "width": 120, "height": 48, "border_radius": 12, "on_click": { "action_type": "window_close" } } }
                        ]
                      },
                      {
                        component_type: "Button",
                        properties: { text: "一键全部关闭", "background_color": "#C62828", "text_color": "#FFFFFF", "font_size": 16, "width": "100%", "height": 48, "border_radius": 12, "on_click": { "action_type": "window_close_all" } }
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

  private static generateSeatControlMock(): string {
    const mockResponse = {
      component_type: "Center",
      properties: { background_color: "#FFFFFF" },
      children: [
        {
          component_type: "Card",
          properties: { background_color: "#FFFFFF", padding: 24, shape_border_radius: 24, elevation: 4, width: 380 },
          children: [
            {
              component_type: "Column",
              properties: { spacing: 20 },
              children: [
                 {
                   component_type: "Row",
                   properties: { main_axis_alignment: "space_between", width: "100%", cross_axis_alignment: "center" },
                   children: [
                     { component_type: "Text", properties: { text: "座椅控制", "font_size": 24, font_weight: "bold", "color": "#333" } },
                     { component_type: "Text", properties: { text: "💺", "font_size": 24, "color": "#E65100" } }
                   ]
                 },
                 {
                   component_type: "Row",
                   properties: { main_axis_alignment: "space_between" },
                   children: [
                      { component_type: "Button", properties: { text: "驾驶座", "background_color": "#FFF3E0", "text_color": "#E65100", "width": 110, "height": 40, "border_radius": 12 } },
                      { component_type: "Button", properties: { text: "副驾驶", "background_color": "#FFF3E0", "text_color": "#E65100", "width": 110, "height": 40, "border_radius": 12 } },
                      { component_type: "Button", properties: { text: "后排", "background_color": "#FFF3E0", "text_color": "#E65100", "width": 110, "height": 40, "border_radius": 12 } }
                   ]
              },
                 {
                   component_type: "Column",
                   properties: { spacing: 12 },
                   children: [
                      {
                        component_type: "Row",
                        properties: { main_axis_alignment: "space_between" },
                        children: [
                           { component_type: "Button", properties: { text: "向前", "background_color": "#FFF3E0", "text_color": "#E65100", "width": 120, "height": 40, "border_radius": 12, "on_click": { "action_type": "seat_forward" } } },
                           { component_type: "Button", properties: { text: "向后", "background_color": "#FFF3E0", "text_color": "#E65100", "width": 120, "height": 40, "border_radius": 12, "on_click": { "action_type": "seat_backward" } } }
                        ]
                      },
                      {
                        component_type: "Row",
                        properties: { main_axis_alignment: "space_between" },
                        children: [
                           { component_type: "Button", properties: { text: "加热", "background_color": "#FF7043", "text_color": "#FFFFFF", "width": 120, "height": 40, "border_radius": 12, "on_click": { "action_type": "seat_heat" } } },
                           { component_type: "Button", properties: { text: "通风", "background_color": "#42A5F5", "text_color": "#FFFFFF", "width": 120, "height": 40, "border_radius": 12, "on_click": { "action_type": "seat_ventilate" } } }
                        ]
                      },
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

  private static generateLightControlMock(): string {
    const mockResponse = {
      component_type: "Center",
      properties: { background_color: "#FFFFFF" },
      children: [
        {
          component_type: "Card",
          properties: { background_color: "#FFFFFF", padding: 24, shape_border_radius: 24, elevation: 4, width: 380 },
          children: [
            {
              component_type: "Column",
              properties: { spacing: 20 },
              children: [
                 {
                   component_type: "Row",
                   properties: { main_axis_alignment: "space_between", width: "100%", cross_axis_alignment: "center" },
                   children: [
                     { component_type: "Text", properties: { text: "灯光控制", "font_size": 24, "font_weight": "bold", "color": "#333" } },
                     { component_type: "Text", properties: { text: "💡", "font_size": 24, "color": "#F57F17" } }
                   ]
                 },
                 {
                   component_type: "Column",
                   properties: { spacing: 12 },
                   children: [
                      {
                        component_type: "Row",
                        properties: { main_axis_alignment: "space_between" },
                        children: [
                           { component_type: "Button", properties: { text: "大灯", "background_color": "#FFF9C4", "text_color": "#F57F17", "width": 88, "height": 40, "border_radius": 12 } },
                           { component_type: "Button", properties: { text: "雾灯", "background_color": "#FFF9C4", "text_color": "#F57F17", "width": 88, "height": 40, "border_radius": 12 } },
                           { component_type: "Button", properties: { text: "阅读灯", "background_color": "#FFF9C4", "text_color": "#F57F17", "width": 88, "height": 40, "border_radius": 12 } },
                           { component_type: "Button", properties: { text: "氛围灯", "background_color": "#FFF9C4", "text_color": "#F57F17", "width": 88, "height": 40, "border_radius": 12 } }
                        ]
                      },
                      {
                        component_type: "Row",
                        properties: { main_axis_alignment: "space_between" },
                        children: [
                           { component_type: "Button", properties: { text: "开启", "background_color": "#F57F17", "text_color": "#FFFFFF", "width": 120, "height": 48, "border_radius": 12, "on_click": { "action_type": "light_on" } } },
                           { component_type: "Button", properties: { text: "关闭", "background_color": "#757575", "text_color": "#FFFFFF", "width": 120, "height": 48, "border_radius": 12, "on_click": { "action_type": "light_off" } } }
                        ]
                      },
                      {
                        component_type: "Button",
                        properties: { text: "自动模式", "background_color": "#FFF9C4", "text_color": "#F57F17", "font_size": 16, "width": "100%", "height": 48, "border_radius": 12, "on_click": { "action_type": "light_auto" } }
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
