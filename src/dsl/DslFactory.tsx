import React from 'react';
import { Text } from 'react-native';
import { renderComponent } from './DslRenderer';

/**
 * 将原始 DSL 字符串转换为渲染后的 React Native 组件的工厂。
 * 处理不同领域（天气、音乐、POI）的高级解析逻辑。
 */
export const DslFactory = {
  // New: auto-detect structured JSON DSL vs legacy string DSL
  parseAny: async (input: string, onInteraction?: (action: any) => void): Promise<React.ReactNode> => {
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const obj = JSON.parse(trimmed);
          // Case A: wrapper { component, data }
          if (obj && obj.component && obj.data) {
            return renderComponent(obj.component, obj.data, onInteraction);
          }
          // Case B: direct component JSON
          if (obj && obj.component_type) {
            return renderComponent(obj, {}, onInteraction);
          }
        } catch (e) {
          console.error('[DslFactory] JSON parse failed', e);
        }
      }
    }
    // Fallback if not valid JSON
    return <Text>Invalid DSL Format (JSON Expected)</Text>;
  },
};
