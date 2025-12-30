/**
 * IntentRecognitionService.ts
 * 
 * 负责识别用户输入的意图类型，支持天气、音乐、POI、出行规划、卡通图片、聊天等类型
 * 使用千问大模型进行意图识别，完全基于上下文语义分析
 */

export enum IntentType {
    WEATHER = 'weather',
    MUSIC = 'music',
    POI = 'poi',
    ROUTE_PLANNING = 'route_planning',
    CARTOON_IMAGE = 'cartoon_image',
    AC_CONTROL = 'ac_control',
    CHAT = 'chat',
    UNKNOWN = 'unknown'
}

export interface IntentResult {
    intent: IntentType;
    confidence: number;
    extractedEntities?: Record<string, any>;
    reasoning?: string;
}

/**
 * 对话轮次接口
 */
export interface ConversationTurn {
    query: string;
    response: string;
    timestamp: number;
}

/**
 * 上下文配置接口
 */
export interface ContextConfig {
    maxTurns: number;
    enableContextAwareness: boolean;
}

export class IntentRecognitionService {
    // 使用与LLMService相同的API配置
    private static API_ENDPOINT = process.env.QWEN_API_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    private static API_KEY = process.env.QWEN_API_KEY || 'sk-7fa0884c562d4009b1a23bb5d52e965a';

    // 默认配置
    private static DEFAULT_CONFIG: ContextConfig = {
        maxTurns: 10,
        enableContextAwareness: true
    };

    /**
     * 识别用户输入的意图（完全基于上下文）
     * @param userInput 用户输入的文本
     * @param conversationHistory 对话历史（query+回复）
     * @param config 上下文配置
     * @returns 意图识别结果
     */
    static async recognizeIntent(
        userInput: string,
        conversationHistory?: ConversationTurn[],
        config?: Partial<ContextConfig>
    ): Promise<IntentResult> {
        try {
            const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
            const prompt = this.buildContextAwarePrompt(userInput, conversationHistory, finalConfig);

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
                            content: "你是一个专业的意图识别助手。请基于对话历史和上下文语义分析用户输入的意图，而不是简单匹配关键词。请严格按照JSON格式返回结果。"
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
     * 构建基于上下文的意图识别提示词
     */
    private static buildContextAwarePrompt(
        userInput: string,
        conversationHistory?: ConversationTurn[],
        config?: ContextConfig
    ): string {
        let prompt = '';

        // 核心原则：基于上下文语义分析
        prompt += `# 意图识别任务\n\n`;
        prompt += `你的任务是分析用户的当前输入，结合对话历史，识别用户的真实意图。\n\n`;

        prompt += `## 核心原则\n\n`;
        prompt += `1. **上下文优先**：意图识别必须基于对话历史和上下文连贯性，而不是简单的关键词匹配。\n`;
        prompt += `2. **语义理解**：理解用户当前输入的语义，判断是延续上一轮话题还是开启新话题。\n`;
        prompt += `3. **权重分配**：最新的用户输入权重最高，但需要结合历史对话进行综合判断。\n\n`;

        // 构建对话历史
        if (config?.enableContextAwareness && conversationHistory && conversationHistory.length > 0) {
            const maxTurns = config.maxTurns || 10;
            const recentHistory = conversationHistory.slice(-maxTurns);

            prompt += `## 对话历史（最近${recentHistory.length}轮）\n\n`;
            prompt += `每轮对话包含用户的查询和助手的回复。越新的轮次权重越高。\n\n`;

            recentHistory.forEach((turn, index) => {
                const turnNum = index + 1;
                // 计算权重：越新的轮次权重越高
                const weight = 1 + (index / recentHistory.length);
                prompt += `### 第${turnNum}轮对话（权重: ${weight.toFixed(2)}）\n`;
                prompt += `**用户查询**: "${turn.query}"\n`;
                prompt += `**助手回复**: "${turn.response.substring(0, 300)}${turn.response.length > 300 ? '...' : ''}"\n\n`;
            });

            prompt += `---\n\n`;
        }

        prompt += `## 当前用户输入（权重最高）\n\n`;
        prompt += `"${userInput}"\n\n`;

        prompt += `## 意图类型定义\n\n`;
        prompt += `请根据以下意图类型定义进行识别：\n\n`;
        prompt += `1. **weather** - 天气查询相关的意图\n`;
        prompt += `2. **music** - 音乐播放、搜索相关的意图\n`;
        prompt += `3. **poi** - 地点搜索、查找附近的设施相关的意图\n`;
        prompt += `4. **route_planning** - 路线规划、导航相关的意图\n`;
        prompt += `5. **cartoon_image** - 生成、绘制图片相关的意图\n`;
        prompt += `6. **ac_control** - 空调控制相关的意图\n`;
        prompt += `7. **chat** - 普通聊天对话\n\n`;

        prompt += `## 意图识别策略\n\n`;
        prompt += `### 1. 判断是否延续上一轮话题\n\n`;
        prompt += `如果当前输入是对上一轮对话的延续或修改，应保持与上一轮相同的意图。\n\n`;
        prompt += `**延续话题的信号**：\n`;
        prompt += `- 使用代词：如"它"、"这个"、"那个"、"把..."\n`;
        prompt += `- 使用修改动词：如"改成"、"换成"、"修改"、"调整"\n`;
        prompt += `- 语义模糊：如"大一点"、"换个颜色"、"换张图"\n`;
        prompt += `- 指代性表达：如"卡片"、"界面"、"内容"\n\n`;
        prompt += `**重要限制**：\n`;
        prompt += `- 只有当上一轮意图明确且不是 chat 或 unknown 时，才考虑延续该意图\n`;
        prompt += `- 如果上一轮是 chat 或 unknown，且当前输入是修改样式，应识别为 chat\n`;
        prompt += `- 如果没有对话历史，不要猜测意图，应基于当前输入的语义进行识别\n\n`;

        prompt += `### 2. 判断是否开启新话题\n\n`;
        prompt += `如果当前输入明确表示一个新的请求或话题，应识别为新意图。\n\n`;
        prompt += `**新话题的信号**：\n`;
        prompt += `- 明确的请求动词：如"画"、"生成"、"创建"、"播放"、"搜索"\n`;
        prompt += `- 具体的内容描述：如"一只小狗"、"上海天气"、"附近的咖啡"\n`;
        prompt += `- 完整的句子结构：如"帮我规划..."、"我想听..."\n\n`;
        prompt += `**重要限制**：\n`;
        prompt += `- 如果当前输入没有明确的请求动词或具体内容，不要识别为特定意图\n`;
        prompt += `- 如果无法确定意图，应识别为 chat 或 unknown\n\n`;

        prompt += `### 3. 特殊情况处理\n\n`;
        prompt += `**关于"卡片"的识别**：\n`;
        prompt += `- "卡片"是一个通用的UI元素称呼，不是特定意图的标识\n`;
        prompt += `- 当用户说"将卡片颜色改成绿色"时，需要结合上下文判断：\n`;
        prompt += `  - 如果上一轮是 route_planning、poi、weather、music 等明确意图，保持该意图\n`;
        prompt += `  - 如果上一轮是 chat 或 unknown，应识别为 chat\n`;
        prompt += `- "卡片"可能指代天气卡片、路线卡片、POI卡片、音乐卡片等任何UI组件\n`;
        prompt += `- 只有当用户明确说"画"、"生成"等动词时，才识别为cartoon_image意图\n\n`;

        prompt += `## 返回格式\n\n`;
        prompt += `请返回JSON格式结果：\n`;
        prompt += `{\n`;
        prompt += `  "intent": "意图类型 (weather/music/poi/route_planning/cartoon_image/ac_control/chat/unknown)",\n`;
        prompt += `  "confidence": 0.0-1.0之间的置信度分数,\n`;
        prompt += `  "extractedEntities": {\n`;
        prompt += `    "city": "城市名 (如果适用)",\n`;
        prompt += `    "keyword": "搜索关键词 (如果适用)",\n`;
        prompt += `    "origin": "出发地 (如果适用)", \n`;
        prompt += `    "destination": "目的地 (如果适用)",\n`;
        prompt += `    "description": "图片描述 (如果适用)"\n`;
        prompt += `  },\n`;
        prompt += `  "reasoning": "详细的识别理由，说明如何基于上下文进行分析"\n`;
        prompt += `}\n\n`;

        return prompt;
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
            'ac_control': IntentType.AC_CONTROL,
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
     * 基于关键词的快速意图识别（仅作为备选方案，不建议使用）
     * 注意：此方法不使用上下文，仅基于关键词，准确度较低
     */
    static quickIntentRecognition(userInput: string): IntentResult {
        console.warn('[IntentRecognitionService] quickIntentRecognition is called, which does not use context. Consider using recognizeIntent with conversationHistory for better accuracy.');
        
        const lowerInput = userInput.toLowerCase();

        // 天气关键词
        if (lowerInput.includes('天气') || lowerInput.includes('气温') || lowerInput.includes('下雨') || lowerInput.includes('晴天')) {
            return {
                intent: IntentType.WEATHER,
                confidence: 0.5,
                extractedEntities: {},
                reasoning: '关键词匹配（无上下文）：天气相关'
            };
        }

        // 音乐关键词
        if (lowerInput.includes('音乐') || lowerInput.includes('歌曲') || lowerInput.includes('播放') || lowerInput.includes('歌手')) {
            return {
                intent: IntentType.MUSIC,
                confidence: 0.5,
                extractedEntities: {},
                reasoning: '关键词匹配（无上下文）：音乐相关'
            };
        }

        // POI关键词
        if (lowerInput.includes('附近') || lowerInput.includes('查找') || lowerInput.includes('咖啡') || lowerInput.includes('餐厅')) {
            return {
                intent: IntentType.POI,
                confidence: 0.5,
                extractedEntities: {},
                reasoning: '关键词匹配（无上下文）：POI搜索'
            };
        }

        // 出行规划关键词
        if (lowerInput.includes('去') || lowerInput.includes('到') || lowerInput.includes('导航') || lowerInput.includes('路线')) {
            return {
                intent: IntentType.ROUTE_PLANNING,
                confidence: 0.5,
                extractedEntities: {},
                reasoning: '关键词匹配（无上下文）：出行规划'
            };
        }

        // 卡通图片关键词（排除"卡片"相关的修改请求）
        const hasCardModification = lowerInput.includes('卡片') && (
            lowerInput.includes('改成') || lowerInput.includes('换成') ||
            lowerInput.includes('颜色') || lowerInput.includes('字体') ||
            lowerInput.includes('大小') || lowerInput.includes('样式')
        );
        
        const hasImageGenerationKeywords = (lowerInput.includes('画') || lowerInput.includes('生成')) &&
                                          (lowerInput.includes('图片') || lowerInput.includes('卡通'));
        
        if (hasImageGenerationKeywords && !hasCardModification) {
            return {
                intent: IntentType.CARTOON_IMAGE,
                confidence: 0.5,
                extractedEntities: {},
                reasoning: '关键词匹配（无上下文）：图片生成'
            };
        }

        // 空调控制关键词
        if (lowerInput.includes('空调') || lowerInput.includes('温度') || lowerInput.includes('调节') || lowerInput.includes('制冷') || lowerInput.includes('制热')) {
            return {
                intent: IntentType.AC_CONTROL,
                confidence: 0.5,
                extractedEntities: {},
                reasoning: '关键词匹配（无上下文）：空调控制'
            };
        }

        // 默认为聊天
        return {
            intent: IntentType.CHAT,
            confidence: 0.3,
            extractedEntities: {},
            reasoning: '关键词匹配（无上下文）：无特定关键词，默认为聊天'
        };
    }
}
