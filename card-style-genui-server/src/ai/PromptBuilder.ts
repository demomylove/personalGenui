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

                 let styleGuide = `
# Design System & Style Guide (STRICT)
You are a Senior UI Designer known for "Apple-style" minimalism but with vibrant, context-aware aesthetics.

## CRITICAL CONSTRAINT FOR WEATHER:
- **ONLY show TODAY's weather**. 
- **DO NOT generate multi-day forecasts** (no "未来天气预报", no "未来四天", no forecast list).
- If data contains forecast arrays, IGNORE them. Only use current/today's data.

1. **Layout**:
   - **Weather Cards**: 
     - MUST NOT fill the width. Use specific width (e.g., 340) or large horizontal margins.
     - Structure:
       - Top Row: City (Left), Date (Right, format: "YYYY-MM-DD 周X" style with orange color).
       - Middle Row: Weather Icon (Left), Large Temperature (Right, with "体感:XXX" below).
       - Bottom: Weather Condition (Center), then Humidity & Wind info.
2. **Typography**:
   - **City**: font_size 24, font_weight 'bold', color '#333333'.
   - **Date**: font_size 16, color '#E65100' (Deep Orange).
   - **Temp**: font_size 72+, font_weight 'bold', color '#E65100' (Deep Orange).
   - **Feels Like**: font_size 14, color '#E65100'.
   - **Condition/Metadata**: font_size 16, color '#5D4037'.
3. **Colors**:
   - **Weather Card Background**: '#FFCC80' (Medium Orange).
   - **Root Container**: '#FFFFFF' (White).
   - **All text**: Dark colors adapted to orange background.

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
# Example: Today's Weather Card (Orange Style)
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
`;
    
    let poiExample = `
# Example: POI List (Nearby Places - Large & Green Style)
User: "Nearby Coffee"
Data: { "pois": [ { "name": "Starbucks Reserve", "address": "123 Main St (Near Park)", "rating": "4.8", "cost": "¥45", "opentimeToday": "07:00-22:00", "image": "http://img.com/1" }, { "name": "Luckin Coffee", "address": "456 Side St", "rating": "4.5", "cost": "¥18", "opentimeToday": "08:00-20:00", "image": "http://img.com/2" } ] }
Output:
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
           "properties": { "background_color": "#E8F5E9", "elevation": 4, "border_radius": 24, "padding": 20, "width": 380, "on_click": { "action_type": "toast", "payload": { "message": "Selected Starbucks" } } },
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
                     { "component_type": "Text", "properties": { "text": "123 Main St (Near Park)", "font_size": 16, "color": "#757575", "max_lines": 1 } }
                   ]
                 }
               ]
             }
           ]
         },
         {
           "component_type": "Card",
           "properties": { "background_color": "#E8F5E9", "elevation": 4, "border_radius": 24, "padding": 20, "width": 380 },
           "children": [
             {
               "component_type": "Row",
               "properties": { "spacing": 20, "cross_axis_alignment": "center", "width": "100%" },
               "children": [
                 { "component_type": "Image", "properties": { "source": "http://img.com/2", "width": 120, "height": 120, "border_radius": 16, "content_fit": "cover" } },
                 { 
                    "component_type": "Column", 
                    "properties": { "flex": 1, "spacing": 8 },
                    "children": [ 
                       { "component_type": "Text", "properties": { "text": "Luckin Coffee", "font_size": 22, "font_weight": "bold", "color": "#1B5E20" } },
                       { "component_type": "Text", "properties": { "text": "⭐ 4.5  ¥18/人", "font_size": 18, "color": "#388E3C" } }
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
             { "component_type": "Text", "properties": { "text": "• Start from People's Square\\n• Enter G2 Highway\\n• Keep left", "font_size": 14, "color": "#546E7A", "max_lines": 10 } }
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

${imageExample}

${poiExample}

${routeExample}

# Constraints & Rules
1. Output MUST be valid JSON.
2. The root object must be a single Component (e.g., Column, Card).
3. Do NOT include markdown code blocks (like triple backticks json). Just return the raw JSON string.
4. Use the provided Data Context to populate the UI.
5. If the data is an array, you likely need a Column or Row to map over it, but the output must still be a static DSL structure (or specific list components if available).
6. **Context Awareness for MODIFICATIONS**:
   - If User Query implies a style modification (e.g., "change color to green", "change background"), modify the INNER Card's background_color, NOT the outer Container/Center.
   - The ROOT container (Center/Column) should ALWAYS keep background_color as '#FFFFFF' or transparent.
   - Return the COMPLETE updated DSL. Do NOT return a diff.
7. **INTENT & CONTEXT AWARENESS (CRITICAL)**:
   - **STEP 1: Evaluate Intent**: Determine if the User Query is a **MODIFICATION** of the current topic OR a **TOPIC SWITCH**.
   - **CASE A: MODIFICATION (Same Topic/Visual Tweak)**:
     - **Triggers**: "Change color", "Make text larger", "Add a button", "Show detail", "Next song" (if music), "Tomorrow's weather" (if weather).
     - **Action**: **UPDATE** the Current UI DSL. Keep the existing structure/container. Minimize disruption.
   - **CASE B: TOPIC SWITCH (New Content Domain)**:
     - **Triggers**: Current is **Weather** -> User asks for **"Cat"** / **"Music"** / **"Joke"**.
     - **Action**: **IGNORE** the old DSL. Generate a **COMPLETELY NEW** Card structure for the new topic.
   - **CASE C: EXPLICIT RESET**:
     - **Triggers**: "reset", "cancel", "new", "restart", "start over".
     - **Action**: Generate NEW.
   - **Examples**:
     - Context: Weather Card. User: "Make it blue". -> **Modify** (Keep weather, change bg).
     - Context: Weather Card. User: "Draw a cat". -> **New** (Discard weather, show cat).
8. **CRITICAL FOR WEATHER**: NEVER generate forecast sections. Only today's weather.
9. **BUTTON GENERATION RULE**: 
   - ONLY generate Button components when user EXPLICITLY asks for buttons (e.g., "添加一个按钮", "生成一个点击弹出toast的按钮").
   - Do NOT automatically add buttons like "点击查看更多", "查看详情" unless user specifically requests them.
   - Keep cards simple and content-focused by default.
   
10. **IMAGE GENERATION**:
    - If user asks to "generate an image", "draw a picture", "show me a photo" OR "generate a card of [object]" (e.g., "cat", "city", "flower", "Ferrari"):
    - You MUST include a visual \`Image\` component in the Card.
    - Create a Card with an Image component.
    - PROTOCOL: Use \`https://loremflickr.com/800/600/<keyword_in_english>\`
    - Example: User "Draw a cat" -> Image URL "https://loremflickr.com/800/600/cat"
    - Translate the keyword to English if the user input is in another language (e.g., "小狗" -> "puppy" or "dog").

11. **TEXT MODIFICATION PRIORITY**:
    - If User Query explicitly asks to rename or change text (e.g., "把标题改成北京市天气", "change title to Custom Text"), you MUST use the string provided by the user EXACTLY.
    - **OVERRIDE RULE**: User's text override > Data Context value. 
    - Example: User "title to Beijing Weather", Data "Beijing" -> Result "Beijing Weather". DO NOT use "Beijing".

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
