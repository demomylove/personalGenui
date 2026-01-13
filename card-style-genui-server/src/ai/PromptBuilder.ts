import { DSL_SCHEMA_DESCRIPTION } from './ComponentSchema';

export class PromptBuilder {
  /**
   * Constructs a structured prompt for the LLM to generate UI DSL.
   * 
   * @param userQuery The natural language request from the user (e.g., "Show me a weather card")
   * @param dataContext The JSON data available for the UI (e.g., weather API response)
   * @returns The full prompt string
   */
  static constructPrompt(userQuery: string, dataContext: any, currentDsl?: any): string {
    const dataString = JSON.stringify(dataContext, null, 2);
    const dslString = currentDsl ? JSON.stringify(currentDsl, null, 2) : "None (Initial Generation)";

    // [Verification Log] Print server version to logs to confirm deployment
    console.log(`[PromptBuilder] Constructing Prompt... (Version: 2026-01-13-Fix-POI-80x80-V2)`);

    let styleGuide = `
# Design System & Style Guide (STRICT)
You are a Senior UI Designer known for "Apple-style" minimalism with clean, modern aesthetics.

## CRITICAL CONSTRAINT FOR WEATHER:
- **ONLY show TODAY's weather**. 
- **DO NOT generate multi-day forecasts**.
- If data contains forecast arrays, IGNORE them. Only use current/today's data.

1. **Layout**:
   - **Weather Cards**: 
     - MUST NOT fill the width. Use specific width (e.g., 380) or large horizontal margins.
     - Structure:
       - Top Row: City (Left), Date (Right, format: "YYYY-MM-DD 周X").
       - Middle Row: Weather Icon (Left), Large Temperature (Right, with "体感:XXX" below).
       - Bottom: Weather Condition (Center), then Humidity & Wind info.
2. **Typography**:
   - **City**: font_size 24, font_weight 'bold', color '#333333'.
   - **Date**: font_size 16, color '#0277BD' (Light Blue Accent).
   - **Temp**: font_size 72+, font_weight 'bold', color '#0277BD' (Light Blue Accent).
   - **Feels Like**: font_size 14, color '#0277BD'.
   - **Condition/Metadata**: font_size 16, color '#455A64'.
3. **Colors**:
   - **Weather Card Background**: '#E3F2FD' (Light Blue).
   - **Root Container**: '#FFFFFF' (White).
   - **All text**: Dark colors adapted to light blue background.

4. **Button Events**:
   - When user asks for buttons with actions (like "点击弹出提示", "click to show toast"), use on_click:
   - Button properties:
     - text: button label
     - background_color: '#007AFF' (default) or contextual color
     - text_color: '#FFFFFF'
     - border_radius: 8
     - on_click: { "action_type": "toast", "payload": { "message": "Your message" } }
   - Supported action_types: "toast" (show message), "navigate" (go to route), "call_api" (API call)
`;

    let exampleSection = `
# Example: Today's Weather Card (Light Blue Style)
User: "上海天气"
Data: { "temp": "15", "city": "上海市", "date": "2025-12-23", "weekday": "周二", "cond": "阴", "feels_like": "15", "humidity": "60%", "wind": "西风≤3级" }

**IMPORTANT**: Generate ONLY today's weather. NO forecast section. NO "未来天气" section.

Output:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": {
        "background_color": "#E3F2FD", 
        "padding": 24, 
        "shape_border_radius": 24, 
        "elevation": 8,
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
                { "component_type": "Text", "properties": { "text": "2025-12-23 周二", "font_size": 16, "color": "#0277BD" } }
              ]
            },
            { "component_type": "SizedBox", "properties": { "height": 24 } },
            {
              "component_type": "Row",
              "properties": { "main_axis_alignment": "center", "cross_axis_alignment": "center", "spacing": 16 },
              "children": [
                { "component_type": "Text", "properties": { "text": "☁️", "font_size": 64 } },
                { "component_type": "Text", "properties": { "text": "15°C", "font_size": 72, "font_weight": "bold", "color": "#0277BD" } }
              ]
            },
            { "component_type": "SizedBox", "properties": { "height": 8 } },
            { "component_type": "Text", "properties": { "text": "体感: 15°C", "font_size": 14, "color": "#0277BD" } },
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
`;

    let imageExample = `
# Example: Image Generation
User: "画一只可爱的小狗" or "Generate a puppy"
Output:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": { 
        "background_color": "#FFFFFF",
        "padding": 24, 
        "shape_border_radius": 24, 
        "elevation": 4, 
        "width": 380 
      },
      "children": [
        {
          "component_type": "Column",
          "properties": { "cross_axis_alignment": "center", "spacing": 16 },
          "children": [
            { "component_type": "Text", "properties": { "text": "为您生成的小狗:", "font_size": 20, "font_weight": "bold", "color": "#333333" } },
            { 
              "component_type": "Image", 
              "properties": { 
                "width": "100%",
                "height": 320,
                "source": "",
                "content_fit": "cover",
                "border_radius": 16,
                "color": "transparent" 
              } 
            },

          ]
        }
      ]
    }
  ]
}
`;

    let poiExample = `
# Example: POI List (Nearby Places - Compact & 380 Width)
User: "附近咖啡"
Data: { "pois": [ { "name": "星巴克甄选", "address": "中山北路123号", "rating": "4.8", "cost": "¥45", "opentimeToday": "07:00-22:00", "image": "http://img.com/1" }, { "name": "瑞幸咖啡", "address": "华山路456号", "rating": "4.5", "cost": "¥18", "opentimeToday": "08:00-20:00", "image": "http://img.com/2" } ] }
Output:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Column",
      "properties": { "spacing": 12, "padding": 16, "width": 380 }, // Width limited to 380
      "children": [
         { "component_type": "Text", "properties": { "text": "附近的精选好店", "font_size": 20, "font_weight": "bold", "color": "#2E7D32" } },
         {
           "component_type": "Card",
           "properties": { "background_color": "#E8F5E9", "elevation": 2, "border_radius": 16, "padding": 8, "width": "100%", "on_click": { "action_type": "toast", "payload": { "message": "已选择星巴克" } } },
           "children": [
             {
               "component_type": "Row",
               "properties": { "spacing": 12, "cross_axis_alignment": "center", "width": "100%" },
               "children": [
                 { "component_type": "Image", "properties": { "width": 80, "height": 80, "source": "http://img.com/1", "border_radius": 12, "content_fit": "cover" } },
                 {
                   "component_type": "Column",
                   "properties": { "flex": 1, "spacing": 4 },
                   "children": [
                     { "component_type": "Text", "properties": { "text": "星巴克甄选", "font_size": 16, "font_weight": "bold", "color": "#1B5E20" } },
                     { 
                       "component_type": "Row",
                       "properties": { "spacing": 8, "cross_axis_alignment": "center" },
                       "children": [
                          { "component_type": "Text", "properties": { "text": "⭐ 4.8", "font_size": 14, "color": "#F57F17", "font_weight": "bold" } },
                          { "component_type": "Text", "properties": { "text": "¥45/人", "font_size": 14, "color": "#388E3C" } }
                       ]
                     },
                     { "component_type": "Text", "properties": { "text": "07:00-22:00", "font_size": 12, "color": "#558B2F" } },
                     { "component_type": "Text", "properties": { "text": "中山北路123号", "font_size": 12, "color": "#757575", "max_lines": 1 } }
                   ]
                 }
               ]
             }
           ]
         },
         {
           "component_type": "Card",
           "properties": { "background_color": "#E8F5E9", "elevation": 2, "border_radius": 16, "padding": 8, "width": "100%" },
           "children": [
             {
               "component_type": "Row",
               "properties": { "spacing": 12, "cross_axis_alignment": "center", "width": "100%" },
               "children": [
                 { "component_type": "Image", "properties": { "width": 80, "height": 80, "source": "http://img.com/2", "border_radius": 12, "content_fit": "cover" } },
                 { 
                    "component_type": "Column", 
                    "properties": { "flex": 1, "spacing": 4 },
                    "children": [ 
                       { "component_type": "Text", "properties": { "text": "瑞幸咖啡", "font_size": 16, "font_weight": "bold", "color": "#1B5E20" } },
                       { "component_type": "Text", "properties": { "text": "⭐ 4.5  ¥18/人", "font_size": 14, "color": "#388E3C" } }
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

# Example: POI List (No Results)
User: "Search Coffee"
Data: { "pois": [], "count": "0", "status": "1" }
Output:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": { "background_color": "#F5F5F5", "padding": 24, "border_radius": 16, "width": 380 },
      "children": [
        { "component_type": "Text", "properties": { "text": "暂无相关数据", "font_size": 16, "color": "#666666", "text_align": "center" } }
      ]
    }
  ]
}
`;


    let routeExample = `
# Example: Driving Route Card
User: "Drive from Shanghai to Beijing"
Data: { "route": { "origin": "Shanghai", "destination": "Beijing", "distance": "1214.3km", "duration": "14 hours", "steps": ["Start from People's Square", "Enter G2 Highway", "Keep left"], "taxi_cost": "Unknown" } }
Output:
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
               "properties": { "main_axis_alignment": "space_between", "width": "100%" },
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
             { "component_type": "Text", "properties": { "text": "• 从人民广场出发\\n• 进入G2高速\\n• 保持左侧行驶", "font_size": 14, "color": "#546E7A", "max_lines": 10 } }
          ]
        }
      ]
    }
  ]
}
`;


    let textOverrideExample = `
# Example: Text Override (Renaming)
User: "把标题改成北京天气预报" (Change title to Beijing Weather Forecast)
Data: { "city": "北京市", "temp": "20" }
Current DSL: { ... "text": "北京市", "width": 380 ... }
Output:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": { 
        "background_color": "#E1F5FE", 
        "width": 380, // CRITICAL: Maintain original card width (380px) during modification. Do not change to auto.
        "padding": 24, 
        "border_radius": 24 
      },
      "children": [
        {
          "component_type": "Column",
          "children": [
             {
               "component_type": "Row",
               "children": [
                  { 
                    "component_type": "Text", 
                    "properties": { 
                      "text": "北京天气预报", 
                      "font_size": 24, 
                      "font_weight": "bold", 
                      "color": "#333333" 
                    } 
                  },
                  { "component_type": "Text", "properties": { "text": "2025-12-26 周五", "font_size": 16, "color": "#E65100" } }
               ]
             }
             // ... rest of weather card
          ]
        }
      ]
    }
  ]
}
`;

    return `
# Role
You are an expert UI Generator for a React Native application. Your job is to compile User Queries and Data into a specific JSON DSL based on the provided Component Library.

# Component Library (DSL Schema)
The following components are strictly available for use. Do NOT use any component or property not listed here.

${DSL_SCHEMA_DESCRIPTION}

${styleGuide}

${exampleSection}

${textOverrideExample}

${imageExample}

${poiExample}

${routeExample}


# Constraints & Rules
1. Output MUST be valid JSON.
2. The root object must be a single Component (e.g., Column, Card).
4. Use the provided Data Context to populate the UI.
5. **LANGUAGE CONSTRAINT**: All output text MUST be in Simplified Chinese (简体中文). Do NOT output English unless specifically requested (e.g. "translate to English").
   - Weather/Image/Chat Cards: width: 380.
   - POI/Route Cards: width: 380.
6. **CRITICAL: TEXT OVERRIDE RULE**:
   - User's explicit text request ALWAYS overrides Data Context.
7. **INTENT & CONTEXT AWARENESS**:
   - **MODIFICATIONS**: Maintain existing width and height. Do NOT revert to auto.
   - **TOPIC SWITCH**: Generate new structure with width: 380.
8. **EMPTY DATA HANDLING**:
   - If Data Context is empty (e.g. valid JSON but empty arrays/null values) for the requested topic:
   - **DO NOT** make up or hallucinate data. **DO NOT** use examples (like "Puppy" or "Starbucks") to fill the void.
   - Return a simple Card (width 380) with a Text message: "No results found" or "暂无数据".
   - **Failure to follow this will result in hallucinations.**
9. **IMAGE RULES**:
   - **Background**: Images must have color: transparent.
   - **Style**: No red backgrounds.
   - **Fallback**: Only use loremflickr if User specifically asks for a generic picture and no data is available.

10. **POI DATA BINDING**:
    - If dataContext.pois is empty, show "No results".
    - If present, map to Cards (width "100%").
    - Mapping: Title -> name, Image -> image (EXACT URL), Detail -> address.

11. **TEXT MODIFICATION PRIORITY**:
    - If User Query explicitly asks to rename or change text (e.g., "把标题改成北京市天气", "change title to Custom Text"), you MUST use the string provided by the user EXACTLY.
    - **OVERRIDE RULE**: User's text override > Data Context value. 
    - Example: User "title to Beijing Weather", Data "Beijing" -> Result "Beijing Weather". DO NOT use "Beijing".
    
12. **POI THUMBNAILS**:
    - Images in POI lists or cards MUST have explicit "width" and "height" properties (e.g. 80). 
    - Do not use "100%" or auto for these thumbnails.

13. **POI/PLACE LIST RULES (STRICT)**:
    - **ALL** lists of places (hotels, restaurants, attractions, shops, etc.) **MUST** use the "Coffee Shop" style.
    - **Structure**: 
      - Root: Center -> Column (width: 380).
      - Items: Card (width: "100%", color: "#E8F5E9", radius: 16) -> Row (spacing: 12) -> [Image (80x80, radius 12), Column (flex: 1)].
    - **Colors**: ALWAYS use '#E8F5E9' (Light Green) for the item background.
    - **Images**: MUST have 'width: 80' and 'height: 80'.
    - **NO** other styles for places. Do NOT use white cards for hotels. Use the Green/Coffee style.

# Context
## User Query
"${userQuery}"

## Data Context
${dataString}

## Current UI DSL
${dslString}

# Output Format
Return ONLY the JSON.
`;
  }
}
