import React, {useEffect, useRef, useState, useCallback} from 'react';
import Geolocation from '@react-native-community/geolocation';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Button,
    Alert,
    FlatList,
    Platform,
    Dimensions,
    ToastAndroid,
    ImageBackground,
    NativeModules,
    Image
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context'; // 需要安装此库
import {AGUIClient} from '../utils/AGUIClient';
import {isWeatherIntent, fetchWeatherForPrompt} from '../api/weather';
import {renderComponent} from '../dsl/DslRenderer';
import TaskCard, {TaskStatus} from '../components/TaskCard';
import VoiceInput from '../components/VoiceInput';
import RobotIcon from '../components/RobotIcon';
import UserIcon from '../components/UserIcon';
import {PermissionStatus} from '../utils/Permissions';
import {BlurView} from "@react-native-community/blur";
import IntentionBlurView, {IntentionType, IntentionTypes} from "../components/IntentionBlurView.tsx";

// 统一服务器地址（与 GenUITestScreen 保持一致）
const SERVER_URL = 'http://10.210.0.58:3001/api/chat';
//
// const GradientDemo = () => {
//     return (
//         <View style={styles.container}>
//             {/* 正常使用 LinearGradient 组件 */}
//             <LinearGradient
//                 // 渐变颜色数组（必填，支持十六进制/RGB/RGBA）
//                 colors={['#FF6B6B', '#4ECDC4', '#45B7D1']}
//                 // 渐变起始点（x/y 取值范围 0-1）
//                 start={{ x: 0, y: 0 }}
//                 // 渐变结束点（0,1 为垂直渐变，1,0 为水平渐变）
//                 end={{ x: 0, y: 1 }}
//                 // 颜色位置占比（可选，对应colors数组）
//                 locations={[0, 0.5, 1]}
//                 style={styles.gradientBox}
//             >
//                 <Text style={styles.text}>非Expo RN 安卓渐变色演示</Text>
//             </LinearGradient>
//         </View>
//     );
// };
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
    const [intention, setIntention] = useState<IntentionType>('chat');
    const [statusText, setStatusText] = useState('');
    const [currentDsl, setCurrentDsl] = useState<any>(null);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; dsl?: any }>>([]);
    const [input, setInput] = useState('');
    // 初始不自动加载，等用户点击"生成UI"
    const [loading, setLoading] = useState(false);
    // 新增：维护完整的 Agent 状态，用于渲染时的数据绑定
    const [agentState, setAgentState] = useState<any>({});
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const isLandscape = () => {
        const {width, height} = Dimensions.get('window');
        return width > height;
    };

    // 处理按钮点击事件（Toast、Navigate 等）
    const handleInteraction = useCallback((action: any) => {
        console.log('[MainScreen] handleInteraction:', action);

        // 兼容处理字符串类型的 action（如 "showAlert('message')"）
        if (typeof action === 'string') {
            const match = action.match(/showAlert\(['"](.+)['"]\)/);
            const msg = match ? match[1] : action;

            if (Platform.OS === 'android') {
                ToastAndroid.show(msg, ToastAndroid.SHORT);
            } else {
                Alert.alert('提示', msg);
            }
            return;
        }

        if (!action || !action.action_type) {
            console.warn('[MainScreen] Invalid action object');
            return;
        }

        switch (action.action_type) {
            case 'toast':
                const message = action.payload?.message || '操作成功';
                if (Platform.OS === 'android') {
                    ToastAndroid.show(message, ToastAndroid.SHORT);
                } else {
                    // iOS 没有原生 Toast，使用 Alert 代替
                    Alert.alert('提示', message);
                }
                break;
            case 'navigate':
                // TODO: 实现导航功能
                console.log('[MainScreen] Navigate to:', action.payload?.route);
                Alert.alert('导航', `将导航到: ${action.payload?.route}`);
                break;
            case 'call_api':
                // TODO: 实现 API 调用
                console.log('[MainScreen] Call API:', action.payload?.api_endpoint);
                Alert.alert('API 调用', `调用: ${action.payload?.api_endpoint}`);
                break;
            case 'open_music_app':
                if (Platform.OS === 'android') {
                    try {
                        NativeModules.MusicModule.openNeteaseMusic();
                        ToastAndroid.show('正在打开网易云音乐...', ToastAndroid.SHORT);
                    } catch (e) {
                        console.error('Failed to call native music module', e);
                        ToastAndroid.show('调用原生模块失败', ToastAndroid.SHORT);
                    }
                } else {
                    Alert.alert("提示", "iOS暂不支持跳转本地音乐");
                }
                break;
            default:
                console.warn('[MainScreen] Unknown action type:', action.action_type);
        }
    }, []);

    // 获取安全区域边距，包含底部导航栏或 Home Indicator
    const insets = useSafeAreaInsets();


    // ... (existing imports)

    const send = async (prompt: string) => {
        setLoading(true);
        setStatus('thinking');
        setStatusText('');
        setIntention('chat')
        setMessages((prev) => [...prev, {role: 'user', content: prompt}]);

        try {
            // 1. Get Location (Best Effort)
            let locationCoords = null;
            try {
                const position = await new Promise<any>((resolve, reject) => {
                    Geolocation.getCurrentPosition(
                        (pos: any) => resolve(pos),
                        (err: any) => reject(err),
                        {enableHighAccuracy: false, timeout: 5000, maximumAge: 10000}
                    );
                });
                if (position && position.coords) {
                    locationCoords = `${position.coords.longitude},${position.coords.latitude}`;
                    console.log('[MainScreen] Location fetched:', locationCoords);
                }
            } catch (locationErr) {
                console.warn('[MainScreen] Location fetch failed:', locationErr);
            }

            let dataContext: any = {title: 'demo'};
            if (locationCoords) {
                dataContext.location = locationCoords;
            }

            if (isWeatherIntent(prompt)) {
                console.log('[MainScreen] 请求真实天气数据 Fetching weather data...')
                const weather = await fetchWeatherForPrompt(prompt);
                if (weather) {
                    console.log('[MainScreen] Weather data:', weather);
                    dataContext.weather = weather;
                }
            }

            const newAgentState = {...agentState, ...{dataContext}};
            setAgentState(newAgentState);
            await client.sendMessage(prompt, {dataContext});
        } catch (e: any) {
            Alert.alert('请求失败', e.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        client.setListeners({
            onMessageDelta: (delta) => {
                // 文本思考增量（LLM 的 streaming 输出），用于展示助手思考过程提示
                setStatusText((prev) => prev + delta);
                // 遍历意图类型数组，查找匹配的意图
                let foundIntent = false;
                for (const intent of IntentionTypes) {
                    if (statusText.toLowerCase().includes(intent)) {
                        setIntention(intent);
                        foundIntent = true;
                        break; // 找到匹配的意图后立即退出循环
                    }
                }
                if (!foundIntent) {
                    setIntention('chat');
                }

            },
            onStateUpdate: (newState) => {
                // 服务端通过流式“状态补丁”推送最新 Agent 状态（含 dataContext、dsl 等）
                // 每次收到都更新本地状态，驱动 UI 重渲染
                console.log('[MainScreen] State Update:', JSON.stringify(newState.dataContext || {}));
                setAgentState(newState);
                if (newState.dsl) {
                    console.log('[MainScreen] State Update dsl:', JSON.stringify(newState.dsl || {}));
                    // 当状态中出现 dsl（界面结构描述），进入绘制阶段
                    setCurrentDsl(newState.dsl);
                    setStatus('drawing');
                }
            },
            onToolStart: () => {
                // 服务端工具调用开始（例如触发某个业务能力），可在此做提示/埋点
            },
            onToolEnd: () => {
                // 工具调用结束，亦可做结果提示或刷新
            },
            onError: (err) => {
                // 会话错误：结束思考态并提示用户
                setStatus('thinkingComplete');
                Alert.alert('错误', err);
                setLoading(false);
            },
            onDone: () => {

                // 流式会话完成：进入 completed 态
                setStatus('completed');
            },
        });

        // 不自动发起请求；等待用户点击按钮
        return () => client.close();
    }, []);

    useEffect(() => {
        // 当状态变为 completed：
        // - 若存在 currentDsl，则把 DSL 作为“助手消息”插入消息列表
        // - 消息渲染时会使用 agentState.dataContext 进行数据绑定
        if (status === 'completed' && currentDsl) {
            setMessages((prev) => [
                ...prev,
                {role: 'assistant', content: '', dsl: currentDsl}
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
                flatListRef.current?.scrollToEnd({animated: true});
            }, 100);
        }
    }, [messages]);

    // 当加载状态变化时，滚动到底部
    useEffect(() => {
        if (loading && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({animated: true});
            }, 100);
        }
    }, [loading]);

    return (
        <ImageBackground
            source={isLandscape() ? require('../assets/ag_ui_bg.png') : require('../assets/ag_ui_bg_portrait.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <SafeAreaProvider>
                <SafeAreaView style={[styles.container, {paddingBottom: insets.bottom}]}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>SenseGenUIKit</Text>
                    </View>

                    {/* 对话区域：按时间顺序展示用户与助手的消息。
                        若某条消息含 dsl，则在气泡下方渲染生成式 UI 组件树。 */}
                    <FlatList
                        ref={flatListRef}
                        style={styles.chat}
                        data={messages}
                        keyExtractor={(_, idx) => String(idx)}
                        renderItem={({item, index}) => (
                            <View style={[{height: "auto", width: "auto", backgroundColor: "transparent", margin: 10}]}>
                                {/* 消息气泡与头像：用户在右，助手在左 */}
                                <View
                                    style={item.role === 'user' ? styles.userMessageContainer : styles.aiMessageContainer}>
                                    {item.role === 'assistant' && <RobotIcon size={32}/>}
                                    {/* 当 content 非空或角色为 user 时显示文本气泡；助手若仅提供 DSL，可不显示文本 */}
                                    {(item.content.trim() || item.role === 'user') && (
                                        <View
                                            style={[styles.bubble, item.role === 'user' ? styles.bubbleMe : styles.bubbleAI]}>
                                            <Text
                                                style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextMe]}>{item.content}</Text>
                                        </View>
                                    )}
                                    {item.role === 'user' && <UserIcon/>}
                                </View>
                                {/*
                          使用 IntentionBlurView 组件
                        */}
                                {/* 若该消息包含 DSL：使用 renderComponent 结合 agentState.dataContext 渲染实际组件，
                                    实现“数据绑定 + 界面结构”驱动的生成式 UI。 */}
                                {item.dsl && (
                                    <LinearGradient
                                        colors={['#F0F4FC00', 'rgba(125,71,196,0)']} // 渐变色数组
                                        start={{x: 0.5, y: -0.3}} // 渐变起始点
                                        end={{x: 0.5, y: 2.0}}   // 渐变结束点
                                        locations={[0, 1]} // 颜色位置
                                        style={[styles.dslContainer, {
                                            opacity: 1,
                                            padding: 0,
                                            maxWidth: isLandscape() ? '70%' : '80%',
                                            maxHeight: "auto"
                                        }]}
                                    >
                                        {/* DSL 内容层：数据上下文来源为 agentState.dataContext；不再使用硬编码示例 */}
                                        {renderComponent(item.dsl, agentState.dataContext || agentState || {}, handleInteraction)}

                                    </LinearGradient>
                                )}

                            </View>
                        )}


                        // 替换 #selectedCode 部分的代码
                        ListFooterComponent={
                            loading ? (
                                <View style={styles.loadingContainer}>

                                    <View style={styles.statusContainer}>
                                        <RobotIcon size={24}/>
                                        <View style={styles.statusTextContainer}>
                                            <TaskCard status={status}/>
                                            <Text style={styles.statusText}>{statusText}</Text>
                                            {/*使用 IntentionBlurView 组件*/}
                                            <IntentionBlurView intention={intention}>
                                                <TaskCard status={status}/>
                                                <Text style={styles.statusText}>{statusText}</Text>
                                            </IntentionBlurView>

                                        </View>

                                    </View>

                                </View>
                            ) : null
                        }

                        onContentSizeChange={() => {
                            // 当内容大小改变时，滚动到底部
                            flatListRef.current?.scrollToEnd({animated: true});
                        }}
                    />

                    {/* 输入区：语音输入组件封装了权限申请、识别结果回填与提交。
                        onSubmitEditing 触发 send(prompt) 发起一次生成式 UI 会话。 */}
                    <View style={styles.inputRow}>
                        <VoiceInput
                            style={styles.voiceInput}
                            value={input}
                            onChangeText={setInput}
                            placeholder=""
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
            </SafeAreaProvider>
        </ImageBackground>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 12,
        paddingHorizontal: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(233,233,235,0)',
        marginBottom: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333'
    },
    chat: {
        flex: 1,
    },
    userMessageContainer: {
        flexDirection: 'column-reverse',
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
        borderRadius: 10,
        marginTop: 8,
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
        flexDirection: 'column',
        marginVertical: 2,
        marginLeft: 8, // 与机器人图标对齐
        marginRight: 8,
        borderRadius: 20,
        opacity: 1, // 增加透明度
        // backgroundColor: '#fff',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 }, // 补充阴影偏移，让阴影更自然（可选）
        // shadowOpacity: 0.1, // 补充阴影透明度（可选）
        // shadowRadius: 2, // 补充阴影模糊度（可选）
        // borderRadius: 12,
        // padding: 12,
        // borderWidth: 1,
        // borderColor: '#eee',
        // ========== 新增/补充：强化宽度自适应 + 靠左对齐 ==========
        alignSelf: 'flex-start', // 容器自身宽度自适应（包裹内部 DSL 内容），不撑满父容器
        alignItems: 'flex-start', // 确保容器内子元素（DSL组件）默认靠左对齐
        justifyContent: 'flex-start', // 主轴方向靠左对齐，强化布局一致性
    },

    // 外层包裹容器：相对定位，用于约束绝对定位的毛玻璃
    dslWrapper: {
        position: 'relative', // 必须，作为绝对定位的参考
        marginVertical: 8,
        marginLeft: 48,
        marginRight: 8,
        // 适配内容宽度：因为 dslContainer 是 flex-start，所以宽度由内容决定
        alignSelf: 'flex-start',
    },
    dslGradientBackground: {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 20, // 与内容层圆角一致
        zIndex: 1,
    },
    // 毛玻璃背景层：绝对定位，覆盖整个 wrapper
    dslBlurBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 12, // 与内容层圆角一致，避免边缘突兀
        zIndex: 1, // 背景层 zIndex 低于内容层
    },

    // 原有 dslContainer 样式：新增 zIndex 确保在毛玻璃上方
    dslBlurContainer: {
        marginLeft: 8,
        opacity: 0.9, // 增加透明度
        marginRight: 8,
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        borderRadius: 12, // 与毛玻璃圆角一致
        zIndex: 2, // 内容层 zIndex 高于背景层
        // 可选：添加轻微阴影，增强层次感
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
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
        // backgroundColor: "red",
        borderTopWidth: 1,
        borderTopColor: 'rgba(233,233,235,0)',
        paddingTop: 16,
    },
    voiceInput: {
        flex: 1,
        // backgroundColor: "red",

        // backgroundColor: '#F0F0F0',
        borderRadius: 20,
    },
    loadingContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginVertical: 8,
        paddingLeft: 8,
    },
    loadingContent: {
        flex: 1,
    },
    // 在 styles 中添加新的样式
    statusContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginVertical: 8,
        paddingLeft: 8,
    },
    statusTextContainer: {
        flex: 1,
    },
    statusText: {
        fontSize: 12,
        color: '#666',
        marginTop: 0,
        lineHeight: 18,
    },
    blurContainer: {
        padding: 16,
        borderRadius: 12,
        overflow: 'hidden',  // 确保模糊效果在圆角内
    },

    gradientBox: {
        width: 300,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12, // 圆角直接设置在 LinearGradient 上
    },
    text: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    backgroundImage: {
        flex: 1, // 占据整个屏幕
        width: '100%',
        height: '100%',

    },


    // 思考状态下的毛玻璃容器
    thinkingCardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginLeft: 40, // 与机器人图标对齐
        marginRight: 16,
        marginVertical: 4,
        // 关键：允许子元素的背景模糊效果应用到父元素的背景上
        overflow: 'hidden',
    },

    // 天气意图的毛玻璃样式
    thinkingCardWeather: {
        backgroundColor: 'rgba(173, 216, 230, 0.2)', // 浅蓝色，低透明度
        // 关键：背景模糊效果
        // @ts-ignore: react-native-reanimated type issue
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)', // 兼容 iOS
    },

    // 音乐意图的毛玻璃样式
    thinkingCardMusic: {
        backgroundColor: 'rgba(255, 192, 203, 0.2)', // 浅粉色，低透明度
        // @ts-ignore: react-native-reanimated type issue
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
    },

    // POI意图的毛玻璃样式
    thinkingCardPoi: {
        backgroundColor: 'rgba(144, 238, 144, 0.2)', // 浅绿色，低透明度
        // @ts-ignore: react-native-reanimated type issue
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
    },

    // 路线规划意图的毛玻璃样式
    thinkingCardRoute: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)', // 浅黄色，低透明度
        // @ts-ignore: react-native-reanimated type issue
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
    },

    // 默认/聊天意图的毛玻璃样式
    thinkingCardDefault: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)', // 白色，低透明度
        // @ts-ignore: react-native-reanimated type issue
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
    },

    // 思考卡片内的文本样式
    thinkingCardText: {
        color: '#333',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
    footerIcon: {
        width: 350,
        height: 300,
        marginHorizontal: 8,
        resizeMode: 'contain',
        tintColor: '#555', // 可以调整图标颜色
    },

});
