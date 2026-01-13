/**
 * IntentTemplateService.ts
 * 
 * 根据不同的意图类型提供专门的模板和样式指导
 * 为每种意图类型定制UI生成策略
 */

import { IntentType, IntentResult } from './IntentRecognitionService';

export class IntentTemplateService {

  /**
   * 根据意图类型获取专门的提示词模板
   */
  static getIntentSpecificPrompt(intent: IntentResult, userQuery: string, dataContext: any, currentDsl?: any): string {
    const basePrompt = this.getBasePrompt();
    const intentSpecificPrompt = this.getIntentPrompt(intent.intent, userQuery, dataContext, currentDsl, intent);

    return basePrompt + intentSpecificPrompt;
  }

  /**
   * 获取基础提示词
   */
  private static getBasePrompt(): string {
    return `
# Role
你是一个专业的UI生成助手，能够根据用户意图生成最适合的界面设计。

# Component Library (DSL Schema)
type Component = {
  component_type: "Column" | "Row" | "Text" | "Image" | "Card" | "SizedBox" | "Button" | "Center";
  properties?: Record<string, any>;
  children?: Component[];
}

# Constraints & Rules
1. 输出必须是有效的JSON格式
2. 根对象必须是单个组件
3. 不要包含markdown代码块
4. 使用提供的数据上下文填充UI
5. 用户明确要求的文本永远覆盖数据上下文
6. **CONTEXT AWARENESS**:
   - If "Current UI DSL" is provided, you MUST modify it in-place to reflect the new data/query.
   - Do NOT change the overall structure or style unless explicitly asked.
   - Preserving the existing Component ID/Structure ensures a smooth UI update.
`;
  }

  /**
   * 根据意图类型获取专门的提示词
   */
  private static getIntentPrompt(intent: IntentType, userQuery: string, dataContext: any, currentDsl?: any, intentResult?: IntentResult): string {
    switch (intent) {
      case IntentType.WEATHER:
        return this.getWeatherPrompt(userQuery, dataContext, currentDsl);
      case IntentType.MUSIC:
        return this.getMusicPrompt(userQuery, dataContext, currentDsl);
      case IntentType.POI:
        return this.getPoiPrompt(userQuery, dataContext, currentDsl);
      case IntentType.ROUTE_PLANNING:
        return this.getRoutePrompt(userQuery, dataContext, currentDsl);
      case IntentType.CARTOON_IMAGE:
        return this.getCartoonImagePrompt(userQuery, dataContext, currentDsl);
      case IntentType.CAR_CONTROL:
        return this.getCarControlPrompt(userQuery, dataContext, currentDsl, intentResult?.carControlSubType);
      case IntentType.FLIGHT:
        return this.getFlightPrompt(userQuery, dataContext, currentDsl);
      case IntentType.CHAT:
        return this.getChatPrompt(userQuery, dataContext, currentDsl);
      default:
        return this.getDefaultPrompt(userQuery, dataContext, currentDsl);
    }
  }

  /**
   * 天气意图的专门模板
   */
  private static getWeatherPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 天气界面设计指南

## 设计风格
- 使用清新的淡蓝色系配色方案
- 主背景色: '#E3F2FD' (Light Blue)
- 根容器背景: '#FFFFFF' (White)
- 强调色: '#0288D1' (Light Blue Accent)

## 布局结构
- 卡片宽度固定为380px，居中显示
- 顶部: 城市名(左) + 日期(右)
- 中部: 天气图标(左) + 大号温度(右)
- 底部: 天气描述 + 湿度和风信息

## 示例
User: "上海天气"
Data: {"temp": "15", "city": "上海市", "date": "2025-12-23", "weekday": "周二", "cond": "阴", "feels_like": "15", "humidity": "60%", "wind": "西风≤3级"}

Output:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": {
        "background_color": "#E3F2FD", 
        "elevation": 8,
        "margin": 0,
        "width": 380
      },
      "children": [
        {
          "component_type": "Column",
          "properties": { "cross_axis_alignment": "center" },
          "children": [
            {
              "component_type": "Row",
              "properties": { "main_axis_alignment": "center", "spacing": 8 },
              "children": [
                { "component_type": "Text", "properties": { "text": "上海市", "font_size": 24, "font_weight": "bold", "color": "#333333" } },
                { "component_type": "Text", "properties": { "text": "2025-12-23 周二", "font_size": 16, "color": "#E65100" } }
              ]
            },
            { "component_type": "SizedBox", "properties": { "height": 24 } },
            {
              "component_type": "Row",
              "properties": { "main_axis_alignment": "center", "cross_axis_alignment": "center", "spacing": 16 },
              "children": [
                { "component_type": "Text", "properties": { "text": "☁️", "font_size": 64 } },
                { "component_type": "Text", "properties": { "text": "15°C", "font_size": 72, "font_weight": "bold", "color": "#E65100" } }
              ]
            },
            { "component_type": "SizedBox", "properties": { "height": 8 } },
            { "component_type": "Text", "properties": { "text": "体感: 15°C", "font_size": 14, "color": "#E65100" } },
            { "component_type": "SizedBox", "properties": { "height": 16 } },
            { "component_type": "Text", "properties": { "text": "阴", "font_size": 20, "font_weight": "bold", "color": "#4E342E" } },
            { "component_type": "SizedBox", "properties": { "height": 12 } },
            { "component_type": "Text", "properties": { "text": "湿度: 60% 风向: 西风≤3级", "font_size": 14, "color": "#5D4037" } }
          ]
        }
      ]
    }
  ]
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请根据天气设计指南生成界面。
`;
  }

  /**
   * 音乐意图的专门模板
   */
  private static getMusicPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 音乐界面设计指南

## 设计风格
- 使用活泼清新配色方案
- 主背景色: '#FAFAFA' (Very Light Grey)
- 卡片背景: '#F3E5F5' (Light Purple/Pink) - 柔和的彩色
- 文字颜色: '#333333' (Dark Grey) 和 '#666666' (Medium Grey)

## 布局结构
- 卡片宽度自适应(92%)，居中显示
- **交互**: 点击卡片跳转系统音乐播放器 (action: open_music_app)
- 简洁清爽的卡片布局
- 顶部: 专辑封面图片 (圆角，作为主视觉)
- 中部: 歌曲信息 (加粗标题)
- 底部: 简约的播放控制

## 示例
用户: "播放音乐"
输出:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": {
        "background_color": "#F3E5F5",
        "padding": 16, 
        "shape_border_radius": 24,
        "elevation": 4, 
        "width": 380,
        "on_click": { "action_type": "open_music_app" }
      },
      "children": [
        {
          "component_type": "Column",
          "properties": { "spacing": 12, "cross_axis_alignment": "center" },
          "children": [
             {
               "component_type": "Image",
               "properties": {
                 "source": "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=400&auto=format&fit=crop",
                 "width": "220",
                 "height": 180,
                 "border_radius": 16,
                 "content_fit": "cover"
               }
             },
            {
              "component_type": "Column",
              "properties": { "spacing": 4, "cross_axis_alignment": "center" },
              "children": [
                {
                  "component_type": "Text",
                  "properties": { "text": "七里香", "font_size": 20, "font_weight": "bold", "color": "#333333" }
                },
                {
                  "component_type": "Text",
                  "properties": { "text": "周杰伦", "font_size": 14, "color": "#666666" }
                }
              ]
            },
            {
              "component_type": "Row",
              "properties": { "spacing": 24, "main_axis_alignment": "center" },
              "children": [
                 { "component_type": "Text", "properties": { "text": "⏮", "font_size": 24, "color": "#8E24AA" } },
                 { "component_type": "Text", "properties": { "text": "▶", "font_size": 32, "color": "#8E24AA" } },
                 { "component_type": "Text", "properties": { "text": "⏭", "font_size": 24, "color": "#8E24AA" } }
              ]
            }
          ]
        }
      ]
    }
  ]
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请根据音乐设计指南生成界面。
`;
  }

  /**
   * POI意图的专门模板
   */
  private static getPoiPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# POI搜索界面设计指南

## 设计风格
- 使用绿色系配色方案
- 主背景色: '#E8F5E9' (Light Green)
- 强调色: '#2E7D32' (Dark Green)
- 卡片背景: '#E8F5E9'

## 布局结构
- 标题: "附近的精选好店"
- POI列表: 每个POI一个卡片，包含图片、名称、评分、价格、营业时间、地址

## 示例
用户: "附近的咖啡店"
数据: {"pois": [{"name": "Starbucks Reserve", "address": "123 Main St", "rating": "4.8", "cost": "¥45", "opentimeToday": "07:00-22:00", "image": "http://img.com/1"}]}

输出:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Column",
      "properties": { "spacing": 12, "width": 380 },
      "children": [
         { "component_type": "Text", "properties": { "text": "附近的精选好店", "font_size": 28, "font_weight": "bold", "color": "#2E7D32" } },
         {
           "component_type": "Card",
           "properties": { "background_color": "#E8F5E9", "elevation": 4, "border_radius": 16, "padding": 12, "margin": 0, "width": "100%" },
           "children": [
             {
               "component_type": "Row",
               "properties": { "spacing": 12, "cross_axis_alignment": "center", "width": "100%" },
               "children": [
                 { "component_type": "Image", "properties": { "source": "http://img.com/1", "width": 64, "height": 64, "border_radius": 12, "content_fit": "cover" } },
                 {
                   "component_type": "Column",
                   "properties": { "flex": 1, "spacing": 8 },
                   "children": [
                     { "component_type": "Text", "properties": { "text": "Starbucks Reserve", "font_size": 18, "font_weight": "bold", "color": "#1B5E20" } },
                     { 
                       "component_type": "Row",
                       "properties": { "spacing": 12, "cross_axis_alignment": "center" },
                       "children": [
                          { "component_type": "Text", "properties": { "text": "⭐ 4.8", "font_size": 14, "color": "#F57F17", "font_weight": "bold" } },
                          { "component_type": "Text", "properties": { "text": "¥45/人", "font_size": 14, "color": "#388E3C" } }
                       ]
                     },
                     { "component_type": "Text", "properties": { "text": "营业时间: 07:00-22:00", "font_size": 16, "color": "#558B2F" } },
                     { "component_type": "Text", "properties": { "text": "123 Main St", "font_size": 12, "color": "#757575", "max_lines": 1 } }
                   ]
                 }
               ]
             }
           ]
         }
      ]
    }
  ]
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请根据POI设计指南生成界面。
`;
  }

  /**
   * 出行规划意图的专门模板
   */
  private static getRoutePrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 出行规划界面设计指南

## 设计风格
- 使用蓝色系配色方案
- 主背景色: '#E3F2FD' (Light Blue)
- 强调色: '#1565C0' (Blue)

## 布局结构
- 标题: "🚗 Driving Route"
- 路线信息: 出发地 → 目的地
- 关键信息: 距离、时长
- 路线步骤: 简化的步骤列表

## 示例
用户: "从上海到北京"
数据: {"route": {"origin": "Shanghai", "destination": "Beijing", "distance": "1214.3km", "duration": "14 hours", "steps": ["Start from People's Square", "Enter G2 Highway"]}}

输出:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": { "background_color": "#E3F2FD", "padding": 20, "shape_border_radius": 20, "elevation": 4, "width": 380 },
      "children": [
        {
          "component_type": "Column",
          "properties": { "spacing": 16 },
          "children": [
             { 
               "component_type": "Text", 
               "properties": { "text": "🚗 驾车路线", "font_size": 20, "font_weight": "bold", "color": "#1565C0" } 
             },
             {
               "component_type": "Row",
               "properties": { "main_axis_alignment": "center", "spacing": 20, "width": "100%" },
               "children": [
                  { "component_type": "Text", "properties": { "text": "上海市", "font_size": 18, "font_weight": "bold", "color": "#333" } },
                  { "component_type": "Text", "properties": { "text": "➝", "font_size": 18, "color": "#999" } },
                  { "component_type": "Text", "properties": { "text": "北京市", "font_size": 18, "font_weight": "bold", "color": "#333" } }
               ]
             },
             {
               "component_type": "Row",
               "properties": { "spacing": 20 },
               "children": [
                  {
                    "component_type": "Column",
                    "properties": { "spacing": 4 },
                    "children": [
                       { "component_type": "Text", "properties": { "text": "距离", "font_size": 12, "color": "#1976D2" } },
                       { "component_type": "Text", "properties": { "text": "1214 公里", "font_size": 24, "font_weight": "bold", "color": "#0D47A1" } }
                    ]
                  },
                  {
                    "component_type": "Column",
                    "properties": { "spacing": 4 },
                    "children": [
                       { "component_type": "Text", "properties": { "text": "预计耗时", "font_size": 12, "color": "#1976D2" } },
                       { "component_type": "Text", "properties": { "text": "14 小时", "font_size": 24, "font_weight": "bold", "color": "#0D47A1" } }
                    ]
                  }
               ]
             },
             { "component_type": "Text", "properties": { "text": "• 从人民广场出发\\n• 进入G2高速", "font_size": 14, "color": "#546E7A", "max_lines": 10 } }
          ]
        }
      ]
    }
  ]
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请根据出行规划设计指南生成界面。
`;
  }

  /**
   * 卡通图片意图的专门模板
   */
  private static getCartoonImagePrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 卡通图片界面设计指南

## 设计风格
- 使用柔和的配色方案
- 主背景色: '#FFFFFF' (White)
- 卡片背景: '#FFFFFF' 或 淡灰色 '#F5F5F5'
- 严禁使用红色、深橙色等强烈的背景色

## 布局结构
- 简洁的卡片布局
- 居中显示生成的图片
- 包含描述文字
- **关键**: 如果数据上下文中存在 'generatedImage'，必须使用 'generatedImage.url' 作为图片地址。

## 示例
用户: "画一只可爱的小狗"
输出:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": { 
        "background_color": "#FFFFFF",
        "padding": 16, 
        "shape_border_radius": 24, 
        "elevation": 4,
        "width": 360,
        "height": 360
      },
      "children": [
        {
          "component_type": "Column",
          "properties": { "cross_axis_alignment": "center", "spacing": 12 },
          "children": [
            { "component_type": "Text", "properties": { "text": "已生成", "font_size": 16, "font_weight": "bold", "color": "#333333" } },
            { 
              "component_type": "Image", 
              "properties": { 
                "source": "https://loremflickr.com/800/600/dog?lock=5678",
                "width": 328,
                "height": 280,
                "content_fit": "cover",
                "border_radius": 16
              } 
            }
          ]
        }
          ]
        }
      ]
    }
  ]
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请根据卡通图片设计指南生成界面。
`;
  }

  /**
   * 车控意图的专门模板（根据子类型选择具体模板）
   */
  private static getCarControlPrompt(userQuery: string, dataContext: any, currentDsl?: any, carControlSubType?: 'ac' | 'window' | 'seat' | 'light' | 'general'): string {
    // 使用传入的车控子类型，默认为 general
    const subType = carControlSubType || dataContext?.carControlSubType || 'general';
    
    switch (subType) {
      case 'ac':
        return this.getAcControlPrompt(userQuery, dataContext, currentDsl);
      case 'window':
        return this.getWindowControlPrompt(userQuery, dataContext, currentDsl);
      case 'seat':
        return this.getSeatControlPrompt(userQuery, dataContext, currentDsl);
      case 'light':
        return this.getLightControlPrompt(userQuery, dataContext, currentDsl);
      default:
        return this.getGeneralCarControlPrompt(userQuery, dataContext, currentDsl);
    }
  }

  /**
   * 空调控制模板
   */
  private static getAcControlPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 空调控制界面设计指南

## 设计风格
- 使用现代简洁风格
- 主背景色: '#FFFFFF' (White)
- 强调色: '#4285F4' (Blue)
- 字体: 粗体数字显示温度

## 布局结构
- 标题栏: 左侧"空调控制", 右侧图标(雪花/太阳)
- 温度调节区: 左侧减号按钮(-), 中间大号温度(24°), 右侧加号按钮(+)
- 模式选择区: "制冷"、"自动"、"制热"三个按钮一行排列
- 底部开关: 大号"开启空调"按钮
- 卡片宽度: **380px** (Strict)

## 示例
User: "把空调调到24度"
Output:
{
  "component_type": "car_control_ac"
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请根据空调控制设计指南生成界面。
`;
  }

  /**
   * 通用车控模板
   */
  private static getGeneralCarControlPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 通用车控界面设计指南

## 设计风格
- 使用现代简洁风格
- 主背景色: '#FFFFFF' (White)
- 强调色: '#4285F4' (Blue)

## 布局结构
- 标题栏: 左侧"车控", 右侧图标(🚗)
- 控制项列表: 网格布局展示各种车控功能
- 卡片宽度: **380px** (Strict)

## 示例
User: "打开车控"
Output:
{
  "component_type": "car_control_general"
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请根据通用车控设计指南生成界面。
`;
  }

  /**
   * 车窗控制模板
   */
  private static getWindowControlPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 车窗控制界面设计指南

## 设计风格
- 使用现代简洁风格
- 主背景色: '#FFFFFF' (White)
- 强调色: '#2E7D32' (Green)

## 布局结构
- 标题栏: 左侧"车窗控制", 右侧图标(🪟)
- 车窗位置选择: 前左、前右、后左、后右
- 控制按钮: 打开、关闭、一键升降
- 卡片宽度: **380px** (Strict)

## 示例
User: "打开车窗"
Output:
{
  "component_type": "car_control_window"
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请根据车窗控制设计指南生成界面。
`;
  }

  /**
   * 座椅控制模板
   */
  private static getSeatControlPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 座椅控制界面设计指南

## 设计风格
- 使用现代简洁风格
- 主背景色: '#FFFFFF' (White)
- 强调色: '#E65100' (Orange)

## 布局结构
- 标题栏: 左侧"座椅控制", 右侧图标(💺)
- 座椅位置选择: 驾驶座、副驾驶座、后排
- 控制选项: 前后调节、靠背角度、座椅加热、座椅通风
- 卡片宽度: **380px** (Strict)

## 示例
User: "调节座椅"
Output:
{
  "component_type": "car_control_seat"
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请根据座椅控制设计指南生成界面。
`;
  }

  /**
   * 灯光控制模板
   */
  private static getLightControlPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 灯光控制界面设计指南

## 设计风格
- 使用现代简洁风格
- 主背景色: '#FFFFFF' (White)
- 强调色: '#F57F17' (Yellow)

## 布局结构
- 标题栏: 左侧"灯光控制", 右侧图标(💡)
- 灯光类型: 大灯、雾灯、阅读灯、氛围灯
- 控制选项: 开启、关闭、自动模式、亮度调节
- 卡片宽度: **380px** (Strict)

## 示例
User: "打开灯光"
Output:
{
  "component_type": "car_control_light"
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请根据灯光控制设计指南生成界面。
`;
  }

  /**
   * 聊天意图的专门模板
   */
  private static getChatPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 聊天界面设计指南

## 设计风格
- 使用简洁的对话界面
- 主背景色: '#FFFFFF' (White)
- 消息气泡样式

## 布局结构
- 简单的文本响应
- 可以包含简单的卡片展示

## 示例
用户: "你好"
输出:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": { "padding": 16, "shape_border_radius": 16, "elevation": 2 },
      "children": [
        {
          "component_type": "Text",
          "properties": { "text": "你好！很高兴为您服务。有什么我可以帮助您的吗？", "font_size": 16, "color": "#333333" }
        }
      ]
    }
  ]
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请根据聊天设计指南生成界面。
`;
  }

  /**
   * 默认模板
   */
  private static getDefaultPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 默认界面设计指南

## 设计风格
- 使用简洁的现代设计
- 主背景色: '#FFFFFF' (White)

## 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
当前DSL: ${currentDsl ? JSON.stringify(currentDsl, null, 2) : "无"}

请生成合适的界面来响应用户查询。
`;
  }
  /**
   * 航班/行程信息模板
   * 依赖LLM的联网搜索能力获取实时数据
   */
  private static getFlightPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    return `
# 行程信息界面设计指南 (Web Search Enabled)

## 任务背景
用户正在查询航班或高铁/火车行程信息。
**关键能力**: 你拥有联网搜索能力 (enable_search=true)。如果 \`dataContext\` 中没有提供具体的行程数据，**请立即利用你的搜索能力获取最新的实时班次、时间、状态等信息**。

## 设计风格
- 航空/商务风格
- 航班使用蓝色系 (#1E88E5)
- 高铁使用绿色或深色系 (#2E7D32 或 #37474F)
- 清晰的信息层级: 出发/到达时间最显著

## 布局结构 (Card)
  - 顶部: 航空公司/列车号 + 日期 + 状态 (正常/延误)
  - 中间: 
    - 左侧: 出发时间 (特大) + 机场/车站
    - 中间: 箭头 + 时长/经停
    - 右侧: 到达时间 (特大) + 机场/车站
  - 底部: 登机口/检票口 + 行李/座位信息

## 示例
用户: "查询MU5138"
(你通过搜索得知: MU5138 北京首都->上海虹桥, 08:00-10:15, 准点)
输出:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": { "background_color": "#E3F2FD", "padding": 20, "shape_border_radius": 16, "width": 380 },
      "children": [
        {
          "component_type": "Column",
          "properties": { "spacing": 16 },
          "children": [
             { 
               "component_type": "Row", 
               "properties": { "main_axis_alignment": "space_between" },
               "children": [
                 { "component_type": "Text", "properties": { "text": "东方航空 MU5138", "font_weight": "bold", "color": "#1565C0" } },
                 { "component_type": "Text", "properties": { "text": "2025-10-01 🟢 准点", "color": "#2E7D32" } }
               ]
             },
             {
               "component_type": "Row",
               "properties": { "main_axis_alignment": "space_between", "cross_axis_alignment": "center" },
               "children": [
                 {
                   "component_type": "Column",
                   "properties": { "cross_axis_alignment": "center" },
                   "children": [
                     { "component_type": "Text", "properties": { "text": "08:00", "font_size": 32, "font_weight": "bold", "color": "#333" } },
                     { "component_type": "Text", "properties": { "text": "北京首都 T2", "font_size": 14, "color": "#666" } }
                   ]
                 },
                 {
                   "component_type": "Column",
                   "properties": { "cross_axis_alignment": "center" },
                   "children": [
                     { "component_type": "Text", "properties": { "text": "2h 15m", "font_size": 12, "color": "#999" } },
                     { "component_type": "Text", "properties": { "text": "──────✈─────", "color": "#1565C0" } }
                   ]
                 },
                 {
                   "component_type": "Column",
                   "properties": { "cross_axis_alignment": "center" },
                   "children": [
                     { "component_type": "Text", "properties": { "text": "10:15", "font_size": 32, "font_weight": "bold", "color": "#333" } },
                     { "component_type": "Text", "properties": { "text": "上海虹桥 T2", "font_size": 14, "color": "#666" } }
                   ]
                 }
               ]
             }
          ]
        }
      ]
    }
  ]
}

# 当前任务
用户查询: "${userQuery}"
数据上下文: ${JSON.stringify(dataContext, null, 2)}
(注意: 如果上下文为空，请务必使用你的搜索能力获取实时信息并填入UI)

请根据行程信息界面设计指南生成界面。
`;
  }
}