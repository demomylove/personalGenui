import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, Button, Alert, FlatList } from 'react-native';
import { AGUIClient } from '../utils/AGUIClient';
import { isWeatherIntent, fetchWeatherForPrompt } from '../api/weather';
import { renderComponent } from '../dsl/DslRenderer';
import TaskCard, { TaskStatus } from '../components/TaskCard';
import VoiceInput from '../components/VoiceInput';
import RobotIcon from '../components/RobotIcon';
import UserIcon from '../components/UserIcon';
import { PermissionStatus } from '../utils/Permissions';

// 统一服务器地址（与 GenUITestScreen 保持一致）
const SERVER_URL = 'http://10.210.0.58:3001/api/chat';

interface MainScreenProps {
  initialPermissionStatus?: PermissionStatus | null;
  onPermissionRequest?: () => Promise<PermissionStatus>;
}

export default function MainScreen({
  initialPermissionStatus = null,
  onPermissionRequest
}: MainScreenProps) {
  const client = useRef(new AGUIClient(SERVER_URL)).current;
  const flatListRef = useRef<FlatList>(null);
  const [status, setStatus] = useState<TaskStatus>('thinking');
  const [statusText, setStatusText] = useState('');
  const [currentDsl, setCurrentDsl] = useState<any>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; dsl?: any }>>([]);
  const [input, setInput] = useState('');
  // 初始不自动加载，等用户点击"生成UI"
  const [loading, setLoading] = useState(false);
  // 新增：维护完整的 Agent 状态，用于渲染时的数据绑定
  const [agentState, setAgentState] = useState<any>({});

  const send = async (prompt: string) => {
    setLoading(true);
    setStatus('thinking');
    setStatusText('');
    setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    try {
      let dataContext: any = { title: 'demo' };
      if (isWeatherIntent(prompt)) {
        // 先真实请求天气数据，放入 dataContext 提供给后端生成更贴合的数据 UI
        const weather = await fetchWeatherForPrompt(prompt);
        if (weather) {
          dataContext.weather = weather;
        }
      }
      
      // 更新本地状态，以便立即可以使用（AGUIClient 也会合并）
      const newAgentState = { ...agentState, ...{ dataContext } };
      setAgentState(newAgentState);
      
      await client.sendMessage(prompt, { dataContext });
    } catch (e: any) {
      Alert.alert('请求失败', e.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    client.setListeners({
      onMessageDelta: (delta) => {
        setStatusText((prev) => prev + delta);
      },
      onStateUpdate: (newState) => {
        // 同步最新的 Agent 状态（包含 dataContext）
        console.log('[MainScreen] State Update:', JSON.stringify(newState.dataContext || {}));
        setAgentState(newState);
        
        if (newState.dsl) {
          setCurrentDsl(newState.dsl);
          setStatus('drawing');
        }
      },
      onToolStart: () => { },
      onToolEnd: () => { },
      onError: (err) => {
        setStatus('thinkingComplete');
        Alert.alert('错误', err);
        setLoading(false);
      },
      onDone: () => {
        setStatus('completed');
      },
    });

    // 不自动发起请求；等待用户点击按钮
    return () => client.close();
  }, []);

  useEffect(() => {
    // 当状态变为completed时，将DSL内容添加到消息列表
    if (status === 'completed' && currentDsl) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', dsl: currentDsl }
      ]);
      setCurrentDsl(null);
      setLoading(false);
    }
    // 如果没有DSL内容，不添加任何消息，只更新状态
    else if (status === 'completed' && !currentDsl) {
      setLoading(false);
    }
  }, [status, currentDsl]);

  // 当消息列表更新时，滚动到底部
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // 当加载状态变化时，滚动到底部
  useEffect(() => {
    if (loading && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [loading]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Card Style GenUI</Text>
      </View>

      {/* 对话框区域 */}
      <FlatList
        ref={flatListRef}
        style={styles.chat}
        data={messages}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={({ item, index }) => (
          <View>
            {/* 显示消息气泡和图标 */}
            <View style={item.role === 'user' ? styles.userMessageContainer : styles.aiMessageContainer}>
              {item.role === 'assistant' && <RobotIcon size={32} />}
              {/* 只有当消息内容不为空或者是用户消息时，才显示消息气泡 */}
              {(item.content.trim() || item.role === 'user') && (
                <View style={[styles.bubble, item.role === 'user' ? styles.bubbleMe : styles.bubbleAI]}>
                  <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextMe]}>{item.content}</Text>
                </View>
              )}
              {item.role === 'user' && <UserIcon size={32} />}
            </View>
            {/* 如果消息包含DSL，则在消息下方渲染DSL组件 */}
            {item.dsl && (
              <View style={styles.dslContainer}>
                {/* 使用 agentState.dataContext 作为数据上下文，而非硬编码的 title: demo */}
                {renderComponent(item.dsl, agentState.dataContext || agentState || {}, () => { })}
              </View>
            )}
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <RobotIcon size={32} />
              <View style={styles.loadingContent}>
                <ActivityIndicator size="small" color="#1677ff" />
                <TaskCard status={status} />
                {!!statusText && <Text style={styles.hint}>{statusText}</Text>}
              </View>
            </View>
          ) : null
        }
        onContentSizeChange={() => {
          // 当内容大小改变时，滚动到底部
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />

      {/* 输入区 */}
      <View style={styles.inputRow}>
        <VoiceInput
          style={styles.voiceInput}
          value={input}
          onChangeText={setInput}
          placeholder="请开启语音识别，例如：上海今天的天气怎么样"
          onSubmitEditing={(text) => {
            const content = text || input;
            if (content.trim()) {
              send(content.trim());
              setInput('');
            }
          }}
          initialPermissionStatus={initialPermissionStatus}
          onPermissionRequest={onPermissionRequest}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E9EB',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333'
  },
  chat: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  userMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginVertical: 6,
    paddingRight: 8,
  },
  aiMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    marginVertical: 6,
    paddingLeft: 8,
  },
  bubble: {
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    maxWidth: '70%',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: '#B3D9FF',
    borderBottomRightRadius: 6,
  },
  bubbleAI: {
    backgroundColor: '#E9E9EB',
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  bubbleTextMe: {
    color: '#333333',
  },
  dslContainer: {
    marginVertical: 8,
    marginLeft: 48, // 与机器人图标对齐
    marginRight: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#666'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E9E9EB',
    paddingTop: 16,
  },
  voiceInput: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
    paddingLeft: 8,
  },
  loadingContent: {
    flex: 1,
    marginLeft: 4,
  },
});
