import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import VoiceInputModule, { VoiceInputEvents } from '../native/VoiceInput';
import PermissionManager, { PermissionStatus } from '../utils/Permissions';

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
  initialPermissionStatus?: PermissionStatus | null;
  onPermissionRequest?: () => Promise<PermissionStatus>;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  value = '',
  onChangeText,
  placeholder = '点击麦克风说话',
  onSubmitEditing,
  style,
  disabled = false,
  asrType = 'unisound',
  duplexSwitch = true,
  hotwordJsonStr = '{"hot":[]}',
  initialPermissionStatus = null,
  onPermissionRequest,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(initialPermissionStatus);
  const [permissionLoading, setPermissionLoading] = useState(false);
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
      await VoiceInputModule.startAsr();
    } catch (error) {
      console.error('启动ASR失败:', error);
      setIsListening(false);
    }
  };

  // 停止语音识别
  const stopListening = async () => {
    // 即使isListening为false也要尝试停止，因为可能存在后台识别
    try {
      await VoiceInputModule.stopAsr();
      setIsListening(false);
      setInterimText(''); // 清除临时文本
    } catch (error) {
      console.error('停止ASR失败:', error);
    }
  };

  // 检查并请求权限
  const checkAndRequestPermission = async (showRationale: boolean = true): Promise<boolean> => {
    // 如果已经有权限，直接返回
    if (permissionStatus === PermissionStatus.GRANTED) {
      return true;
    }

    // 如果没有权限状态，先检查
    if (permissionStatus === null) {
      const status = await PermissionManager.checkRecordAudioPermission();
      setPermissionStatus(status);
      
      if (status === PermissionStatus.GRANTED) {
        return true;
      }
    }

    // 如果权限被拒绝或被阻止，尝试请求权限
    if (permissionStatus === PermissionStatus.DENIED || permissionStatus === PermissionStatus.BLOCKED) {
      setPermissionLoading(true);
      try {
        // 对于DENIED状态，显示权限说明
        if (permissionStatus === PermissionStatus.DENIED && showRationale) {
          const userAgreed = await PermissionManager.showPermissionRationale();
          if (!userAgreed) {
            return false;
          }
        }

        let status: PermissionStatus;
        
        if (onPermissionRequest) {
          status = await onPermissionRequest();
        } else {
          status = await PermissionManager.requestRecordAudioPermission();
        }
        
        setPermissionStatus(status);
        
        if (status === PermissionStatus.GRANTED) {
          return true;
        } else if (status === PermissionStatus.BLOCKED) {
          // 权限被永久拒绝，显示去设置的提示
          const goToSettings = await PermissionManager.showPermissionDeniedAlert(true);
          if (goToSettings) {
            // 用户点击了去设置，等待用户从设置返回后再次检查权限
            setTimeout(async () => {
              const newStatus = await PermissionManager.checkRecordAudioPermission();
              setPermissionStatus(newStatus);
            }, 1000);
          }
        } else if (status === PermissionStatus.DENIED && showRationale) {
          // 权限再次被拒绝，提示用户可以重试
          Alert.alert(
            '权限请求',
            '录音权限被拒绝，您可以稍后再次尝试授权。',
            [
              {
                text: '确定',
                style: 'default',
              },
            ]
          );
        }
        
        return false;
      } catch (error) {
        console.error('权限请求失败:', error);
        Alert.alert(
          '错误',
          '权限请求过程中发生错误，请重试。',
          [
            {
              text: '确定',
              style: 'default',
            },
          ]
        );
        return false;
      } finally {
        setPermissionLoading(false);
      }
    }
    
    return false;
  };

  // 语音开关切换
  const toggleVoiceSwitch = async (enabled: boolean) => {
    if (enabled) {
      // 开启语音识别前先检查权限
      const hasPermission = await checkAndRequestPermission();
      if (hasPermission) {
        setVoiceEnabled(true);
        startListening();
      } else {
        // 权限获取失败，保持开关关闭状态
        setVoiceEnabled(false);
      }
    } else {
      // 关闭语音识别
      setVoiceEnabled(false);
      stopListening();
    }
  };

  // 获取权限状态文本
  const getPermissionStatusText = () => {
    if (permissionStatus === null) return '';
    switch (permissionStatus) {
      case PermissionStatus.GRANTED:
        return '';
      case PermissionStatus.DENIED:
        return '需要麦克风权限';
      case PermissionStatus.BLOCKED:
        return '权限被拒绝，请在设置中开启';
      case PermissionStatus.UNAVAILABLE:
        return '权限不可用';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {interimText || value || placeholder}
        </Text>
        {permissionLoading && (
          <ActivityIndicator
            size="small"
            color="#007AFF"
            style={styles.permissionIndicator}
          />
        )}
      </View>

      <View style={styles.controlContainer}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>语音识别</Text>
          <Switch
            value={voiceEnabled}
            onValueChange={toggleVoiceSwitch}
            disabled={disabled || isInitializing || !isInitialized || permissionLoading}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={voiceEnabled ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        
        {getPermissionStatusText() ? (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => checkAndRequestPermission()}
            disabled={permissionLoading}
          >
            <Text style={styles.permissionButtonText}>
              {permissionStatus === PermissionStatus.BLOCKED ? '去设置' : '授权'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      
      {getPermissionStatusText() && (
        <Text style={styles.permissionStatusText}>
          {getPermissionStatusText()}
        </Text>
      )}
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
  permissionIndicator: {
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
  permissionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    marginLeft: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  permissionStatusText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
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