import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleGeminiTask, ServerGeminiError } from './server/geminiHandler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    res.json({
      ok: true,
      geminiConfigured: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
    });
  });

  app.post('/api/gemini/:task', async (req, res) => {
    const { task } = req.params;
    try {
      const data = await handleGeminiTask(task, req.body || {});
      res.json({ data });
    } catch (err) {
      if (err instanceof ServerGeminiError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code || 'GEMINI_ERROR',
        });
        return;
      }

      const message =
        err instanceof Error ? err.message : 'Terjadi kesalahan pada server AI.';
      res.status(502).json({
        error: message,
        code: 'UPSTREAM_ERROR',
      });
    }
  });

  const distDir = path.resolve(__dirname, 'dist');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' &&
      process.env.npm_lifecycle_event !== 'dev' &&
      fs.existsSync(path.join(distDir, 'index.html')));

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SantriCity server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SantriCity server:', err);
  process.exit(1);
});
