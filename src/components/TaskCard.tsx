import React, { useEffect, useRef } from 'react';
import {View, Text, Animated, Easing, StyleSheet, Image} from 'react-native';
import LinearGradient from "react-native-linear-gradient";
import {renderComponent} from "../dsl/DslRenderer.tsx";
import SkeletonCard from './SkeletonCard';

export type TaskStatus = 'thinking' | 'thinkingComplete' | 'drawing' | 'completed';

interface TaskCardProps {
  status: TaskStatus;
  content?: React.ReactNode;
}

const TaskCard: React.FC<TaskCardProps> = ({ status, content }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // 根据状态控制旋转动画
  useEffect(() => {
    if (status === 'thinking') {
      startRotation();
    } else {
      stopRotation();
    }
  }, [status]);

  const startRotation = () => {
    rotateAnim.setValue(0);
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopRotation = () => {
    rotateAnim.stopAnimation();
    rotateAnim.setValue(0);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // 状态判定
  const isThinking = status === 'thinking';
  
  // 始终应用固定尺寸，避免布局抖动
  const wrapperStyle = styles.outerContainer;

  return (
    <View style={wrapperStyle} onLayout={(event) => {
        const {width, height} = event.nativeEvent.layout;
        // console.warn(`[LayoutDebug] Card: ${width}x${height}`); // Visible on screen
        console.log(`[TaskCard] onLayout: width=${width}, height=${height}. Status=${status}`);
    }}>
      <LinearGradient
          colors={['transparent', 'transparent']}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          style={styles.innerGradient}
      >
          {/* Thinking Indicator: Only show centered spinner when thinking, no text */}
          {isThinking && (
              <View style={styles.centerContainer}>
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                       <Image
                          source={require('../assets/ic_thinking.png')}
                          style={{width: 24, height: 24, opacity: 0.5}}
                          resizeMode="contain"
                      />
                  </Animated.View>
              </View>
          )}

          {/* Content Area: Force content to fill the 380x200 container */}
          {content && (
               <View style={styles.contentContainer}>
                   {/* Use cloneElement to inject style to force the Child DSL component to expand to full size */}
                   {React.isValidElement(content) ? React.cloneElement(content as React.ReactElement, {
                       style: [
                           (content.props as any).style, 
                           { width: 380, height: 200, flex: 1 } 
                       ]
                   }) : content}
               </View>
          )}
      </LinearGradient>
    </View>
  );
};

// Removed StatusRow component as text descriptions are no longer needed

const styles = StyleSheet.create({
  outerContainer: {
    width: 380, // Fixed width
    minHeight: 380, // Updated to 380 as requested
    marginVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  innerGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center', // Center thinking spinner
  },
  centerContainer: {
      position: 'absolute',
      top: 0, 
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
  },
  contentContainer: {
      flex: 1,
      width: '100%',
      // Ensure content sits on top if we kept the spinner, but we hide spinner when not thinking
  },
  // layerFull removed
});

export default TaskCard;
