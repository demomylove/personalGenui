import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RobotIconProps {
  size?: number;
}

const RobotIcon: React.FC<RobotIconProps> = ({ size = 32 }) => {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={styles.robotFace}>
        <View style={styles.robotHead}>
          {/* 机器人天线 */}
          <View style={styles.antenna}>
            <View style={styles.antennaLine} />
            <View style={styles.antennaBall} />
          </View>
          {/* 机器人眼睛 */}
          <View style={styles.eyes}>
            <View style={[styles.eye, styles.leftEye]} />
            <View style={[styles.eye, styles.rightEye]} />
          </View>
          {/* 机器人嘴巴 */}
          <View style={styles.mouth} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  robotFace: {
    width: '70%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  robotHead: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  antenna: {
    position: 'absolute',
    top: -8,
    alignItems: 'center',
  },
  antennaLine: {
    width: 2,
    height: 6,
    backgroundColor: '#6366F1',
  },
  antennaBall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366F1',
    marginTop: -1,
  },
  eyes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
    marginBottom: 4,
  },
  eye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  leftEye: {
    marginLeft: 2,
  },
  rightEye: {
    marginRight: 2,
  },
  mouth: {
    width: '40%',
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
});

export default RobotIcon;