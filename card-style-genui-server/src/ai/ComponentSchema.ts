/**
 * ComponentSchema.ts
 *
 * Defines the available UI components and their properties for the Generative UI system.
 * UPDATED: Aligned with WidgetMapper's expected structure (snake_case, component_type, properties).
 */

export const DSL_SCHEMA_DESCRIPTION = `
type Component = {
  component_type: "Column" | "Row" | "Text" | "Image" | "Card" | "SizedBox" | "Button" | "Align" | "Center" | "ConstrainedBox" | "Padding" | "Icon" | "IconButton" | "Slider" | "LinearGradient";
  properties?: Record<string, any>;
  children?: Component[];
}

AVAILABLE COMPONENTS & PROPERTIES:

1. Column
   - properties: { 
       main_axis_alignment: 'start'|'center'|'spacebetween', 
       cross_axis_alignment: 'start'|'center',
       padding: number,
       background_color: string,
       flex: number,
       flex_grow: number,
       flex_shrink: number,
       width: number | 'auto',
       height: number | 'auto',
       margin: number,
       border_radius: number,
       padding_top: number,
       padding_bottom: number,
       padding_left: number,
       padding_right: number
     }
   - children: Component[]

2. Row
   - properties: { 
       main_axis_alignment: 'start'|'center'|'spacebetween', 
       cross_axis_alignment: 'center'|'end',
       padding: number,
       spacing: number,
       flex: number,
       flex_grow: number,
       flex_shrink: number,
       width: number | 'auto',
       height: number | 'auto',
       margin: number,
       border_radius: number,
       padding_top: number,
       padding_bottom: number,
       padding_left: number,
       padding_right: number
     }
   - children: Component[]

3. Text
   - properties: { 
       text: string (REQUIRED), 
       font_size: number, 
       color: string (hex), 
       font_weight: 'normal'|'bold'|'w500'|'w600'|'w700',
       max_lines: number,
       line_height: number,
       text_align: 'left'|'center'|'right',
       padding: number,
       margin_vertical: number,
       margin_horizontal: number,
       background_color: string,
       border_radius: number,
       text_binding: string (data binding),
       color_binding: string (color binding),
       icon: string (icon name)
     }
   - children: []

4. Image
   - properties: { 
       source: string (REQUIRED, URL), 
       width: number | 'infinity', 
       height: number, 
       border_radius: number,
       color: string (background),
       resize_mode: 'cover'|'contain'|'stretch'|'center'|'repeat'|'none',
       content_fit: 'cover'|'contain'|'fill'|'fit_width'|'fit_height'|'none',
       margin: number,
       border_width: number,
       border_color: string
     }
   - children: []

5. Card
   - properties: { 
       background_color: string (hex), 
       padding: number, 
       border_radius: number, 
       elevation: number,
       margin: number,
       shadow_opacity: number,
       shadow_radius: number,
       border_width: number,
       border_color: string,
       on_click: ActionObject
     }
   - children: Component[]

6. SizedBox
   - properties: { width: number, height: number, margin: number }
   - children: []

7. Button
   - properties: { 
       text: string (REQUIRED),
       background_color: string (hex, default: '#007AFF'),
       text_color: string (hex, default: '#FFFFFF'),
       font_size: number (default: 16),
       padding: number (default: 12),
       border_radius: number (default: 8),
       on_click: ActionObject (event handler),
       font_weight: 'normal'|'bold',
       min_height: number,
       width: number | 'auto',
       border_width: number,
       border_color: string,
       elevation: number,
       active_opacity: number,
       delay_press_in: number,
       disabled: boolean
     }
   - children: []

8. Align
   - properties: { 
       alignment: 'center'|'centerleft'|'centerright'|'topright'|'bottomcenter',
       width: number | 'auto',
       height: number | 'auto',
       margin: number
     }
   - children: Component[]

9. Center
   - properties: { 
       width: number | 'auto',
       height: number | 'auto',
       margin: number
     }
   - children: Component[]

10. ConstrainedBox
    - properties: { 
        max_width: number,
        max_height: number,
        min_width: number,
        min_height: number,
        max_width_ratio: number,
        max_height_ratio: number,
        margin: number
      }
    - children: Component[]

11. Padding
    - properties: { 
        padding: number,
        padding_top: number,
        padding_bottom: number,
        padding_left: number,
        padding_right: number,
        margin: number
      }
    - children: Component[]

12. Icon
    - properties: { 
        icon: string (icon name),
        size: number (default: 24),
        color: string (hex),
        margin: number,
        color_binding: string (color binding),
        icon_binding: string (icon binding)
      }
    - children: []

13. IconButton
    - properties: { 
        icon: string (icon name),
        size: number,
        color: string (hex),
        background_color: string,
        padding: number,
        border_radius: number,
        on_click: ActionObject,
        active_opacity: number,
        delay_press_in: number,
        disabled: boolean,
        margin: number
      }
    - children: []

14. Slider
    - properties: { 
        min_value: number,
        max_value: number,
        value: number,
        min_track_color: string,
        max_track_color: string,
        thumb_color: string,
        step: number,
        width: number | 'auto',
        height: number,
        on_value_change: ActionObject
      }
    - children: []

15. LinearGradient
    - properties: { 
        start_color: string,
        end_color: string,
        start_x: number,
        start_y: number,
        end_x: number,
        end_y: number,
        locations: number[],
        flex: number,
        border_radius: number,
        padding: number,
        margin: number,
        width: number | 'auto',
        height: number | 'auto',
        align_items: string,
        justify_content: string
      }
    - children: Component[]


# Event Actions (ActionObject)
When a component needs to trigger an action on click, use on_click property:
{
  "on_click": {
    "action_type": "toast" | "navigate" | "call_api" | "open_music_app",
    "payload": {
      "message": string,     // for toast
      "route": string,       // for navigate
      "api_endpoint": string // for call_api
    }
  }
}

# Data Binding
Supports data binding with placeholder syntax:
{
  "text": "Hello, {{user.name}}!",
  "color_binding": "weather.status",
  "text_binding": "product.title"
}

Example Button with Toast:
{
  "component_type": "Button",
  "properties": {
    "text": "点击我",
    "background_color": "#FF6B35",
    "on_click": {
      "action_type": "toast",
      "payload": { "message": "按钮被点击了！" }
    }
  }
}
`;
