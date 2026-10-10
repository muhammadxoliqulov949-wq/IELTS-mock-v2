require('dotenv').config({ quiet: true });
/* Local preview server (no Vercel needed).
 *
 * - Serves the static site (index.html, styles.css, script.js, data.js, services.js)
 * - Routes /api/grade and /api/coach through the real Vercel handlers.
 *   Without GROQ_API_KEY they return a clear, friendly message instead of
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
const generateMockHandler = require('./api/generate-mock.js');

const configHandler = require('./api/config.js');
const { staticFiles } = require('./scripts/build.js');

const PORT = process.env.PORT || 3000;
const MIME = {
  '.webp': 'image/webp',
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
  '.webp': 'public, max-age=604800',
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
  let headersWritten = false;
  const apiRes = {
    statusCode: 200,
    headers: {},
    body: '',
    _streaming: false,
    status(c) { this.statusCode = c; return this; },
    setHeader(k, v) { this.headers[k] = v; return this; },
    flushHeaders() {
      if (headersWritten) return;
      headersWritten = true;
      // If the handler set SSE Content-Type, stream without buffering.
      const ct = this.headers['Content-Type'] || 'application/json; charset=utf-8';
      const isSSE = ct.includes('text/event-stream');
      res.writeHead(this.statusCode, { ...this.headers, 'Content-Type': ct });
      this._streaming = isSSE;
    },
    write(chunk) {
      if (!headersWritten) this.flushHeaders();
      res.write(chunk);
    },
    end(chunk) {
      if (!headersWritten) this.flushHeaders();
      res.end(chunk);
    },
    json(b) {
      this.headers['Content-Type'] = 'application/json; charset=utf-8';
      this.body = JSON.stringify(b);
    }
  };
  try {
    await handler(req, apiRes);
    if (!apiRes._streaming) {
      // Non-streaming: send the accumulated JSON body.
      if (!headersWritten) {
        res.writeHead(apiRes.statusCode, {
          'Content-Type': 'application/json; charset=utf-8',
          ...apiRes.headers
        });
      }
      res.end(apiRes.body || '{}');
    }
    // Streaming responses end themselves via apiRes.end() inside the handler.
  } catch (err) {
    if (!headersWritten) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message || 'Server error' }));
    } else {
      try { res.end(); } catch { /* already ended */ }
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/config') {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); };
    return configHandler(req, res);
  }

  if (url.pathname.startsWith('/api/grade')) return handleApi(gradeHandler, req, res);
  if (url.pathname.startsWith('/api/coach')) return handleApi(coachHandler, req, res);
  if (url.pathname.startsWith('/api/quiz')) return handleApi(quizHandler, req, res);
  if (url.pathname.startsWith('/api/generate-mock')) return handleApi(generateMockHandler, req, res);

  let filePath;
  try { filePath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  // Only public assets are served: .env, .git, server code and dependencies are private.
  const isPublicAsset = staticFiles.includes(filePath.slice(1)) ||
    /^\/(icons|assets)\/[a-zA-Z0-9_-]+\.(svg|png|jpg|jpeg|ico|webp)$/.test(filePath);
  if (!isPublicAsset) {
    res.writeHead(404); res.end('Not found'); return;
  }
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
  console.log(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    ? 'Supabase settings found — apply the SQL migration and configure Auth (see SUPABASE.md).'
    : 'Supabase not configured — sign-in and mock tests are disabled. See SUPABASE.md.');
  const hasAnyKey = !!(process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY
    || [1,2,3,4,5].some(i => process.env[`GROQ_API_KEY_${i}`]));
  if (!hasAnyKey) {
    console.log('Note: no AI provider key is set — AI grading/coach will show a setup message.');
    console.log('Set GROQ_API_KEY (or GROQ_API_KEY_1, GROQ_API_KEY_2 for multi-key, DEEPSEEK_API_KEY for fallback).');
  }
});
