
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { chatHandler, chatOnceHandler } from './endpoints/chat';
import dotenv from 'dotenv'; // Load env vars

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // bind on all interfaces for external access

app.use(cors());
app.use(bodyParser.json());
// 允许 x-www-form-urlencoded 形式（payload=JSON）
app.use(bodyParser.urlencoded({ extended: false }));

// 在进入业务路由前，兼容从 urlencoded 中提取 payload 作为 body
app.use((req: Request, _res: Response, next: NextFunction) => {
  try {
    // 如果没有标准 JSON body，但存在 urlencoded 的 payload，则解析之
    if ((!req.body || Object.keys(req.body).length === 0) && (req as any).body?.payload) {
      const raw = (req as any).body.payload;
      (req as any).body = JSON.parse(raw);
    }
  } catch (e) {
    // 留空：交给下游处理
  }
  next();
});

// Basic access log for troubleshooting connectivity on server side
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// AG-UI Protocol Endpoint
app.post('/api/chat', chatHandler);
// Non-streaming fallback endpoint
app.post('/api/chat/once', chatOnceHandler);

// 兼容某些网关/代理对 POST 带 chunked 的限制：
// 提供 GET /api/chat?payload=<urlencoded base64/json> 的兜底入口。
// 客户端将完整 JSON 载荷放到 payload 参数里（URL 编码的 JSON 字符串）。
app.get('/api/chat', (req: Request, res: Response) => {
  try {
    const payloadRaw = (req.query.payload as string) || '';
    if (!payloadRaw) {
      res.status(400).type('text/plain').send('Missing payload');
      return;
    }
    // 直接按 URL 编码 JSON 解析
    const parsed = JSON.parse(payloadRaw);
    // 将解析结果挂到 req.body，复用同一处理器
    (req as any).body = parsed;
    chatHandler(req, res);
  } catch (e: any) {
    console.error('GET /api/chat payload parse error:', e?.message);
    res.status(400).type('text/plain').send('Invalid payload');
  }
});

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).type('text/plain').send('AG-UI Server is running');
});
app.head('/health', (_req: Request, res: Response) => {
  res.status(200).end();
});

// Simple root endpoint for quick testing
app.get('/', (_req: Request, res: Response) => {
  res.status(200).type('text/plain').send('OK');
});

// Global error handler to avoid abrupt socket closes without body
// If any middleware throws, we ensure a response is still sent
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return; // delegate to default handler if headers already sent
  res.status(500).type('text/plain').send('Internal Server Error');
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
