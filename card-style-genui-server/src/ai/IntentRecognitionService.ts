/**
 * IntentRecognitionService.ts
 * 
 * 负责识别用户输入的意图类型，支持天气、音乐、POI、出行规划、卡通图片、聊天等类型
 * 使用千问大模型进行意图识别
 */

export enum IntentType {
    WEATHER = 'weather',
    MUSIC = 'music', 
    POI = 'poi',
    ROUTE_PLANNING = 'route_planning',
    CARTOON_IMAGE = 'cartoon_image',
    CHAT = 'chat',
    UNKNOWN = 'unknown'
}

export interface IntentResult {
    intent: IntentType;
    confidence: number;
    extractedEntities?: Record<string, any>;
    reasoning?: string;
}

export class IntentRecognitionService {
    // 使用与LLMService相同的API配置
    private static API_ENDPOINT = process.env.QWEN_API_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    private static API_KEY = process.env.QWEN_API_KEY || 'sk-7fa0884c562d4009b1a23bb5d52e965a';

    /**
     * 识别用户输入的意图
     * @param userInput 用户输入的文本
     * @returns 意图识别结果
     */
    static async recognizeIntent(userInput: string): Promise<IntentResult> {
        try {
            const prompt = this.buildIntentRecognitionPrompt(userInput);
            
            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: JSON.stringify({
                    model: "qwen-flash",
                    messages: [
                        {
                            role: "system",
                            content: "你是一个专业的意图识别助手。请分析用户输入，识别其意图类型，并提取相关实体。请严格按照JSON格式返回结果。"
                        },
                        {
                            role: "user", 
                            content: prompt
                        }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                console.error(`Intent Recognition API Error: ${response.statusText}`);
                return this.getDefaultIntentResult();
            }

            const data: any = await response.json();
            const content = data.choices[0].message.content;
            const result = JSON.parse(content);

            // 标准化结果
            return this.normalizeIntentResult(result);

        } catch (error) {
            console.error('Intent Recognition Failed:', error);
            return this.getDefaultIntentResult();
        }
    }

    /**
     * 构建意图识别的提示词
     */
    private static buildIntentRecognitionPrompt(userInput: string): string {
        return `
请分析以下用户输入，识别其意图类型并提取相关实体。

用户输入: "${userInput}"

支持的意图类型:
1. weather - 天气查询 (包含"天气"、"气温"、"下雨"、"晴天"等关键词)
2. music - 音乐相关 (包含"音乐"、"歌曲"、"播放"、"歌手"、"周杰伦"等关键词)  
3. poi - POI搜索 (包含"附近"、"查找"、"咖啡"、"餐厅"、"商场"等关键词)
4. route_planning - 出行规划 (包含"去"、"到"、"导航"、"路线"、"从...到..."等关键词)
5. cartoon_image - 卡通图片生成 (包含"画"、"生成"、"图片"、"卡通"、"可爱的小狗"等关键词)
6. chat - 普通聊天 (不包含以上特定意图的日常对话)

请返回JSON格式结果，包含以下字段:
{
  "intent": "意图类型 (weather/music/poi/route_planning/cartoon_image/chat/unknown)",
  "confidence": 0.0-1.0之间的置信度分数,
  "extractedEntities": {
    "city": "城市名 (如果适用)",
    "keyword": "搜索关键词 (如果适用)",
    "origin": "出发地 (如果适用)", 
    "destination": "目的地 (如果适用)",
    "description": "图片描述 (如果适用)"
  },
  "reasoning": "识别理由的简要说明"
}

示例:
用户输入: "上海今天天气怎么样"
返回: {"intent": "weather", "confidence": 0.95, "extractedEntities": {"city": "上海"}, "reasoning": "包含'天气'关键词和城市名"}

用户输入: "播放周杰伦的歌"  
返回: {"intent": "music", "confidence": 0.9, "extractedEntities": {"artist": "周杰伦"}, "reasoning": "包含'播放'和歌手名"}

用户输入: "附近的咖啡店"
返回: {"intent": "poi", "confidence": 0.85, "extractedEntities": {"keyword": "咖啡"}, "reasoning": "包含'附近'和'咖啡'"}
`;
    }

    /**
     * 标准化意图识别结果
     */
    private static normalizeIntentResult(result: any): IntentResult {
        const intent = this.mapToIntentType(result.intent);
        
        return {
            intent,
            confidence: result.confidence || 0.5,
            extractedEntities: result.extractedEntities || {},
            reasoning: result.reasoning || ''
        };
    }

    /**
     * 将字符串映射到IntentType枚举
     */
    private static mapToIntentType(intentStr: string): IntentType {
        const intentMap: Record<string, IntentType> = {
            'weather': IntentType.WEATHER,
            'music': IntentType.MUSIC,
            'poi': IntentType.POI,
            'route_planning': IntentType.ROUTE_PLANNING,
            'cartoon_image': IntentType.CARTOON_IMAGE,
            'chat': IntentType.CHAT,
            'unknown': IntentType.UNKNOWN
        };

        return intentMap[intentStr.toLowerCase()] || IntentType.UNKNOWN;
    }

    /**
     * 获取默认意图结果
     */
    private static getDefaultIntentResult(): IntentResult {
        return {
            intent: IntentType.UNKNOWN,
            confidence: 0.3,
            extractedEntities: {},
            reasoning: 'API调用失败，使用默认意图'
        };
    }

    /**
     * 基于关键词的快速意图识别（作为备选方案）
     */
    static quickIntentRecognition(userInput: string): IntentResult {
        const lowerInput = userInput.toLowerCase();
        
        // 天气关键词
        if (lowerInput.includes('天气') || lowerInput.includes('气温') || lowerInput.includes('下雨') || lowerInput.includes('晴天')) {
            return {
                intent: IntentType.WEATHER,
                confidence: 0.8,
                extractedEntities: {},
                reasoning: '关键词匹配：天气相关'
            };
        }

        // 音乐关键词
        if (lowerInput.includes('音乐') || lowerInput.includes('歌曲') || lowerInput.includes('播放') || lowerInput.includes('歌手')) {
            return {
                intent: IntentType.MUSIC,
                confidence: 0.8,
                extractedEntities: {},
                reasoning: '关键词匹配：音乐相关'
            };
        }

        // POI关键词
        if (lowerInput.includes('附近') || lowerInput.includes('查找') || lowerInput.includes('咖啡') || lowerInput.includes('餐厅')) {
            return {
                intent: IntentType.POI,
                confidence: 0.8,
                extractedEntities: {},
                reasoning: '关键词匹配：POI搜索'
            };
        }

        // 出行规划关键词
        if (lowerInput.includes('去') || lowerInput.includes('到') || lowerInput.includes('导航') || lowerInput.includes('路线')) {
            return {
                intent: IntentType.ROUTE_PLANNING,
                confidence: 0.8,
                extractedEntities: {},
                reasoning: '关键词匹配：出行规划'
            };
        }

        // 卡通图片关键词
        if (lowerInput.includes('画') || lowerInput.includes('生成') || lowerInput.includes('图片') || lowerInput.includes('卡通')) {
            return {
                intent: IntentType.CARTOON_IMAGE,
                confidence: 0.8,
                extractedEntities: {},
                reasoning: '关键词匹配：图片生成'
            };
        }

        // 默认为聊天
        return {
            intent: IntentType.CHAT,
            confidence: 0.6,
            extractedEntities: {},
            reasoning: '无特定关键词，默认为聊天'
        };
    }
}