import React, {useState} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ToastAndroid, // 1. 导入 ToastAndroid
    Alert,        // 1. 导入 Alert
} from 'react-native';
import {BlurView} from '@react-native-community/blur';

// 模拟车辆控制API（可替换为真实接口）
const carControlAPI = {
    moveSeat: (direction: string) => console.log(`座椅移动：${direction}`),
    adjustBackrest: (type: string) => console.log(`靠背调节：${type}`),
    toggleFunction: (func: string, status: boolean) =>
        console.log(`${func}功能：${status ? '开启' : '关闭'}`),
};

// 2. 创建一个跨平台的提示函数
const showToast = (message: string) => {
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
        Alert.alert('提示', message);
    }
};

const SeatControlCard: React.FC = () => {
    // 功能开关状态
    const [massageOn, setMassageOn] = useState(false);
    const [heatOn, setHeatOn] = useState(false);
    const [ventOn, setVentOn] = useState(false);

    return (
        <View style={styles.cardContainer}>
            {/* 毛玻璃背景（可选，去掉不影响功能） */}
            <BlurView
                style={StyleSheet.absoluteFill}
                blurType={Platform.OS === 'ios' ? 'light' : 'xlight'}
                blurAmount={8}
                reducedTransparencyFallbackColor="#f5f5f5"
            />

            <View style={styles.cardContent}>
                {/* 标题 */}
                <Text style={styles.cardTitle}>座椅控制</Text>

                {/* 1. 座椅位置控制（核心方向按钮） */}
                <View style={styles.controlGroup}>
                    <Text style={styles.groupTitle}>座椅位置</Text>
                    <View style={styles.directionBtnGroup}>
                        <TouchableOpacity
                            style={styles.directionBtn}
                            onPress={() => {
                                carControlAPI.moveSeat('向前');
                                // 3. 调用提示函数
                                showToast('正在向前移动');
                            }}
                        >
                            <Text style={styles.btnText}>向前</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.directionBtn}
                            onPress={() => {
                                carControlAPI.moveSeat('向后');
                                showToast('正在向后移动');
                            }}
                        >
                            <Text style={styles.btnText}>向后</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.directionBtn}
                            onPress={() => {
                                carControlAPI.moveSeat('向上');
                                showToast('正在向上移动');
                            }}
                        >
                            <Text style={styles.btnText}>向上</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.directionBtn}
                            onPress={() => {
                                carControlAPI.moveSeat('向下');
                                showToast('正在向下移动');
                            }}
                        >
                            <Text style={styles.btnText}>向下</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 2. 靠背调节按钮 */}
                <View style={styles.controlGroup}>
                    <Text style={styles.groupTitle}>靠背调节</Text>
                    <View style={styles.simpleBtnGroup}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                carControlAPI.adjustBackrest('前倾');
                                showToast('正在前倾');
                            }}
                        >
                            <Text style={styles.btnText}>前倾</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                carControlAPI.adjustBackrest('后仰');
                                showToast('正在后仰');
                            }}
                        >
                            <Text style={styles.btnText}>后仰</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 3. 舒适功能开关按钮 */}
                <View style={styles.controlGroup}>
                    <Text style={styles.groupTitle}>舒适功能</Text>
                    <View style={styles.simpleBtnGroup}>
                        <TouchableOpacity
                            style={[styles.funcBtn, massageOn && styles.btnActive]}
                            onPress={() => {
                                const newState = !massageOn;
                                setMassageOn(newState);
                                carControlAPI.toggleFunction('按摩', newState);
                                showToast(newState ? '按摩功能已开启' : '按摩功能已关闭');
                            }}
                        >
                            <Text
                                style={[styles.btnText, massageOn && styles.btnTextActive]}>按摩 {massageOn ? '✓' : ''}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.funcBtn, heatOn && styles.btnActive]}
                            onPress={() => {
                                const newState = !heatOn;
                                setHeatOn(newState);
                                carControlAPI.toggleFunction('加热', newState);
                                showToast(newState ? '加热功能已开启' : '加热功能已关闭');
                            }}
                        >
                            <Text
                                style={[styles.btnText, heatOn && styles.btnTextActive]}>加热 {heatOn ? '✓' : ''}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.funcBtn, ventOn && styles.btnActive]}
                            onPress={() => {
                                const newState = !ventOn;
                                setVentOn(newState);
                                carControlAPI.toggleFunction('通风', newState);
                                showToast(newState ? '通风功能已开启' : '通风功能已关闭');
                            }}
                        >
                            <Text
                                style={[styles.btnText, ventOn && styles.btnTextActive]}>通风 {ventOn ? '✓' : ''}</Text>
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
        borderRadius: 16,
        overflow: 'hidden',
        margin: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    cardContent: {padding: 20,},
    cardTitle: {fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 20, textAlign: 'center',},
    controlGroup: {marginBottom: 20,},
    groupTitle: {fontSize: 14, color: '#666', marginBottom: 10, paddingLeft: 5,},
    directionBtnGroup: {flexDirection: 'row', flexWrap: 'wrap', gap: 10,},
    directionBtn: {
        flex: 1,
        minWidth: '45%',
        height: 48,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    simpleBtnGroup: {flexDirection: 'row', gap: 10,},
    actionBtn: {
        flex: 1,
        height: 48,
        backgroundColor: '#e8f4f8',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    funcBtn: {
        flex: 1,
        height: 48,
        backgroundColor: '#fdf2f8',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnActive: {backgroundColor: '#4299e1',},
    btnTextActive: {color: '#fff',},
    btnText: {fontSize: 14, color: '#333',},
});

export default SeatControlCard;