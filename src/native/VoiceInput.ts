import { NativeModules, NativeEventEmitter } from 'react-native';

const { VoiceInput } = NativeModules;

// 定义事件类型
export interface VoiceInputEvents {
  onAsrBegin: void;
  onAsrResult: { result: string };
  onAsrEnd: { finalResult: string };
  onAsrError: { code: number; message: string };
}

// 避免 Native Module 未链接导致红屏或白屏 Crash
if (!VoiceInput) {
  console.error('[VoiceInput] Native Module Not Found! Check linking or rebuild.');
}

// 创建事件发射器 (Safe Mock)
const voiceInputEmitter = VoiceInput 
  ? new NativeEventEmitter(VoiceInput)
  : { addListener: () => { return { remove: () => {} } }, removeAllListeners: () => {} } as any;

// 定义VoiceInput API
export class VoiceInputModule {
  /**
   * 初始化ASR
   * @param asrType ASR类型，如'unisound'或'iflytek'
   * @param duplexSwitch 是否启用全双工模式
   * @param hotwordJsonStr 热词JSON字符串
   */
  static async initAsr(
    asrType: string = 'unisound',
    duplexSwitch: boolean = true,
    hotwordJsonStr: string = '{"hot":[]}'
  ): Promise<string> {
    if (!VoiceInput) { console.warn('VoiceInput native module missing'); return ''; }
    return VoiceInput.initAsr(asrType, duplexSwitch, hotwordJsonStr);
  }

  /**
   * 开始ASR识别
   * @returns Promise<string> 识别结果
   */
  static async startAsr(): Promise<string> {
    if (!VoiceInput) return '';
    return VoiceInput.startAsr();
  }

  /**
   * 停止ASR识别
   */
  static async stopAsr(): Promise<string> {
    if (!VoiceInput) return '';
    return VoiceInput.stopAsr();
  }

  /**
   * 释放ASR资源
   */
  static async releaseAsr(): Promise<string> {
    if (!VoiceInput) return '';
    return VoiceInput.releaseAsr();
  }

  /**
   * 添加事件监听器
   * @param eventType 事件类型
   * @param listener 监听器函数
   */
  static addEventListener<K extends keyof VoiceInputEvents>(
    eventType: K,
    listener: (event: VoiceInputEvents[K]) => void
  ) {
    return voiceInputEmitter.addListener(eventType, listener);
  }

  /**
   * 移除所有事件监听器
   */
  static removeAllListeners() {
    voiceInputEmitter.removeAllListeners('onAsrBegin');
    voiceInputEmitter.removeAllListeners('onAsrResult');
    voiceInputEmitter.removeAllListeners('onAsrEnd');
    voiceInputEmitter.removeAllListeners('onAsrError');
  }
}

export default VoiceInputModule;