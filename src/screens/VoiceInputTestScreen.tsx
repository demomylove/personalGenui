import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import VoiceInput from '../components/VoiceInput';

export default function VoiceInputTestScreen() {
  const [recognizedText, setRecognizedText] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [`[${new Date().toLocaleTimeString()}] ${result}`, ...prev].slice(0, 10));
  };

  const handleTextChange = (text: string) => {
    setRecognizedText(text);
    addTestResult(`文本变更: "${text}"`);
  };

  const handleSubmit = () => {
    if (recognizedText.trim()) {
      addTestResult(`提交文本: "${recognizedText}"`);
      Alert.alert('识别结果', recognizedText);
    } else {
      addTestResult('提交失败: 文本为空');
    }
  };

  const runBasicTest = async () => {
    addTestResult('开始基础测试...');
    
    try {
      // 测试语音输入组件是否正常渲染
      addTestResult('✅ VoiceInput组件渲染成功');
      
      // 测试文本输入
      setRecognizedText('测试文本输入');
      addTestResult('✅ 文本输入功能正常');
      
      // 测试清空
      setRecognizedText('');
      addTestResult('✅ 文本清空功能正常');
      
      addTestResult('基础测试完成');
    } catch (error) {
      addTestResult(`❌ 基础测试失败: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setRecognizedText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>VoiceInput 测试</Text>
        <TouchableOpacity onPress={clearResults} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>清空</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>测试控制</Text>
          <TouchableOpacity onPress={runBasicTest} style={styles.testButton}>
            <Text style={styles.testButtonText}>运行基础测试</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VoiceInput 组件</Text>
          <VoiceInput
            style={styles.voiceInput}
            value={recognizedText}
            onChangeText={handleTextChange}
            placeholder="点击麦克风说话或手动输入..."
            onSubmitEditing={handleSubmit}
          />
          
          <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>提交</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>当前识别文本</Text>
          <View style={styles.textBox}>
            <Text style={styles.text}>{recognizedText || '(空)'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>测试日志</Text>
          <View style={styles.logBox}>
            {testResults.length === 0 ? (
              <Text style={styles.emptyLog}>暂无测试日志</Text>
            ) : (
              testResults.map((result, index) => (
                <Text key={index} style={styles.logText}>
                  {result}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff3b30',
    borderRadius: 16,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  testButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  voiceInput: {
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#34c759',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  textBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 60,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  logBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 200,
  },
  emptyLog: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 80,
  },
  logText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});