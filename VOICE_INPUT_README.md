# 语音输入功能集成说明

本文档说明了如何在React Native项目中使用Android原生AudioManager的ASR功能来替换TextInput组件。

## 功能概述

- 将Android原生AudioManager的ASR（语音识别）功能桥接到React Native
- 创建自定义VoiceInput组件，支持语音输入和文本输入
- 在ChatScreen和MainScreen中替换原有的TextInput组件
- 添加必要的权限管理和错误处理

## 文件结构

```
android/audio/src/main/java/com/senseauto/audio/
├── VoiceInputModule.kt          # React Native原生模块
├── VoiceInputPackage.kt         # React Native包注册
└── AudioManager.kt              # 原有音频管理器（已存在）

src/
├── components/
│   └── VoiceInput.tsx           # 自定义语音输入组件
├── native/
│   └── VoiceInput.ts            # TypeScript接口定义
├── screens/
│   ├── ChatScreen.tsx           # 已更新使用VoiceInput
│   ├── MainScreen.tsx           # 已更新使用VoiceInput
│   └── VoiceInputTestScreen.tsx # 测试页面
├── utils/
│   └── Permissions.ts           # 权限管理工具
└── ...
```

## 主要功能

### 1. VoiceInput组件

VoiceInput组件是一个可替换TextInput的自定义组件，支持：
- 手动文本输入
- 语音识别输入（点击麦克风按钮）
- 实时显示识别结果
- 权限管理

使用方法：
```tsx
import VoiceInput from '../components/VoiceInput';

<VoiceInput
  style={styles.voiceInput}
  value={inputText}
  onChangeText={setInputText}
  placeholder="请输入或点击麦克风说话..."
  onSubmitEditing={handleSubmit}
  disabled={loading}
/>
```

### 2. 原生模块桥接

VoiceInputModule.kt提供了以下方法：
- `initAsr(asrType, duplexSwitch, hotwordJsonStr)` - 初始化ASR
- `startAsr()` - 开始语音识别
- `stopAsr()` - 停止语音识别
- `releaseAsr()` - 释放ASR资源

### 3. 事件处理

支持以下事件：
- `onAsrBegin` - 开始识别
- `onAsrResult` - 识别结果（实时）
- `onAsrEnd` - 识别结束
- `onAsrError` - 识别错误

## 权限配置

### Android权限

在`android/app/src/main/AndroidManifest.xml`中添加：
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

### 运行时权限

应用会自动请求录音权限，用户需要在弹出的权限对话框中授权。

## 测试

项目包含一个测试页面`VoiceInputTestScreen.tsx`，可以用来验证语音输入功能：

1. 在导航中添加测试页面
2. 运行基础测试验证组件功能
3. 测试语音识别功能
4. 查看测试日志

## 使用注意事项

1. **权限要求**：首次使用语音功能需要授权录音权限
2. **网络依赖**：ASR功能可能需要网络连接（取决于ASR类型）
3. **错误处理**：组件已包含基本的错误处理，但可以根据需要扩展
4. **性能考虑**：长时间使用语音识别可能影响电池寿命

## 扩展功能

可以根据需要扩展以下功能：
- 添加语音合成（TTS）功能
- 支持更多ASR引擎
- 添加语音指令识别
- 实现语音唤醒功能

## 故障排除

### 常见问题

1. **语音识别无响应**
   - 检查录音权限是否已授权
   - 确认AudioManager是否正确初始化
   - 查看控制台错误日志

2. **编译错误**
   - 确保所有依赖项正确添加
   - 检查包名和导入路径
   - 重新构建项目

3. **权限问题**
   - 在设置中手动开启录音权限
   - 检查AndroidManifest.xml中的权限声明

### 调试技巧

1. 使用`VoiceInputTestScreen`进行功能测试
2. 查看Android Studio的Logcat输出
3. 使用React Native调试工具检查JS端状态
4. 检查原生模块的日志输出

## 更新日志

- v1.0.0: 初始版本，实现基本语音输入功能
- 支持ASR功能桥接
- 添加权限管理
- 创建自定义VoiceInput组件
- 更新ChatScreen和MainScreen