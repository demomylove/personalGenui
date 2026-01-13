/**
 * IntentRecognitionService.ts
 *
 * 负责识别用户输入的意图类型，支持天气、音乐、POI、出行规划、卡通图片、车控、聊天等类型
 * 使用千问大模型进行意图识别，完全基于上下文语义分析
 */

export enum IntentType {
    WEATHER = 'weather',
    MUSIC = 'music',
    POI = 'poi',
    ROUTE_PLANNING = 'route_planning',
    CARTOON_IMAGE = 'cartoon_image',
    CAR_CONTROL = 'car_control',
    FLIGHT = 'flight',
    CHAT = 'chat',
    MODIFY = 'modify'
}

export interface IntentResult {
    intent: IntentType;
    confidence: number;
    extractedEntities?: Record<string, any>;
    reasoning?: string;
    /**
     * 提取的关键字（如 POI 关键词、城市名等）
     */
    extractedKeyword?: string;
    /**
     * 车控子类型（当 intent 为 car_control 时使用）
     */
    carControlSubType?: 'ac' | 'window' | 'seat' | 'light' | 'general';
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
 * 消息接口（兼容 OpenAI 格式）
 */
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
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
     * 识别用户输入的意图（多轮对话方式）
     * @param messages 消息历史数组，格式兼容 OpenAI API
     * @param config 上下文配置
     * @returns 意图识别结果
     */
    static async recognizeIntent(
        messages: Message[],
        config?: Partial<ContextConfig>
    ): Promise<IntentResult>;

    /**
     * 识别用户输入的意图（兼容旧版本）
     * @param userInput 用户输入的文本
     * @param conversationHistory 对话历史（query+回复）
     * @param config 上下文配置
     * @returns 意图识别结果
     */
    static async recognizeIntent(
        userInput: string,
        conversationHistory?: ConversationTurn[],
        config?: Partial<ContextConfig>
    ): Promise<IntentResult>;

    /**
     * 识别用户输入的意图的实现
     */
    static async recognizeIntent(
        userInputOrMessages: string | Message[],
        conversationHistoryOrConfig?: ConversationTurn[] | Partial<ContextConfig>,
        config?: Partial<ContextConfig>
    ): Promise<IntentResult> {
        const startTime = Date.now();
        const inputType = Array.isArray(userInputOrMessages) ? 'messages' : 'string';
        console.log(`[IntentRecognitionService] recognizeIntent called with ${inputType} input`);
        
        try {
            // 判断是新的多轮对话方式还是旧的单轮对话方式
            if (Array.isArray(userInputOrMessages)) {
                // 新的多轮对话方式
                const finalConfig = { ...this.DEFAULT_CONFIG, ...conversationHistoryOrConfig as Partial<ContextConfig> };
                const result = await this.recognizeIntentWithMessages(userInputOrMessages, finalConfig);
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                console.log(`[IntentRecognitionService] Total recognizeIntent duration: ${duration}ms`);
                return result;
            } else {
                // 旧的单轮对话方式，转换为消息数组
                const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
                const messages = this.convertToMessages(userInputOrMessages, conversationHistoryOrConfig as ConversationTurn[], finalConfig);
                const result = await this.recognizeIntentWithMessages(messages, finalConfig);
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                console.log(`[IntentRecognitionService] Total recognizeIntent duration: ${duration}ms`);
                return result;
            }
        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            console.error('Intent Recognition Failed:', error);
            console.error(`[IntentRecognitionService] Failed recognizeIntent duration: ${duration}ms`);
            return this.getDefaultIntentResult();
        }
    }

    /**
     * 使用消息数组进行意图识别
     * @param messages 消息历史数组
     * @param config 上下文配置
     * @returns 意图识别结果
     */
    private static async recognizeIntentWithMessages(
        messages: Message[],
        config: ContextConfig
    ): Promise<IntentResult> {
        const startTime = Date.now();
        console.log(`[IntentRecognitionService] Starting intent recognition... (Messages: ${messages.length})`);
        
        // 限制消息数量，最多保留10组对话（20条消息）
        const maxMessages = config.maxTurns * 2;
        const limitedMessages = messages.slice(-maxMessages);
        
        // 确保第一条消息是系统消息
        const systemMessage: Message = {
            role: "system",
            content: this.buildSystemPrompt()
        };
        
        // 如果第一条不是系统消息，添加系统消息
        const finalMessages = limitedMessages[0]?.role === 'system'
            ? limitedMessages
            : [systemMessage, ...limitedMessages];

        const response = await fetch(this.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.API_KEY}`
            },
            body: JSON.stringify({
                model: "qwen-flash",
                messages: finalMessages,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            console.error(`Intent Recognition API Error: ${response.statusText}`);
            console.error(`[IntentRecognitionService] Failed intent recognition duration: ${duration}ms`);
            return this.getDefaultIntentResult();
        }

        const data: any = await response.json();
        const content = data.choices[0].message.content;
        const result = JSON.parse(content);
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`[IntentRecognitionService] Intent recognition completed in ${duration}ms`);

        // 标准化结果
        return this.normalizeIntentResult(result);
    }

    /**
     * 将旧格式的输入转换为消息数组格式
     * @param userInput 用户输入
     * @param conversationHistory 对话历史
     * @param config 配置
     * @returns 消息数组
     */
    private static convertToMessages(
        userInput: string,
        conversationHistory?: ConversationTurn[],
        config?: ContextConfig
    ): Message[] {
        const messages: Message[] = [];
        
        // 添加对话历史
        if (config?.enableContextAwareness && conversationHistory && conversationHistory.length > 0) {
            const maxTurns = config.maxTurns || 10;
            const recentHistory = conversationHistory.slice(-maxTurns);
            
            recentHistory.forEach(turn => {
                messages.push({
                    role: "user",
                    content: turn.query
                });
                messages.push({
                    role: "assistant",
                    content: turn.response
                });
            });
        }
        
        // 添加当前用户输入
        messages.push({
            role: "user",
            content: userInput
        });
        
        return messages;
    }

    /**
     * 构建系统提示词
     */
    private static buildSystemPrompt(): string {
        let prompt = '';
        
        prompt += `# 意图识别任务\n\n`;
        prompt += `你的任务是分析用户的输入，识别用户的真实意图。\n\n`;
        
        prompt += `## 核心原则\n\n`;
        prompt += `1. **上下文优先**：意图识别必须基于对话历史和上下文连贯性，而不是简单的关键词匹配。\n`;
        prompt += `2. **语义理解**：理解用户当前输入的语义，判断是延续上一轮话题还是开启新话题。\n`;
        prompt += `3. **权重分配**：最新的用户输入权重最高，但需要结合历史对话进行综合判断。\n\n`;
        
        prompt += `## 意图类型定义\n\n`;
        prompt += `请根据以下意图类型定义进行识别：\n\n`;
        prompt += `1. **weather** - 天气查询相关的意图\n`;
        prompt += `2. **music** - 音乐播放、搜索相关的意图\n`;
        prompt += `3. **poi** - 地点搜索、查找附近的设施相关的意图\n`;
        prompt += `4. **route_planning** - 路线规划、导航相关的意图\n`;
        prompt += `5. **cartoon_image** - 生成、绘制图片相关的意图\n`;
        prompt += `6. **car_control** - 车控相关的意图（包括空调、车窗、座椅、灯光等车辆控制）\n`;
        prompt += `7. **flight** - 航班查询、高铁/火车查询相关的意图\n`;
        prompt += `8. **chat** - 普通聊天对话\n`;
        prompt += `9. **modify** - 对上一个结果的修改或增加意图\n\n`;
        
        prompt += `## 车控子类型定义（当意图为 car_control 时）\n\n`;
        prompt += `当识别为车控意图时，请进一步识别具体的控制类型：\n\n`;
        prompt += `- **ac** - 空调控制（关键词：空调、温度、制冷、制热、调节温度）\n`;
        prompt += `- **window** - 车窗控制（关键词：车窗、打开车窗、关闭车窗、降下车窗、升起车窗）\n`;
        prompt += `- **seat** - 座椅控制（关键词：座椅、调节座椅、座椅加热、座椅通风）\n`;
        prompt += `- **light** - 灯光控制（关键词：灯光、车灯、开灯、关灯、大灯、雾灯）\n`;
        prompt += `- **general** - 通用车控（无法确定具体类型时使用）\n\n`;
        
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
        
        prompt += `### 3. 修改类型识别\n\n`;
        prompt += `当用户输入是对上一个结果的修改或增加时，应识别为 modify 意图。\n\n`;
        prompt += `**修改类型的信号**：\n`;
        prompt += `- 使用修改动词：如"改成"、"换成"、"修改"、"调整"、"增加"、"添加"、"删除"、"去掉"\n`;
        prompt += `- 使用指代性表达：如"这个卡片"、"这个界面"、"这个结果"、"上面那个"\n`;
        prompt += `- 明确表示对上一个结果的修改：如"在这个天气卡片，将背景改为红色"、"在这个卡片上增加一只动物"\n\n`;
        prompt += `**重要规则**：\n`;
        prompt += `- 修改类型必须有明确的上一轮结果作为修改对象\n`;
        prompt += `- 如果没有对话历史，或者上一轮是 chat，不应识别为 modify\n`;
        prompt += `- 修改类型的优先级高于其他意图类型，当用户明确表示修改时，应优先识别为 modify\n\n`;

        prompt += `### 4. 特殊情况处理\n\n`;
        prompt += `**关于"卡片"和"图片"的识别**：\n`;
        prompt += `- "卡片"和"图片"都是通用的UI元素称呼，不是特定意图的标识\n`;
        prompt += `- 当用户说"将卡片/图片颜色改成绿色"、"这张卡片/图片的背景改成淡绿色"时，需要结合上下文判断：\n`;
        prompt += `  - 如果上一轮是 route_planning、poi、weather、music 等明确意图，且用户明确表示修改，应识别为 modify\n`;
        prompt += `  - 如果上一轮是 chat，应识别为 chat\n`;
        prompt += `- "卡片/图片"可能指代天气卡片、路线卡片、POI卡片、音乐卡片等任何UI组件\n`;
        prompt += `- **关键规则**：只有当用户明确使用"画"、"生成"、"绘制"等创作动词时，才识别为 cartoon_image 意图\n`;
        prompt += `- 如果用户说"把...改成"、"将...换成"、"修改..."等修改类动词，且指代明确的结果，应识别为 modify\n\n`;
        
        prompt += `## 返回格式\n\n`;
        prompt += `请返回JSON格式结果：\n`;
        prompt += `{\n`;
        prompt += `  "intent": "意图类型 (weather/music/poi/route_planning/cartoon_image/car_control/chat/modify)",\n`;
        prompt += `  "confidence": 0.0-1.0之间的置信度分数,\n`;
        prompt += `  "extractedEntities": {\n`;
        prompt += `    "city": "城市名 (如果适用)",\n`;
        prompt += `    "keyword": "搜索关键词 (如果适用，如POI搜索的'咖啡厅')",\n`;
        prompt += `    "origin": "出发地 (如果适用)", \n`;
        prompt += `    "destination": "目的地 (如果适用)",\n`;
        prompt += `    "description": "图片描述 (如果适用)",\n`;
        prompt += `    "modificationType": "修改类型 (如'颜色'、'背景'、'添加元素'等，仅当intent为modify时)",\n`;
        prompt += `    "modificationTarget": "修改目标 (如'卡片'、'界面'、'图片'等，仅当intent为modify时)"\n`;
        prompt += `  },\n`;
        prompt += `  "extractedKeyword": "从用户输入中提取的关键字 (如POI关键词、城市名等)",\n`;
        prompt += `  "carControlSubType": "车控子类型 (ac/window/seat/light/general，仅当intent为car_control时)",\n`;
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
            reasoning: result.reasoning || '',
            extractedKeyword: result.extractedKeyword || '',
            carControlSubType: result.carControlSubType
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
            'car_control': IntentType.CAR_CONTROL,
            'flight': IntentType.FLIGHT,
            'chat': IntentType.CHAT,
            'modify': IntentType.MODIFY,
            'unknown': IntentType.CHAT  // 将 unknown 映射为 chat
        };

        return intentMap[intentStr.toLowerCase()] || IntentType.CHAT;  // 默认为 chat
    }

    /**
     * 获取默认意图结果
     */
    private static getDefaultIntentResult(): IntentResult {
        return {
            intent: IntentType.CHAT,  // 默认为 chat
            confidence: 0.3,
            extractedEntities: {},
            reasoning: 'API调用失败，使用默认意图'
        };
    }

    /**
     * 创建新的消息数组
     * @returns 初始化的消息数组
     */
    static createEmptyMessages(): Message[] {
        return [];
    }

    /**
     * 添加用户消息到消息数组
     * @param messages 当前消息数组
     * @param content 用户消息内容
     * @returns 更新后的消息数组
     */
    static addUserMessage(messages: Message[], content: string): Message[] {
        const newMessages = [...messages];
        newMessages.push({
            role: 'user',
            content
        });
        return this.limitMessages(newMessages);
    }

    /**
     * 添加助手回复到消息数组
     * @param messages 当前消息数组
     * @param content 助手回复内容
     * @returns 更新后的消息数组
     */
    static addAssistantMessage(messages: Message[], content: string): Message[] {
        const newMessages = [...messages];
        newMessages.push({
            role: 'assistant',
            content
        });
        return this.limitMessages(newMessages);
    }

    /**
     * 限制消息数组大小，最多保留10组对话（20条消息）
     * @param messages 消息数组
     * @returns 限制后的消息数组
     */
    static limitMessages(messages: Message[]): Message[] {
        const maxMessages = 20; // 10组对话，每组包含用户消息和助手回复
        return messages.slice(-maxMessages);
    }

    /**
     * 获取消息数组中的对话轮数
     * @param messages 消息数组
     * @returns 对话轮数
     */
    static getConversationTurns(messages: Message[]): number {
        // 计算用户消息的数量，即为对话轮数
        return messages.filter(msg => msg.role === 'user').length;
    }

    /**
     * 将消息数组转换为 ConversationTurn 数组（用于兼容旧代码）
     * @param messages 消息数组
     * @returns ConversationTurn 数组
     */
    static messagesToConversationTurns(messages: Message[]): ConversationTurn[] {
        const turns: ConversationTurn[] = [];
        let userMessage: Message | null = null;
        
        for (const message of messages) {
            if (message.role === 'user') {
                userMessage = message;
            } else if (message.role === 'assistant' && userMessage) {
                turns.push({
                    query: userMessage.content,
                    response: message.content,
                    timestamp: Date.now()
                });
                userMessage = null;
            }
        }
        
        return turns;
    }

    /**
     * 获取最后一条用户消息
     * @param messages 消息数组
     * @returns 最后一条用户消息，如果没有则返回null
     */
    static getLastUserMessage(messages: Message[]): string | null {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                return messages[i].content;
            }
        }
        return null;
    }

    /**
     * 获取最后一条助手消息
     * @param messages 消息数组
     * @returns 最后一条助手消息，如果没有则返回null
     */
    static getLastAssistantMessage(messages: Message[]): string | null {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'assistant') {
                return messages[i].content;
            }
        }
        return null;
    }
}
