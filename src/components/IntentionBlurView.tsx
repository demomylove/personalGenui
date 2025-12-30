// src/components/IntentionBlurView.tsx

import React from 'react';
import {View, StyleSheet, ViewStyle, Text, Image} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient'; // 1. 导入渐变库

// 1. 定义意图常量数组
export const IntentionTypes = [
    'chat',
    'poi',
    'music',
    'weather',
    'route_planning',
    'cartoon_image',
    'ac_control',
] as const;

// 2. 生成联合类型
export type IntentionType = typeof IntentionTypes[number];

interface IntentionBlurViewProps {
    intention: IntentionType;
    children?: React.ReactNode;
}

// 3. 根据意图返回不同的渐变配置
const getGradientConfig = (intention: IntentionType) => {
    switch (intention) {
        case 'weather':
            // 浅蓝色渐变
            return {
                colors: ['rgba(173,216,230,0.4)', 'rgba(173,216,230,0.3)'],
                start: {x: 0, y: 0},
                end: {x: 1, y: 1},
            };
        case 'music':
            // 浅粉色渐变 (类似你图片的风格)
            return {
                colors: ['rgba(255,192,203,0.4)', 'rgba(255,192,203,0.3)'],
                start: {x: 0, y: 0},
                end: {x: 1, y: 1},
            };
        case 'poi':
            // 浅绿色渐变
            return {
                colors: ['rgba(144,238,144,0.4)', 'rgba(144, 238, 144, 0.3)'],
                start: {x: 0, y: 0},
                end: {x: 1, y: 1},
            };
        case 'route_planning':
            // 浅黄色渐变
            return {
                colors: ['rgba(255, 215, 0, 0.4)', 'rgba(255, 215, 0, 0.3)'],
                start: {x: 0, y: 0},
                end: {x: 1, y: 1},
            };
        case 'cartoon_image':
            // 浅紫色渐变
            return {
                colors: ['rgba(238, 130, 238, 0.4)', 'rgba(238, 130, 238, 0.3)'],
                start: {x: 0, y: 0},
                end: {x: 1, y: 1},
            };
        case 'ac_control':
            // 浅橙色渐变
            return {
                colors: ['rgba(255, 165, 0, 0.4)', 'rgba(255, 165, 0, 0.3)'],
                start: {x: 0, y: 0},
                end: {x: 1, y: 1},
            };
        case 'chat':
        default:
            // 白色到透明的渐变 (更自然的模糊效果)
            return {
                colors: ['rgba(253,251,254,0)', 'rgba(252,249,254,0.51)', "#F3E3F8"],
                start: {x: 0.5, y: 0},
                end: {x: 0.5, y: 1},
            };
    }
};


export default function IntentionBlurView({intention, children}: IntentionBlurViewProps) {
    const gradientConfig = getGradientConfig(intention);

    return (
        // 1. 主容器，用于裁剪
        <View style={styles.container}>

            {/* 4. 内容层 */}
            <Image
                source={require('../assets/icons/weather_img.png')}
                style={[StyleSheet.absoluteFill, {opacity: 0.3}]}
            />
            {/* 3. 渐变着色层 */}
            <LinearGradient
                style={[StyleSheet.absoluteFill, {opacity: 0.9}]}
                colors={gradientConfig.colors}
                start={gradientConfig.start}
                end={gradientConfig.end}
            />
            <View style={styles.contentContainer}>
                {children}
            </View>
            {/* 2. 毛玻璃层 */}
            <BlurView
                style={[StyleSheet.absoluteFill, {
                    shadowRadius: 10,
                    shadowColor: 'black',
                    shadowOpacity: 0.5,
                    shadowOffset: {width: 0, height: 0}
                }]}
                blurType="light"
                blurAmount={15}
                reducedTransparencyFallbackColor="white"
            >
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        minWidth: 350,
        minHeight: 300,
        borderRadius: 12,
        marginRight: 16,
        overflow: 'hidden', // 关键！裁剪所有子视图
        position: 'relative', // 关键！为绝对定位提供上下文
    },
    contentContainer: {
        flex: 1,
        padding: 12,
        flexDirection: 'column',
        alignItems: 'flex-start',
        backgroundColor: 'transparent', // 必须透明，才能看到下面的效果
    },
});