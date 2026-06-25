import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 8080);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function resolveFilePath(urlPath) {
  const pathname = decodeURIComponent((urlPath || '/').split('?')[0]);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const normalized = path.normalize(relative);

  if (normalized.startsWith('..') || normalized.includes(`${path.sep}..`)) {
    return null;
  }

  const filePath = path.join(PUBLIC_DIR, normalized);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return null;
  }

  return filePath;
}

function readStatic(filePath) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }

  const indexPath = path.join(filePath, 'index.html');
  if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
    return indexPath;
  }

  const fallback = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(fallback)) {
    return fallback;
  }

  return null;
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    send(res, 200, 'ok', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  const filePath = resolveFilePath(req.url);
  if (!filePath) {
    send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  const staticPath = readStatic(filePath);
  if (!staticPath) {
    send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  const extension = path.extname(staticPath);
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';

  try {
    const body = fs.readFileSync(staticPath);
    send(res, 200, body, { 'Content-Type': contentType });
  } catch {
    send(res, 500, 'Internal Server Error', {
      'Content-Type': 'text/plain; charset=utf-8',
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`MKSFlow preview server listening on port ${PORT}`);
});
