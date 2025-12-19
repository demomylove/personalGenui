import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  Switch,
} from 'react-native';
import VoiceInputModule, { VoiceInputEvents } from '../native/VoiceInput';
import PermissionManager from '../utils/Permissions';

interface VoiceInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: (text?: string) => void;
  style?: ViewStyle;
  disabled?: boolean;
  asrType?: string;
  duplexSwitch?: boolean;
  hotwordJsonStr?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  value = '',
  onChangeText,
  placeholder = '点击麦克风说话',
  onSubmitEditing,
  style,
  disabled = false,
  asrType = 'unisound',
  duplexSwitch = false,
  hotwordJsonStr = '{"hot":[]}',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const listenersRef = useRef<any[]>([]);

  // 初始化ASR
  useEffect(() => {
    const initializeAsr = async () => {
      try {
        setIsInitializing(true);
        await VoiceInputModule.initAsr(asrType, duplexSwitch, hotwordJsonStr);
        setIsInitialized(true);
      } catch (error) {
        console.error('ASR初始化失败:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAsr();

    // 清理函数
    return () => {
      // 移除所有事件监听器
      listenersRef.current.forEach(listener => listener.remove());
      listenersRef.current = [];

      // 释放ASR资源
      if (isInitialized) {
        VoiceInputModule.releaseAsr().catch(console.error);
      }
    };
  }, []);

  // 添加事件监听器
  useEffect(() => {
    if (!isInitialized) return;

    const onAsrBeginListener = VoiceInputModule.addEventListener('onAsrBegin', () => {
      console.log('ASR开始识别');
      setInterimText('');
    });

    const onAsrResultListener = VoiceInputModule.addEventListener('onAsrResult', (event) => {
      console.log('ASR识别结果:', event.result);
      setInterimText(event.result);
    });

    const onAsrEndListener = VoiceInputModule.addEventListener('onAsrEnd', (event) => {
      console.log('ASR识别结束:', event.finalResult);
      setInterimText('');
      if (onChangeText && event.finalResult) {
        onChangeText(event.finalResult);
      }
      // 立即提交，不使用setTimeout
      if (onSubmitEditing && event.finalResult) {
        onSubmitEditing(event.finalResult);
      }
      setIsListening(false);

      // 注意：不再在这里手动重启ASR，因为Android端已经在持续模式下自动重启
      // 这样可以避免重复启动导致的冲突
    });

    const onAsrErrorListener = VoiceInputModule.addEventListener('onAsrError', (event) => {
      console.error('ASR识别错误:', event.message);
      setIsListening(false);
      setInterimText('');

      // 注意：不再在这里手动重启ASR，因为Android端已经在持续模式下自动处理错误
      // 如果Android端自动重启失败，用户可以手动切换开关来重启
    });

    // 保存监听器引用以便清理
    listenersRef.current = [
      onAsrBeginListener,
      onAsrResultListener,
      onAsrEndListener,
      onAsrErrorListener,
    ];

    return () => {
      listenersRef.current.forEach(listener => listener.remove());
      listenersRef.current = [];
    };
  }, [isInitialized, onChangeText, onSubmitEditing, voiceEnabled]);

  // 开始语音识别
  const startListening = async () => {
    if (!isInitialized || isListening) return;

    try {
      setIsListening(true);
      await VoiceInputModule.startContinuousAsr();
    } catch (error) {
      console.error('启动ASR失败:', error);
      setIsListening(false);
    }
  };

  // 停止语音识别
  const stopListening = async () => {
    // 即使isListening为false也要尝试停止，因为可能存在后台识别
    try {
      await VoiceInputModule.stopContinuousAsr();
      setIsListening(false);
      setInterimText(''); // 清除临时文本
    } catch (error) {
      console.error('停止ASR失败:', error);
    }
  };

  // 语音开关切换
  const toggleVoiceSwitch = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    if (enabled) {
      // 开启语音识别
      startListening();
    } else {
      // 关闭语音识别
      stopListening();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {interimText || value || placeholder}
        </Text>
      </View>

      <View style={styles.controlContainer}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>语音识别</Text>
          <Switch
            value={voiceEnabled}
            onValueChange={toggleVoiceSwitch}
            disabled={disabled || isInitializing || !isInitialized}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={voiceEnabled ? '#ffffff' : '#f4f3f4'}
          />
        </View>

      </View>
    </View>

  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 40,
  },
  statusText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  indicator: {
    marginLeft: 10,
  },
  controlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  micButtonActive: {
    backgroundColor: '#FF3B30',
  },
  micButtonDisabled: {
    backgroundColor: '#ccc',
  },
  micIcon: {
    fontSize: 20,
  },
});

export default VoiceInput;