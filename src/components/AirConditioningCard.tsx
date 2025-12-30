import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ToastAndroid,
    Alert,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';

// --- 模拟车辆控制 API (可替换为真实接口) ---
const carControlAPI = {
    toggleAc: (status: boolean) => console.log(`空调: ${status ? '开启' : '关闭'}`),
    adjustTemperature: (type: 'up' | 'down') => console.log(`温度调节: ${type}`),
    adjustFanSpeed: (type: 'up' | 'down') => console.log(`风量调节: ${type}`),
    setAirMode: (mode: string) => console.log(`出风模式: ${mode}`),
    toggleDefrost: (type: 'front' | 'rear', status: boolean) =>
        console.log(`${type === 'front' ? '前' : '后'}挡风除雾: ${status ? '开启' : '关闭'}`),
};

// --- 跨平台提示函数 ---
const showToast = (message: string) => {
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
        Alert.alert('提示', message);
    }
};

const AirConditioningCard: React.FC = () => {
    // --- 功能状态 ---
    const [acOn, setAcOn] = useState(false);
    const [temperature, setTemperature] = useState(24); // 默认温度
    const [fanSpeed, setFanSpeed] = useState(2); // 默认风量 (1-5)
    const [selectedMode, setSelectedMode] = useState<string | null>(null); // 选中的出风模式
    const [frontDefrostOn, setFrontDefrostOn] = useState(false);
    const [rearDefrostOn, setRearDefrostOn] = useState(false);

    return (
        <View style={styles.cardContainer}>
            {/* 毛玻璃背景 */}
            <BlurView
                style={StyleSheet.absoluteFill}
                blurType={Platform.OS === 'ios' ? 'light' : 'xlight'}
                blurAmount={8}
                reducedTransparencyFallbackColor="#f5f5f5"
            />

            <View style={styles.cardContent}>
                {/* 标题 */}
                <Text style={styles.cardTitle}>空调通风</Text>

                {/* 1. 空调主开关 */}
                <View style={styles.controlGroup}>
                    <TouchableOpacity
                        style={[styles.powerBtn, acOn && styles.powerBtnActive]}
                        onPress={() => {
                            const newState = !acOn;
                            setAcOn(newState);
                            carControlAPI.toggleAc(newState);
                            showToast(newState ? '空调已开启' : '空调已关闭');
                        }}
                    >
                        <Text style={[styles.powerBtnText, acOn && styles.btnTextActive]}>
                            {acOn ? '关闭空调' : '开启空调'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 2. 温度和风量调节 */}
                <View style={styles.controlGroup}>
                    <Text style={styles.groupTitle}>温度与风量</Text>
                    <View style={styles.adjusterGroup}>
                        {/* 温度调节 */}
                        <View style={styles.adjusterColumn}>
                            <TouchableOpacity
                                style={styles.adjustBtn}
                                onPress={() => {
                                    const newTemp = Math.min(32, temperature + 1);
                                    setTemperature(newTemp);
                                    carControlAPI.adjustTemperature('up');
                                    showToast(`温度已设为 ${newTemp}°C`);
                                }}
                            >
                                <Text style={styles.adjustBtnText}>温度 +</Text>
                            </TouchableOpacity>
                            <Text style={styles.displayValue}>{temperature}°C</Text>
                            <TouchableOpacity
                                style={styles.adjustBtn}
                                onPress={() => {
                                    const newTemp = Math.max(16, temperature - 1);
                                    setTemperature(newTemp);
                                    carControlAPI.adjustTemperature('down');
                                    showToast(`温度已设为 ${newTemp}°C`);
                                }}
                            >
                                <Text style={styles.adjustBtnText}>温度 -</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 风量调节 */}
                        <View style={styles.adjusterColumn}>
                            <TouchableOpacity
                                style={styles.adjustBtn}
                                onPress={() => {
                                    const newSpeed = Math.min(5, fanSpeed + 1);
                                    setFanSpeed(newSpeed);
                                    carControlAPI.adjustFanSpeed('up');
                                    showToast(`风量已设为 ${newSpeed}档`);
                                }}
                            >
                                <Text style={styles.adjustBtnText}>风量 +</Text>
                            </TouchableOpacity>
                            <Text style={styles.displayValue}>{fanSpeed} 档</Text>
                            <TouchableOpacity
                                style={styles.adjustBtn}
                                onPress={() => {
                                    const newSpeed = Math.max(1, fanSpeed - 1);
                                    setFanSpeed(newSpeed);
                                    carControlAPI.adjustFanSpeed('down');
                                    showToast(`风量已设为 ${newSpeed}档`);
                                }}
                            >
                                <Text style={styles.adjustBtnText}>风量 -</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* 3. 出风模式 */}
                <View style={styles.controlGroup}>
                    <Text style={styles.groupTitle}>出风模式</Text>
                    <View style={styles.modeBtnGroup}>
                        {['吹脸', '吹脚', '吹脸脚', '吹挡风'].map((mode) => (
                            <TouchableOpacity
                                key={mode}
                                style={[styles.modeBtn, selectedMode === mode && styles.btnActive]}
                                onPress={() => {
                                    setSelectedMode(mode);
                                    carControlAPI.setAirMode(mode);
                                    showToast(`出风模式: ${mode}`);
                                }}
                            >
                                <Text style={[styles.btnText, selectedMode === mode && styles.btnTextActive]}>
                                    {mode}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* 4. 前后除雾 */}
                <View style={styles.controlGroup}>
                    <Text style={styles.groupTitle}>快捷功能</Text>
                    <View style={styles.simpleBtnGroup}>
                        <TouchableOpacity
                            style={[styles.funcBtn, frontDefrostOn && styles.btnActive]}
                            onPress={() => {
                                const newState = !frontDefrostOn;
                                setFrontDefrostOn(newState);
                                carControlAPI.toggleDefrost('front', newState);
                                showToast(newState ? '前挡风除雾已开启' : '前挡风除雾已关闭');
                            }}
                        >
                            <Text style={[styles.btnText, frontDefrostOn && styles.btnTextActive]}>前除雾</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.funcBtn, rearDefrostOn && styles.btnActive]}
                            onPress={() => {
                                const newState = !rearDefrostOn;
                                setRearDefrostOn(newState);
                                carControlAPI.toggleDefrost('rear', newState);
                                showToast(newState ? '后挡风除雾已开启' : '后挡风除雾已关闭');
                            }}
                        >
                            <Text style={[styles.btnText, rearDefrostOn && styles.btnTextActive]}>后除雾</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        width: 400,
        height: 'auto',
        borderRadius: 16,
        overflow: 'hidden',
        margin: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    cardContent: {
        padding: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    controlGroup: {
        marginBottom: 20,
    },
    groupTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
        paddingLeft: 5,
    },
    // 电源按钮
    powerBtn: {
        width: '100%',
        height: 60,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    powerBtnActive: {
        backgroundColor: '#38b2ac', // 青色代表空调开启
    },
    powerBtnText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    // 调节组
    adjusterGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    adjusterColumn: {
        flex: 1,
        alignItems: 'center',
    },
    adjustBtn: {
        width: '100%',
        height: 40,
        backgroundColor: '#e8f4f8',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 5,
    },
    adjustBtnText: {
        fontSize: 14,
        color: '#333',
    },
    displayValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginVertical: 10,
    },
    // 模式按钮组
    modeBtnGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    modeBtn: {
        flex: 1,
        minWidth: '45%',
        height: 48,
        backgroundColor: '#fdf2f8',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // 功能按钮
    simpleBtnGroup: {
        flexDirection: 'row',
        gap: 10,
    },
    funcBtn: {
        flex: 1,
        height: 48,
        backgroundColor: '#f5fafe',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // 通用按钮样式
    btnText: {
        fontSize: 14,
        color: '#333',
    },
    btnActive: {
        backgroundColor: '#4299e1',
    },
    btnTextActive: {
        color: '#fff',
    },
});

export default AirConditioningCard;