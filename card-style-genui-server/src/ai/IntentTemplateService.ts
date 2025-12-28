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
    const intentSpecificPrompt = this.getIntentPrompt(intent.intent, userQuery, dataContext, currentDsl);

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
`;
  }

  /**
   * 根据意图类型获取专门的提示词
   */
  private static getIntentPrompt(intent: IntentType, userQuery: string, dataContext: any, currentDsl?: any): string {
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
- 使用温暖的橙色系配色方案
- 主背景色: '#FFCC80' (Medium Orange)
- 根容器背景: '#FFFFFF' (White)
- 强调色: '#E65100' (Deep Orange)

## 布局结构
- 卡片宽度固定为340px，居中显示
- 顶部: 城市名(左) + 日期(右)
- 中部: 天气图标(左) + 大号温度(右)
- 底部: 天气描述 + 湿度和风信息

## 示例
用户: "上海天气"
数据: {"temp": "15", "city": "上海市", "date": "2025-12-23", "weekday": "周二", "cond": "阴", "feels_like": "15", "humidity": "60%", "wind": "西风≤3级"}

输出:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": {
        "background_color": "#FFCC80", 
        "padding": 24, 
        "shape_border_radius": 24, 
        "elevation": 8,
        "width": 340
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
        "width": "92%",
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
      "properties": { "spacing": 16, "padding": 20 },
      "children": [
         { "component_type": "Text", "properties": { "text": "附近的精选好店", "font_size": 28, "font_weight": "bold", "color": "#2E7D32" } },
         {
           "component_type": "Card",
           "properties": { "background_color": "#E8F5E9", "elevation": 4, "border_radius": 24, "padding": 20, "width": 380 },
           "children": [
             {
               "component_type": "Row",
               "properties": { "spacing": 20, "cross_axis_alignment": "center", "width": "100%" },
               "children": [
                 { "component_type": "Image", "properties": { "source": "http://img.com/1", "width": 120, "height": 120, "border_radius": 16, "content_fit": "cover" } },
                 {
                   "component_type": "Column",
                   "properties": { "flex": 1, "spacing": 8 },
                   "children": [
                     { "component_type": "Text", "properties": { "text": "Starbucks Reserve", "font_size": 22, "font_weight": "bold", "color": "#1B5E20" } },
                     { 
                       "component_type": "Row",
                       "properties": { "spacing": 12, "cross_axis_alignment": "center" },
                       "children": [
                          { "component_type": "Text", "properties": { "text": "⭐ 4.8", "font_size": 18, "color": "#F57F17", "font_weight": "bold" } },
                          { "component_type": "Text", "properties": { "text": "¥45/人", "font_size": 18, "color": "#388E3C" } }
                       ]
                     },
                     { "component_type": "Text", "properties": { "text": "营业时间: 07:00-22:00", "font_size": 16, "color": "#558B2F" } },
                     { "component_type": "Text", "properties": { "text": "123 Main St", "font_size": 16, "color": "#757575", "max_lines": 1 } }
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
               "properties": { "text": "🚗 Driving Route", "font_size": 20, "font_weight": "bold", "color": "#1565C0" } 
             },
             {
               "component_type": "Row",
               "properties": { "main_axis_alignment": "space_between", "width": "100%" },
               "children": [
                  { "component_type": "Text", "properties": { "text": "Shanghai", "font_size": 18, "font_weight": "bold", "color": "#333" } },
                  { "component_type": "Text", "properties": { "text": "➝", "font_size": 18, "color": "#999" } },
                  { "component_type": "Text", "properties": { "text": "Beijing", "font_size": 18, "font_weight": "bold", "color": "#333" } }
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
                       { "component_type": "Text", "properties": { "text": "DISTANCE", "font_size": 12, "color": "#1976D2" } },
                       { "component_type": "Text", "properties": { "text": "1214 km", "font_size": 24, "font_weight": "bold", "color": "#0D47A1" } }
                    ]
                  },
                  {
                    "component_type": "Column",
                    "properties": { "spacing": 4 },
                    "children": [
                       { "component_type": "Text", "properties": { "text": "DURATION", "font_size": 12, "color": "#1976D2" } },
                       { "component_type": "Text", "properties": { "text": "14 h", "font_size": 24, "font_weight": "bold", "color": "#0D47A1" } }
                    ]
                  }
               ]
             },
             { "component_type": "Text", "properties": { "text": "• Start from People's Square\\n• Enter G2 Highway", "font_size": 14, "color": "#546E7A", "max_lines": 10 } }
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
- 使用活泼的彩色方案
- 主背景色: '#FFFFFF' (White)
- 卡片背景: 柔和的彩色

## 布局结构
- 简洁的卡片布局
- 居中显示生成的图片
- 包含描述文字

## 示例
用户: "画一只可爱的小狗"
输出:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": { "padding": 16, "shape_border_radius": 16, "elevation": 4 },
      "children": [
        {
          "component_type": "Column",
          "properties": { "cross_axis_alignment": "center", "spacing": 12 },
          "children": [
            { "component_type": "Text", "properties": { "text": "Here is a puppy for you:", "font_size": 18, "font_weight": "bold" } },
            { 
              "component_type": "Image", 
              "properties": { 
                "source": "https://loremflickr.com/800/600/puppy",
                "width": 200,
                "height": 150,
                "content_fit": "cover",
                "border_radius": 12
              } 
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
}