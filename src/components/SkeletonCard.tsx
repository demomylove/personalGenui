import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const SkeletonCard = () => {
    const opacityAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacityAnim, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [opacityAnim]);

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={styles.header}>
                <Animated.View style={[styles.skeletonBlock, { width: 120, height: 20, opacity: opacityAnim, marginBottom: 5 }]} />
                <Animated.View style={[styles.skeletonBlock, { width: 80, height: 14, opacity: opacityAnim }]} />
            </View>

            {/* Main Content Area */}
            <View style={styles.content}>
                 {/*  Icon / Image Placeholder */}
                <Animated.View style={[styles.skeletonBlock, { 
                    width: 60, height: 60, borderRadius: 30, alignSelf: 'center', marginVertical: 20, opacity: opacityAnim 
                }]} />
                
                {/* Text Lines */}
                <Animated.View style={[styles.skeletonBlock, { width: '90%', height: 16, marginBottom: 10, opacity: opacityAnim }]} />
                <Animated.View style={[styles.skeletonBlock, { width: '80%', height: 16, marginBottom: 10, opacity: opacityAnim }]} />
                <Animated.View style={[styles.skeletonBlock, { width: '60%', height: 16, marginBottom: 10, opacity: opacityAnim }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
        marginVertical: 6,
        // Match TaskCard width/style
        width: 380, 
        height: 200, 
    },
    header: {
        marginBottom: 16,
    },
    content: {
        alignItems: 'center',
    },
    skeletonBlock: {
        backgroundColor: '#D0D0D0',
        borderRadius: 4,
    }
});

export default SkeletonCard;
