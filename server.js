/* Local preview server (no Vercel needed).
 *
 * - Serves the static site (index.html, styles.css, script.js, data.js, services.js)
 * - Routes /api/grade and /api/coach through the real Vercel handlers.
 *   Without GEMINI_API_KEY they return a clear, friendly message instead of
 *   the raw 501 a plain static server would give.
 *
 * Usage: npm run preview   (or: PORT=8080 node server.js)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const gradeHandler = require('./api/grade.js');
const coachHandler = require('./api/coach.js');
const quizHandler = require('./api/quiz.js');

const PORT = process.env.PORT || 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};
/* Always revalidate the app code so edits show up on a normal reload.
   Only images get a long cache (they are content-addressed enough). */
const CACHE = {
  '.svg': 'public, max-age=86400',
  '.png': 'public, max-age=604800',
  '.jpg': 'public, max-age=604800',
  '.ico': 'public, max-age=604800'
};

function attachBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
      resolve();
    });
    req.on('error', () => { req.body = {}; resolve(); });
  });
}

async function handleApi(handler, req, res) {
  await attachBody(req);
  const apiRes = {
    statusCode: 200,
    headers: {},
    body: '',
    status(c) { this.statusCode = c; return this; },
    json(b) { this.headers['Content-Type'] = 'application/json; charset=utf-8'; this.body = JSON.stringify(b); }
  };
  try {
    await handler(req, apiRes);
    res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(apiRes.body || '{}');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.message || 'Server error' }));
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname.startsWith('/api/grade')) return handleApi(gradeHandler, req, res);
  if (url.pathname.startsWith('/api/coach')) return handleApi(coachHandler, req, res);
  if (url.pathname.startsWith('/api/quiz')) return handleApi(quizHandler, req, res);

  let filePath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const abs = path.normalize(path.join(__dirname, filePath));
  if (!abs.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(abs, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(abs);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': CACHE[ext] || 'no-cache, must-revalidate'
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`IELTS Mock preview server → http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.log('Note: GEMINI_API_KEY is not set — AI grading/coach will show a setup message.');
    console.log('Set it (e.g. GEMINI_API_KEY=... npm run preview) to enable real AI.');
  }
});
