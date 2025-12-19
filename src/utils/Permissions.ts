import { PermissionsAndroid, Platform, Alert } from 'react-native';

export class PermissionManager {
  /**
   * 检查并请求录音权限
   * @returns Promise<boolean> 是否获得权限
   */
  static async requestRecordAudioPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS暂不处理
    }

    try {
      // 检查是否已有权限
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      
      if (granted) {
        return true;
      }

      // 请求权限
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: '录音权限',
          message: '应用需要访问麦克风来进行语音识别功能',
          buttonNeutral: '稍后询问',
          buttonNegative: '取消',
          buttonPositive: '确定',
        }
      );

      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('请求录音权限失败:', error);
      return false;
    }
  }

  /**
   * 显示权限说明对话框
   * @returns Promise<boolean> 用户是否同意继续
   */
  static showPermissionRationale(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        '需要录音权限',
        '应用需要访问麦克风来进行语音识别功能，请在权限请求中点击"确定"。',
        [
          {
            text: '取消',
            onPress: () => resolve(false),
            style: 'cancel',
          },
          {
            text: '确定',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * 检查并请求录音权限（带用户说明）
   * @returns Promise<boolean> 是否获得权限
   */
  static async ensureRecordAudioPermission(): Promise<boolean> {
    // 先显示说明
    const userAgreed = await this.showPermissionRationale();
    if (!userAgreed) {
      return false;
    }

    // 再请求权限
    return this.requestRecordAudioPermission();
  }

  /**
   * 显示权限被拒绝的提示
   */
  static showPermissionDeniedAlert() {
    Alert.alert(
      '权限被拒绝',
      '无法使用语音识别功能，因为录音权限被拒绝。请在设置中手动开启权限。',
      [
        {
          text: '确定',
          style: 'default',
        },
      ]
    );
  }
}

export default PermissionManager;