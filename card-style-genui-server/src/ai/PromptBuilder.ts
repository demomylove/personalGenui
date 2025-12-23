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
1. **Layout**:
   - **Weather Cards**: 
     - MUST NOT fill the width. Use specific width (e.g., 340) or large horizontal margins.
     - Structure:
       - Top Row: City (Left), Date (Right).
       - Middle Row: Icon (Left), Temperature Column (Right).
       - Bottom: Condition (Center).
2. **Typography**:
   - **City**: font_size 24, font_weight 'bold'.
   - **Temp**: font_size 72+, font_weight 'bold', color '#E65100' (Deep Orange).
   - **Date/Metadata**: font_size 16, color '#BF360C'.
3. **Colors**:
   - **Weather Card Background**: Inner Card: '#FFCC80' (Medium Orange). Root Container: '#FFFFFF' (White/Transparent).
   - **Text**: Adapted to background.
`;

    let exampleSection = `
# Example: Sunny Weather Card (Compact)
User: "Beijing Weather"
Data: { "temp": "26", "city": "Beijing", "date": "2025-12-23 Tue", "cond": "Sunny", "feels_like": "28" }
Output:
{
  "component_type": "Center",
  "properties": { "background_color": "#FFFFFF" },
  "children": [
    {
      "component_type": "Card",
      "properties": {
        "background_color": "#FFB74D", 
        "padding": 24, 
        "shape_border_radius": 24, 
        "elevation": 8,
        "width": 360
      },
      "children": [
        {
          "component_type": "Column",
          "properties": { "cross_axis_alignment": "start" },
          "children": [
            {
              "component_type": "Row",
              "properties": { "main_axis_alignment": "space_between", "width": "100%" },
              "children": [
                { "component_type": "Text", "properties": { "text": "Beijing", "font_size": 24, "font_weight": "bold", "color": "#333333" } },
                { "component_type": "Text", "properties": { "text": "2025-12-23 Tue", "font_size": 14, "color": "#666666" } }
              ]
            },
            { "component_type": "SizedBox", "properties": { "height": 16 } },
            {
              "component_type": "Row",
              "properties": { "main_axis_alignment": "space_around", "width": "100%" },
              "children": [
                { "component_type": "Text", "properties": { "text": "☀️", "font_size": 64, "color": "#FFC107" } },
                {
                   "component_type": "Column",
                   "properties": { "cross_axis_alignment": "end" },
                   "children": [
                     { "component_type": "Text", "properties": { "text": "26°C", "font_size": 64, "font_weight": "bold", "color": "#FF9800" } },
                     { "component_type": "Text", "properties": { "text": "Feels 28°C", "font_size": 16, "color": "#5D4037" } }
                   ]
                }
              ]
            },
            { "component_type": "SizedBox", "properties": { "height": 16 } },
            { 
               "component_type": "Center", 
               "properties": {},
               "children": [
                 { "component_type": "Text", "properties": { "text": "Sunny", "font_size": 18, "font_weight": "bold", "color": "#4E342E" } }
               ]
            }
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

# Constraints & Rules
1. Output MUST be valid JSON.
2. The root object must be a single Component (e.g., Column, Card).
3. Do NOT include markdown code blocks (like triple backticks json). Just return the raw JSON string.
4. Use the provided Data Context to populate the UI.
5. If the data is an array, you likely need a Column or Row to map over it, but the output must still be a static DSL structure (or specific list components if available).
6. **Context Awareness**: You are provided with the **Current UI DSL**. If the User Query implies a modification (e.g., "change color to red", "add a button"), you MUST return the COMPLETE updated DSL based on the Current DSL. Do NOT return a diff. Return the full new state.

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
