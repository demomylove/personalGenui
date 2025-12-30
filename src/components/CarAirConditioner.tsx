import React, {useState} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Dimensions,
    SafeAreaView
} from 'react-native';

// 屏幕尺寸
const {width, height} = Dimensions.get('window');
// 空调核心状态定义
type AirConditionState = {
    temperature: number; // 温度（16-30℃）
    isCool: boolean; // 是否制冷（true=制冷，false=制热）
    windSpeed: number; // 风速（1-5级）
    windMode: string; // 出风模式（面部/脚部/前挡风/双区）
    isOn: boolean; // 空调开关状态
};

// 出风模式配置（可自定义扩展）
const WIND_MODE_OPTIONS = [
    {label: '面部', value: 'face', icon: '🔝'},
    {label: '脚部', value: 'foot', icon: '👇'},
    {label: '前挡风', value: 'windshield', icon: '🚗'},
    {label: '双区', value: 'dual', icon: '🔄'},
];

const CarAirConditioner: React.FC = () => {
    // 初始化空调状态
    const [acState, setAcState] = useState<AirConditionState>({
        temperature: 24,
        isCool: true,
        windSpeed: 3,
        windMode: 'face',
        isOn: true,
    });

    // 温度调节：增加
    const handleTempIncrease = () => {
        if (acState.temperature >= 30) return;
        setAcState(prev => ({...prev, temperature: prev.temperature + 1}));
    };

    // 温度调节：减少
    const handleTempDecrease = () => {
        if (acState.temperature <= 16) return;
        setAcState(prev => ({...prev, temperature: prev.temperature - 1}));
    };

    // 切换制冷/制热模式
    const toggleCoolHeat = () => {
        setAcState(prev => ({...prev, isCool: !prev.isCool}));
    };

    // 风速调节：增加
    const handleWindSpeedIncrease = () => {
        if (acState.windSpeed >= 10) return;
        setAcState(prev => ({...prev, windSpeed: prev.windSpeed + 1}));
    };

    // 风速调节：减少
    const handleWindSpeedDecrease = () => {
        if (acState.windSpeed <= 1) return;
        setAcState(prev => ({...prev, windSpeed: prev.windSpeed - 1}));
    };

    // 切换出风模式
    const handleChangeWindMode = (mode: string) => {
        setAcState(prev => ({...prev, windMode: mode}));
    };

    // 切换空调开关
    const toggleAcOnOff = () => {
        setAcState(prev => ({...prev, isOn: !prev.isOn}));
    };

    // 获取当前出风模式的图标和标签
    const currentWindMode = WIND_MODE_OPTIONS.find(item => item.value === acState.windMode) || WIND_MODE_OPTIONS[0];

    return (
        <SafeAreaView style={styles.container}>
            {/* 空调标题栏 */}
            <View style={styles.header}>
                <Text style={styles.title}>车辆空调控制</Text>
                <TouchableOpacity
                    style={[styles.switchBtn, !acState.isOn && styles.switchBtnOff]}
                    onPress={toggleAcOnOff}
                >
                    <Text style={styles.switchBtnText}>{acState.isOn ? '开启' : '关闭'}</Text>
                </TouchableOpacity>
            </View>

            {/* 核心控制区域（温度+制冷/制热） */}
            <View style={[styles.coreControl, !acState.isOn && styles.controlDisabled]}>
                {/* 温度显示 */}
                <View style={styles.tempDisplay}>
                    <Text style={styles.tempText}>{acState.temperature}℃</Text>
                    <Text style={styles.modeText}>{acState.isCool ? '制冷' : '制热'}</Text>
                </View>

                {/* 温度调节按钮 */}
                <View style={styles.tempBtnGroup}>
                    <TouchableOpacity style={styles.tempBtn} onPress={handleTempIncrease} disabled={!acState.isOn}>
                        <Text style={styles.tempBtnText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tempBtn} onPress={handleTempDecrease} disabled={!acState.isOn}>
                        <Text style={styles.tempBtnText}>-</Text>
                    </TouchableOpacity>
                </View>

                {/* 制冷/制热切换按钮 */}
                <TouchableOpacity
                    style={[styles.coolHeatBtn, !acState.isOn && styles.btnDisabled]}
                    onPress={toggleCoolHeat}
                    disabled={!acState.isOn}
                >
                    <Text style={styles.coolHeatText}>{acState.isCool ? '切换制热' : '切换制冷'}</Text>
                </TouchableOpacity>
            </View>

            {/* 风速控制区域 */}
            <View style={[styles.windSpeedControl, !acState.isOn && styles.controlDisabled]}>
                <Text style={styles.subTitle}>风速调节</Text>
                <View style={styles.windSpeedWrap}>
                    <TouchableOpacity
                        style={[styles.windBtn, !acState.isOn && styles.btnDisabled]}
                        onPress={handleWindSpeedDecrease}
                        disabled={!acState.isOn}
                    >
                        <Text style={styles.windBtnText}>➖</Text>
                    </TouchableOpacity>
                    <View style={styles.windSpeedDisplay}>
                        <Text style={styles.windSpeedText}>当前风速：{acState.windSpeed}级</Text>
                        {/* 风速可视化指示器 */}
                        <View style={styles.windIndicatorWrap}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                                <View
                                    key={level}
                                    style={[
                                        styles.windIndicator,
                                        level <= acState.windSpeed && styles.windIndicatorActive,
                                        !acState.isOn && styles.indicatorDisabled
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.windBtn, !acState.isOn && styles.btnDisabled]}
                        onPress={handleWindSpeedIncrease}
                        disabled={!acState.isOn}
                    >
                        <Text style={styles.windBtnText}>➕</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 出风模式选择区域 */}
            <View style={[styles.windModeControl, !acState.isOn && styles.controlDisabled]}>
                <Text style={styles.subTitle}>出风模式</Text>
                <View style={styles.windModeWrap}>
                    {/* 当前模式显示 */}
                    <View style={styles.currentWindMode}>
                        <Text style={styles.currentWindIcon}>{currentWindMode.icon}</Text>
                        <Text style={styles.currentWindLabel}>{currentWindMode.label}</Text>
                    </View>

                    {/* 模式选择按钮组 */}
                    <View style={styles.windModeBtnGroup}>
                        {WIND_MODE_OPTIONS.map((item) => (
                            <TouchableOpacity
                                key={item.value}
                                style={[
                                    styles.windModeBtn,
                                    acState.windMode === item.value && styles.windModeBtnActive,
                                    !acState.isOn && styles.btnDisabled
                                ]}
                                onPress={() => handleChangeWindMode(item.value)}
                                disabled={!acState.isOn}
                            >
                                <Text style={acState.windMode === item.value ? styles.windModeBtnTextActive :styles.windModeBtnText}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

// 样式定义
const styles = StyleSheet.create({
    container: {
        padding: 16,
        height: "auto",
        width: "auto",
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    switchBtn: {
        backgroundColor: '#4a90e2',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    switchBtnOff: {
        backgroundColor: '#cccccc',
    },
    switchBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },
    coreControl: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    controlDisabled: {
        opacity: 0.6,
    },
    tempDisplay: {
        alignItems: 'center',
        marginBottom: 16,
    },
    tempText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    modeText: {
        fontSize: 16,
        color: '#666666',
    },
    tempBtnGroup: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 16,
    },
    tempBtn: {
        backgroundColor: '#4a90e2',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tempBtnText: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    coolHeatBtn: {
        backgroundColor: '#f0f5ff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
    },
    btnDisabled: {
        backgroundColor: '#f5f5f5',
    },
    coolHeatText: {
        color: '#4a90e2',
        fontSize: 14,
        fontWeight: '500',
    },
    subTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    windSpeedControl: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    windSpeedWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    windBtn: {
        backgroundColor: '#4a90e2',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    windBtnText: {
        color: '#ffffff',
        fontSize: 16,
    },
    windSpeedDisplay: {
        flex: 1,
    },
    windSpeedText: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 8,
    },
    windIndicatorWrap: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    windIndicator: {
        width: 8,
        height: 24,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
    },
    windIndicatorActive: {
        backgroundColor: '#4a90e2',
    },
    indicatorDisabled: {
        backgroundColor: '#f0f0f0',
    },
    windModeControl: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    windModeWrap: {
        gap: 16,
    },
    currentWindMode: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    currentWindIcon: {
        fontSize: 20,
    },
    currentWindLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1a1a1a',
    },
    windModeBtnGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    windModeBtn: {
        backgroundColor: '#f0f5ff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    windModeBtnActive: {
        backgroundColor: '#4a90e2',

    },
    windModeBtnText: {
        color: '#4a90e2',
        fontSize: 12,
    },
    windModeBtnTextActive: {
        color: '#00ff00',
        fontSize: 12,
    },

    windModeBtnActiveText: {
        color: '#ffffff',
    },
});

export default CarAirConditioner;