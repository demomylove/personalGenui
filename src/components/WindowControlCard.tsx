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

// 模拟车辆控制 API
const carControlAPI = {
    controlWindow: (position: string, action: 'up' | 'down') =>
        console.log(`车窗控制: ${position} ${action === 'up' ? '上升' : '下降'}`),
    toggleWindowLock: (status: boolean) =>
        console.log(`车窗锁止: ${status ? '已锁定' : '已解锁'}`),
};

// 跨平台提示函数
const showToast = (message: string) => {
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
        Alert.alert('提示', message);
    }
};

const WindowControlCard: React.FC = () => {
    const [windowLockOn, setWindowLockOn] = useState(false);

    // 车窗控制通用方法
    const handleWindowControl = (position: string, action: 'up' | 'down') => {
        if (windowLockOn) {
            showToast('车窗已锁止，请先解锁');
            return;
        }
        carControlAPI.controlWindow(position, action);
        showToast(`${position}车窗${action === 'up' ? '上升' : '下降'}`);
    };

    return (
        <View style={styles.cardContainer}>
            <BlurView
                style={StyleSheet.absoluteFill}
                blurType={Platform.OS === 'ios' ? 'light' : 'xlight'}
                blurAmount={8}
                reducedTransparencyFallbackColor="#f5f5f5"
            />

            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>车窗控制</Text>

                {/* 四车窗控制区 - 紧凑网格布局 */}
                <View style={styles.windowsGroup}>
                    {['主驾', '副驾', '左后', '右后'].map((pos) => (
                        <View key={pos} style={styles.windowItem}>
                            <Text style={styles.windowLabel}>{pos}</Text>
                            <View style={styles.btnGroup}>
                                <TouchableOpacity
                                    style={[styles.smallBtn, windowLockOn && styles.btnDisabled]}
                                    onPress={() => handleWindowControl(pos, 'up')}
                                >
                                    <Text style={styles.btnIcon}>↑</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.smallBtn, windowLockOn && styles.btnDisabled]}
                                    onPress={() => handleWindowControl(pos, 'down')}
                                >
                                    <Text style={styles.btnIcon}>↓</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* 车窗锁止按钮 - 适中尺寸 */}
                <TouchableOpacity
                    style={[styles.lockBtn, windowLockOn && styles.btnActive]}
                    onPress={() => {
                        const newState = !windowLockOn;
                        setWindowLockOn(newState);
                        carControlAPI.toggleWindowLock(newState);
                        showToast(newState ? '车窗已锁止' : '车窗已解锁');
                    }}
                >
                    <Text style={[styles.lockBtnText, windowLockOn && styles.btnTextActive]}>
                        {windowLockOn ? '🔒 车窗已锁' : '🔓 车窗锁止'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        width: '90%',
        maxWidth: 380,
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
        padding: 15,
        gap: 15,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    // 四车窗网格布局
    windowsGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    windowItem: {
        width: '48%',
        alignItems: 'center',
        gap: 5,
    },
    windowLabel: {
        fontSize: 12,
        color: '#666',
    },
    btnGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    // 小尺寸升降按钮
    smallBtn: {
        width: 40,
        height: 35,
        backgroundColor: '#e8f4f8',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnIcon: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    btnDisabled: {
        backgroundColor: '#f0f0f0',
        opacity: 0.6,
    },
    // 适中尺寸锁止按钮
    lockBtn: {
        width: '100%',
        height: 45,
        backgroundColor: '#fdf2f8',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnActive: {
        backgroundColor: '#e53e3e',
    },
    lockBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    btnTextActive: {
        color: '#fff',
    },
});

export default WindowControlCard;