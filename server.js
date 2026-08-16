import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { readdirSync, statSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

async function mountApiRoutes() {
  const apiDir = path.join(__dirname, 'api');
  const files = walk(apiDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const routePath = '/' + path.relative(__dirname, file).replace(/\\/g, '/').replace(/\.js$/, '');
    const mod = await import(pathToFileURL(file).href);
    const handler = mod.default;
    if (typeof handler !== 'function') continue;

    app.all(routePath, (req, res) => {
      Promise.resolve(handler(req, res)).catch((error) => {
        console.error(`[api] ${routePath} failed:`, error);
        if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
      });
    });

    console.log(`[api] ${routePath}`);
  }
}

await mountApiRoutes();

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Voyage Sabai dev server running at http://localhost:${PORT}`);
});
