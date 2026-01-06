import fetch from 'node-fetch';

export class AliyunImageService {
    // Determine API Key: prefer DASHSCOPE_API_KEY, fallback to QWEN_API_KEY
    private static getApiKey(): string {
        return process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || 'sk-7fa0884c562d4009b1a23bb5d52e965a';
    }

    private static API_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';

    /**
     * Generate an image using Aliyun Qwen-Image-Plus
     * @param prompt Text description
     * @returns URL of the generated image
     */
    static async generateImage(prompt: string): Promise<string | null> {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            console.error('[AliyunImageService] No API KEY found (DASHSCOPE_API_KEY or QWEN_API_KEY).');
            return null;
        }

        console.log(`[AliyunImageService] Generating image for prompt: "${prompt}"...`);

        try {
            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-DashScope-Async': 'enable'
                },
                body: JSON.stringify({
                    model: "wanx-v1",
                    input: {
                        prompt: prompt
                    },
                    parameters: {
                        style: "<auto>",
                        size: "1024*1024",
                        n: 1
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[AliyunImageService] API Error (${response.status}): ${errText}`);
                return null;
            }

            const data: any = await response.json();
            
            // Check if it's a sync response or async task
            if (data.output && data.output.task_status === 'SUCCEEDED' && data.output.results) {
                 // Sync success matches this structure too? 
                 // Actually, for sync, it might just return output.results directly or task_status SUCCEEDED immediately.
                 const url = data.output.results[0]?.url;
                 if (url) return url;
            }
            
            // If it returns a task_id (Async flow), we technically need to poll. 
            // BUT user said Sync is supported. Let me try to see if it just returns the result.
            // If data.output.task_id exists and status is PENDING/RUNNING, we must poll.
            if (data.output && data.output.task_id) {
                 console.log(`[AliyunImageService] Got Task ID: ${data.output.task_id}. Polling...`);
                 return await this.pollTask(data.output.task_id, apiKey);
            }

             // Fallback: maybe structure is different
             if (data.output && data.output.results) {
                 return data.output.results[0]?.url;
             }

            console.error('[AliyunImageService] Unexpected response format:', JSON.stringify(data));
            return null;

        } catch (error) {
            console.error('[AliyunImageService] Request Failed:', error);
            return null;
        }
    }

    private static async pollTask(taskId: string, apiKey: string): Promise<string | null> {
        const taskEndpoint = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
        
        const startTime = Date.now();
        const timeout = 60000; // 60s timeout

        while (Date.now() - startTime < timeout) {
            await new Promise(r => setTimeout(r, 2000)); // Wait 2s

            try {
                const res = await fetch(taskEndpoint, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                const data: any = await res.json();
                
                if (data.output && data.output.task_status === 'SUCCEEDED') {
                     return data.output.results[0]?.url;
                }
                if (data.output && data.output.task_status === 'FAILED') {
                    console.error('[AliyunImageService] Task Failed:', data.output);
                    return null;
                }
            } catch (e) {
                console.error('[AliyunImageService] Polling Error:', e);
            }
        }
        console.error('[AliyunImageService] Polling Timed Out');
        return null;
    }
}
