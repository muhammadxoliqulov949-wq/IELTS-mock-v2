/* ===================================================================
 * Text-to-speech for the IELTS Listening sections
 * -------------------------------------------------------------------
 * The generator writes real transcripts, so a real test also needs a
 * real recording. Two engines are wired up, in order:
 *
 *   1. Microsoft Edge TTS  — free, no API key, returns MP3 directly.
 *      Implemented over the public read-aloud WebSocket endpoint, so
 *      there is no npm dependency. Node 22 ships a global WebSocket;
 *      when that handshake is refused (the endpoint answers 101 with
 *      `connection: close`, which some runtimes dislike) a small raw
 *      TLS WebSocket client takes over — same protocol, no dependency.
 *   2. Gemini TTS          — uses the GEMINI_API_KEY the project already
 *      requires. Gemini 3.8 TTS answers unary requests with a complete
 *      RIFF/WAVE file (older 2.5 TTS returned headerless 24 kHz PCM),
 *      so the response is normalised before the Supabase "ielts-media"
 *      bucket sees it as audio/wav.
 *
 * If neither engine can be reached the caller keeps the transcript and
 * leaves audioUrl empty — the admin can always upload an MP3 by hand in
 * the test editor, which is exactly what happened before this module.
 *
 * Usage:
 *   const { synthesize } = require('../lib/edgeTts.js');
 *   const { buffer, mime, ext, source } = await synthesize(transcript);
 *
 * Protocol notes (verified against rany2/edge-tts and the current
 * Chromium 143 handshake):
 *   • Sec-MS-GEC  = sha256( windowsFileTimeRoundedTo5min + clientToken )
 *   • Sec-MS-GEC-Version = 1-143.0.3650.75
 *   • frames: "Path:speech.config" JSON → "Path:synthesis.ssml" SSML →
 *     binary "Path:audio" frames → text "Path:turn.end"
 * =================================================================== */
'use strict';

const crypto = require('crypto');
const tls = require('tls');
const net = require('net');

/* ---------- Edge TTS constants (public read-aloud endpoint) ---------- */
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const GEC_VERSION = '1-143.0.3650.75';
const CHROMIUM_VERSION = '143.0.3650.75';
const WSS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const EXTENSION_ORIGIN = 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold';
const DEFAULT_VOICE = 'en-US-AriaNeural';
/* IELTS recordings are calm and clear — a slightly slower rate helps. */
const DEFAULT_RATE = '-4%';
const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

/* ---------- Gemini TTS (fallback, needs GEMINI_API_KEY) ----------
 * The model ids live in lib/geminiModel.js so a Google rotation is a
 * one-line change (see the note in that file). */
const geminiModel = require('./geminiModel.js');
const GEMINI_VOICE = 'Kore';
const GEMINI_PCM_RATE = 24000;

/* ------------------------------------------------------------------
 * small helpers
 * ------------------------------------------------------------------ */
function randomHex(bytes) {
  return crypto.randomBytes(bytes || 16).toString('hex');
}

/* Edge reads the timestamp in Python's `strftime` shape; build it in UTC
   so the value is stable regardless of the server's timezone. */
function edgeTimestamp() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${pad(d.getUTCDate())} ${d.getUTCFullYear()} `
    + `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
}

/* Sec-MS-GEC: SHA-256 over the Windows FILETIME ticks (rounded down to
   the nearest 5 minutes) concatenated with the trusted client token. */
function secMsGec() {
  const seconds = Math.floor(Date.now() / 1000) + 11644473600;
  const rounded = seconds - (seconds % 300);
  const ticks = String(rounded * 1e7);
  return crypto.createHash('sha256').update(ticks + TRUSTED_CLIENT_TOKEN).digest('hex').toUpperCase();
}

function edgeUrl(connectionId) {
  return `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`
    + `&ConnectionId=${connectionId}`
    + `&Sec-MS-GEC=${secMsGec()}`
    + `&Sec-MS-GEC-Version=${GEC_VERSION}`;
}

function edgeHeaders() {
  return {
    Origin: EXTENSION_ORIGIN,
    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 `
      + `(KHTML, like Gecko) Chrome/${CHROMIUM_VERSION.split('.')[0]}.0.0.0 Safari/537.36 Edg/${CHROMIUM_VERSION}`,
    Cookie: `muid=${randomHex(16)};`
  };
}

function edgeAvailable() {
  return typeof globalThis.WebSocket === 'function' || true; /* raw client always works */
}

/* Split long transcripts into request-sized chunks on sentence
   boundaries so neither engine chokes on a 10-minute monologue. */
function chunkText(text, maxChars) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const limit = Math.max(400, Number(maxChars) || 2400);
  const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [clean];
  const chunks = [];
  let current = '';
  sentences.forEach(sentence => {
    if (current && (current + sentence).length > limit) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence;
    while (current.length > limit) {
      /* a single enormous sentence: hard-split it */
      chunks.push(current.slice(0, limit).trim());
      current = current.slice(limit);
    }
  });
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function xmlEscape(text) {
  return String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/* "Path:xxx\r\nX-RequestId:…\r\n\r\n" + body, as the endpoint expects. */
function edgeMessage(path, contentType, body) {
  const header = `Path:${path}\r\nX-RequestId:${randomHex(16)}\r\nX-Timestamp:${edgeTimestamp()}\r\nContent-Type:${contentType}\r\n\r\n`;
  return Buffer.concat([Buffer.from(header, 'utf-8'), Buffer.from(body, 'utf-8')]);
}

function speechConfigMessage() {
  const config = {
    context: {
      system: {
        name: 'SpeechSDK',
        version: '1.41.2',
        build: 'JavaScript',
        lang: 'en-US',
        os: { platform: 'Browser/Linux', name: 'Linux', version: '1.0' },
        auth: { type: 'Token', value: TRUSTED_CLIENT_TOKEN }
      },
      audio: { outputFormat: OUTPUT_FORMAT }
    }
  };
  return edgeMessage('speech.config', 'application/json; charset=utf-8', JSON.stringify(config));
}

function ssmlMessage(text, options) {
  const opts = options || {};
  const voice = opts.voice || DEFAULT_VOICE;
  const rate = opts.rate || DEFAULT_RATE;
  const pitch = opts.pitch || '+0Hz';
  const lang = String(voice).split('-').slice(0, 2).join('-') || 'en-US';
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>`
    + `<voice name='${voice}'><prosody rate='${rate}' pitch='${pitch}'>${xmlEscape(text)}</prosody></voice></speak>`;
  return edgeMessage('synthesis.ssml', 'application/ssml+xml', ssml);
}

/* ------------------------------------------------------------------
 * Transport 1 — the runtime's global WebSocket (Node 22 / browsers)
 * ------------------------------------------------------------------ */
function globalWebSocketTransport(url, headers) {
  return new Promise((resolve, reject) => {
    let socket;
    try {
      socket = new globalThis.WebSocket(url, { headers });
    } catch (err) {
      /* some runtimes refuse the init object — retry bare */
      try {
        socket = new globalThis.WebSocket(url);
      } catch (err2) {
        reject(new Error('WebSocket could not be opened: ' + err2.message));
        return;
      }
    }
    /* Binary frames must arrive as bytes, not Blobs. */
    try { socket.binaryType = 'arraybuffer'; } catch { /* runtime default */ }
    const client = {
      send: (payload) => socket.send(payload),
      close: () => { try { socket.close(); } catch { /* already closing */ } },
      on: (name, fn) => {
        if (name === 'message') {
          socket.addEventListener('message', (event) => {
            const data = event.data;
            if (typeof Blob !== 'undefined' && data && typeof data.arrayBuffer === 'function') {
              /* Blob (browser default): read it asynchronously */
              data.arrayBuffer().then(buf => fn(Buffer.from(buf))).catch(() => {});
              return;
            }
            fn(data);
          });
        } else if (name === 'close') socket.addEventListener('close', () => fn());
        else if (name === 'error') socket.addEventListener('error', (event) => fn(event));
      }
    };
    const fail = (err) => reject(err instanceof Error ? err : new Error('WebSocket error'));
    if (socket.readyState === 1) resolve(client);
    else {
      socket.addEventListener('open', () => resolve(client), { once: true });
      socket.addEventListener('error', () => fail(new Error('WebSocket handshake failed')), { once: true });
      socket.addEventListener('close', () => fail(new Error('WebSocket closed before opening')), { once: true });
    }
  });
}

/* ------------------------------------------------------------------
 * Transport 2 — a dependency-free raw TLS/WebSocket client.
 * Used when the global WebSocket refuses the handshake (the endpoint
 * replies 101 with `connection: close`, which some runtimes treat as a
 * failed upgrade). Same wire protocol, ~120 lines.
 * ------------------------------------------------------------------ */
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function rawConnect(urlString, headers, options) {
  return new Promise((resolve, reject) => {
    let url;
    try { url = new URL(urlString); } catch { reject(new Error('Invalid WebSocket URL')); return; }
    const isTls = url.protocol === 'wss:';
    const port = url.port ? Number(url.port) : (isTls ? 443 : 80);
    const insecure = options && options.rejectUnauthorized === false;
    const socket = isTls
      ? tls.connect({ host: url.hostname, port, servername: url.hostname, ALPNProtocols: ['http/1.1'], rejectUnauthorized: !insecure })
      : net.connect({ host: url.hostname, port });
    const key = crypto.randomBytes(16).toString('base64');
    let handshake = Buffer.alloc(0);
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch { /* ignore */ }
      reject(err);
    };
    socket.on('error', fail);

    const onData = (chunk) => {
      handshake = Buffer.concat([handshake, chunk]);
      const at = handshake.indexOf('\r\n\r\n');
      if (at < 0) {
        if (handshake.length > 65536) fail(new Error('WebSocket handshake response too large'));
        return;
      }
      const head = handshake.slice(0, at).toString('utf-8');
      const rest = handshake.slice(at + 4);
      const statusLine = head.split('\r\n')[0] || '';
      if (!/^HTTP\/1\.[01] 101/.test(statusLine)) {
        fail(new Error('WebSocket handshake rejected: ' + statusLine));
        return;
      }
      const accept = /sec-websocket-accept:\s*(\S+)/i.exec(head);
      const expected = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
      if (!accept || accept[1] !== expected) {
        fail(new Error('Invalid Sec-WebSocket-Accept from server'));
        return;
      }
      socket.removeListener('data', onData);
      settled = true;
      resolve(rawClient(socket, rest));
    };
    socket.on('data', onData);

    const lines = [
      `GET ${url.pathname}${url.search} HTTP/1.1`,
      `Host: ${url.host}`,
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Key: ${key}`,
      'Sec-WebSocket-Version: 13'
    ];
    Object.keys(headers || {}).forEach(name => lines.push(`${name}: ${headers[name]}`));
    const request = lines.join('\r\n') + '\r\n\r\n';
    if (isTls) socket.once('secureConnect', () => socket.write(request));
    else socket.once('connect', () => socket.write(request));
  });
}

function rawClient(socket, initial) {
  let buffer = initial || Buffer.alloc(0);
  let closed = false;
  const handlers = { message: [], close: [], error: [] };
  const emit = (name, arg) => handlers[name].slice().forEach(fn => { try { fn(arg); } catch { /* listener */ } });

  function sendFrame(opcode, payload) {
    const data = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload), 'utf-8');
    const mask = crypto.randomBytes(4);
    let header;
    if (data.length < 126) {
      header = Buffer.from([0x80 | opcode, 0x80 | data.length]);
    } else if (data.length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(data.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(data.length), 2);
    }
    const masked = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ mask[i % 4];
    socket.write(Buffer.concat([header, mask, masked]));
  }

  function parse() {
    while (!closed) {
      if (buffer.length < 2) return;
      const b0 = buffer[0];
      const b1 = buffer[1];
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (buffer.length < offset + 2) return;
        len = buffer.readUInt16BE(offset);
        offset += 2;
      } else if (len === 127) {
        if (buffer.length < offset + 8) return;
        len = Number(buffer.readBigUInt64BE(offset));
        offset += 8;
      }
      let maskKey = null;
      if (masked) {
        if (buffer.length < offset + 4) return;
        maskKey = buffer.slice(offset, offset + 4);
        offset += 4;
      }
      if (buffer.length < offset + len) return;
      let payload = buffer.slice(offset, offset + len);
      buffer = buffer.slice(offset + len);
      if (maskKey) {
        const out = Buffer.alloc(len);
        for (let i = 0; i < len; i++) out[i] = payload[i] ^ maskKey[i % 4];
        payload = out;
      }
      if (opcode === 8) {
        closed = true;
        try { socket.end(); } catch { /* already gone */ }
        emit('close');
        return;
      }
      if (opcode === 9) { sendFrame(10, payload); continue; }   /* ping → pong */
      if (opcode === 10) continue;                              /* pong */
      if (opcode === 1 || opcode === 2) emit('message', payload);
    }
  }

  socket.on('data', (chunk) => { buffer = Buffer.concat([buffer, chunk]); parse(); });
  socket.on('error', (err) => { if (!closed) { closed = true; emit('error', err); } });
  socket.on('close', () => { if (!closed) { closed = true; emit('close'); } });
  if (initial && initial.length) parse();

  return {
    send: (payload) => sendFrame(1, payload),
    close: () => { try { sendFrame(8, Buffer.alloc(0)); } catch { /* ignore */ } try { socket.end(); } catch { /* ignore */ } },
    on: (name, fn) => { if (handlers[name]) handlers[name].push(fn); }
  };
}

/* Anything a WebSocket implementation may hand back → Buffer. */
function toBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (typeof data === 'string') return Buffer.from(data, 'utf-8');
  if (data && typeof data === 'object' && typeof data.byteLength === 'number') return Buffer.from(data);
  return Buffer.alloc(0);
}

/* Binary audio frames start with ASCII headers; find where they end. */
function stripAudioHeader(buffer) {
  if (!buffer || buffer.length < 4) return null;
  const headerLength = buffer.readUInt16BE(0);
  if (headerLength > 0 && 2 + headerLength < buffer.length) {
    const head = buffer.slice(2, 2 + headerLength).toString('utf-8');
    if (/^Path:audio/i.test(head)) return buffer.slice(2 + headerLength);
  }
  const at = buffer.indexOf('\r\n\r\n');
  if (at > 0 && at < 4096) {
    const head = buffer.slice(0, at).toString('utf-8');
    if (/Path:audio/i.test(head)) return buffer.slice(at + 4);
  }
  return buffer; /* no recognisable header — assume the frame is raw audio */
}

/* One WebSocket round trip → MP3 bytes for one chunk of text. */
async function edgeSpeakOnce(text, options) {
  const opts = options || {};
  const url = opts.endpoint || edgeUrl(randomHex(16));
  const headers = edgeHeaders();
  const named = opts.transport ? [transportByName(opts.transport)].filter(Boolean) : [];
  const transports = named.length ? named : defaultTransports();

  let lastError = null;
  for (const connect of transports) {
    try {
      return await speakOnce(connect, url, headers, text, opts);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Edge TTS failed');
}

function transportByName(name) {
  if (name === 'raw') return rawConnect;
  if (name === 'websocket' || name === 'global') return globalWebSocketTransport;
  return null;
}

function defaultTransports() {
  return typeof globalThis.WebSocket === 'function'
    ? [globalWebSocketTransport, rawConnect]
    : [rawConnect];
}

function speakOnce(connect, url, headers, text, opts) {
  /* transports may take a third argument for TLS/testing options */
  return new Promise((resolve, reject) => {
    let client;
    let settled = false;
    const chunks = [];
    const timer = setTimeout(() => finish(new Error('Edge TTS timed out')), 120000);

    function finish(err, buffer) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (client) client.close();
      if (err) reject(err); else resolve(buffer);
    }

    Promise.resolve()
      .then(() => connect(url, headers, opts))
      .then(socket => {
        client = socket;
        client.on('message', (data) => {
          const buffer = toBuffer(data);
          const head = buffer.slice(0, 64).toString('utf-8');
          /* audio frames also carry a "Path:audio" header, so they are
             matched before the control messages are */
          if (/^Path:audio/i.test(head)) {
            const audio = stripAudioHeader(buffer);
            if (audio && audio.length) chunks.push(audio);
            return;
          }
          if (buffer.toString('utf-8').includes('Path:turn.end')) {
            finish(null, Buffer.concat(chunks));
          }
          /* every other control frame (turn.start, response…) is ignored */
        });
        client.on('error', (event) => {
          const message = event && event.message ? event.message : (event && event.error && event.error.message) || 'unknown';
          finish(new Error('Edge TTS connection error: ' + message));
        });
        client.on('close', () => {
          finish(chunks.length ? null : new Error('Edge TTS closed before any audio arrived'));
        });
        client.send(speechConfigMessage());
        client.send(ssmlMessage(text, opts));
      })
      .catch(err => finish(err));
  });
}

/* ---------- Gemini TTS ---------- */
const SPEAKER_LABEL_RE = /(^|[.!?…]["'’)\]]?\s+|\s)((?:[A-Z][A-Za-z'’.-]*|[A-Z]{2,})(?:\s+(?:[A-Z][A-Za-z'’.-]*|[A-Z]{2,})){0,2})\s*:\s+/g;

/* The generator writes speaker labels into the transcript ("Woman:",
 * "Dr Ahmed:", "TUTOR:"). Gemini 3.8 TTS reads its input strictly as a
 * verbatim transcript and may speak those labels out loud ("Woman colon"),
 * so they are removed here rather than trusted to a prompt instruction.
 * The sentence punctuation around each turn is kept, so the delivery still
 * pauses naturally between speakers. */
function stripSpeakerLabels(text) {
  return String(text || '').replace(SPEAKER_LABEL_RE, '$1');
}

async function geminiSpeak(text, options) {
  const opts = options || {};
  const key = opts.apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const prompt = 'Read the following IELTS Listening transcript aloud, naturally and clearly, as a real examiner '
    + 'would read it in the exam:\n\n'
    + stripSpeakerLabels(text);
  let lastError = null;
  for (const model of (opts.models || geminiModel.ttsModels())) {
    const res = await fetch(
      geminiModel.url(key, model),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt.slice(0, 8000) }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICE } } }
          }
        })
      }
    );
    if (!res.ok) {
      lastError = new Error(`Gemini TTS (${model}) error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      continue;
    }
    const data = await res.json();
    const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content || {}).parts || [];
    const part = parts.find(p => p.inlineData && p.inlineData.data);
    if (!part) {
      lastError = new Error(`Gemini TTS (${model}) returned no audio`);
      continue;
    }
    return { data: Buffer.from(part.inlineData.data, 'base64'), mime: part.inlineData.mimeType || '' };
  }
  throw lastError || new Error('Gemini TTS unavailable');
}

/* "audio/L16;codec=pcm;rate=24000" → 24000 */
function pcmRateFromMime(mime) {
  const match = /rate=(\d+)/i.exec(String(mime || ''));
  return match ? Number(match[1]) : GEMINI_PCM_RATE;
}

/* Average the two channels of interleaved 16-bit stereo down to mono. */
function downmixStereo(pcm) {
  const frames = Math.floor(pcm.length / 4);
  const mono = Buffer.alloc(frames * 2);
  for (let i = 0; i < frames; i++) {
    const mixed = Math.round((pcm.readInt16LE(i * 4) + pcm.readInt16LE(i * 4 + 2)) / 2);
    mono.writeInt16LE(Math.max(-32768, Math.min(32767, mixed)), i * 2);
  }
  return mono;
}

/* Walk a RIFF/WAVE container and return { fmt, pcm } — or null when the
 * bytes are not a WAV at all. */
function readWav(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44) return null;
  if (buffer.toString('latin1', 0, 4) !== 'RIFF' || buffer.toString('latin1', 8, 12) !== 'WAVE') return null;
  let fmt = null;
  const dataParts = [];
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('latin1', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = Math.min(start + size, buffer.length);
    if (id === 'fmt ' && size >= 16) {
      fmt = {
        format: buffer.readUInt16LE(start),      /* 1 = linear PCM */
        channels: buffer.readUInt16LE(start + 2),
        rate: buffer.readUInt32LE(start + 4),
        bits: buffer.readUInt16LE(start + 14)
      };
    } else if (id === 'data') {
      dataParts.push(buffer.subarray(start, end));
    }
    /* chunks are word-aligned: an odd size carries one pad byte */
    offset = start + size + (size % 2);
  }
  if (!fmt || !dataParts.length) return null;
  return { fmt, pcm: Buffer.concat(dataParts) };
}

/* Gemini 3.8 TTS answers unary requests with a finished WAV file, while the
 * retired 2.5 TTS models answered with headerless 24 kHz PCM. Normalise both
 * into raw PCM so several chunks can be joined into ONE valid recording —
 * a WAV inside a WAV would play as noise. */
function normalizeGeminiAudio(data, mime) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data || []);
  const wav = readWav(buffer);
  if (wav) {
    const { format, channels, bits, rate } = wav.fmt;
    if (format !== 1 || bits !== 16 || (channels !== 1 && channels !== 2)) {
      throw new Error(`Gemini TTS returned an unsupported WAV format (format ${format}, ${bits}-bit, ${channels} channel(s))`);
    }
    return { pcm: channels === 2 ? downmixStereo(wav.pcm) : wav.pcm, rate: rate || GEMINI_PCM_RATE };
  }
  if (/wav/i.test(String(mime || ''))) {
    throw new Error('Gemini TTS announced audio/wav but sent no RIFF header');
  }
  return { pcm: buffer, rate: pcmRateFromMime(mime) };
}

/* Wrap raw 16-bit little-endian PCM in a minimal RIFF/WAVE container. */
function pcmToWav(pcm, sampleRate) {
  const rate = Number(sampleRate) || GEMINI_PCM_RATE;
  const data = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm || []);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);        /* PCM chunk size */
  header.writeUInt16LE(1, 20);         /* audio format = PCM */
  header.writeUInt16LE(1, 22);         /* channels */
  header.writeUInt32LE(rate, 24);      /* sample rate */
  header.writeUInt32LE(rate * 2, 28);  /* byte rate */
  header.writeUInt16LE(2, 32);         /* block align */
  header.writeUInt16LE(16, 34);        /* bits per sample */
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/* ---------- public API ---------- */

/* MP3 via Edge TTS. Throws when the service is unreachable. */
async function synthesizeMp3(text, options) {
  const chunks = chunkText(text, 2400);
  if (!chunks.length) throw new Error('Nothing to synthesise');
  const parts = [];
  for (const chunk of chunks) parts.push(await edgeSpeakOnce(chunk, options));
  const buffer = Buffer.concat(parts);
  if (!buffer.length) throw new Error('Edge TTS produced no audio');
  return buffer;
}

/* WAV via Gemini TTS. Throws when no key / the model is unavailable. */
async function synthesizeWav(text, options) {
  const chunks = chunkText(text, 3000);
  if (!chunks.length) throw new Error('Nothing to synthesise');
  const pieces = [];
  let rate = GEMINI_PCM_RATE;
  for (const chunk of chunks) {
    const { data, mime } = await geminiSpeak(chunk, options);
    const normalised = normalizeGeminiAudio(data, mime);
    pieces.push(normalised.pcm);
    rate = normalised.rate || rate;
  }
  return pcmToWav(Buffer.concat(pieces), rate);
}

/* Best-effort: try the free engine first, then the keyed one.
   Returns { buffer, mime, ext, source } — never returns silence. */
async function synthesize(text, options) {
  const opts = options || {};
  const errors = [];
  try {
    const buffer = await synthesizeMp3(text, opts);
    if (buffer && buffer.length > 1024) {
      return { buffer, mime: 'audio/mpeg', ext: 'mp3', source: 'edge-tts' };
    }
    errors.push('Edge TTS returned an empty recording');
  } catch (err) {
    errors.push('Edge TTS: ' + err.message);
  }
  const key = opts.apiKey || process.env.GEMINI_API_KEY;
  if (key) {
    try {
      const buffer = await synthesizeWav(text, opts);
      if (buffer && buffer.length > 1024) {
        return { buffer, mime: 'audio/wav', ext: 'wav', source: 'gemini-tts' };
      }
      errors.push('Gemini TTS returned an empty recording');
    } catch (err) {
      errors.push('Gemini TTS: ' + err.message);
    }
  }
  throw new Error(errors.join(' | ') || 'No TTS engine available');
}

module.exports = {
  synthesize,
  synthesizeMp3,
  synthesizeWav,
  pcmToWav,
  normalizeGeminiAudio,
  stripSpeakerLabels,
  chunkText,
  secMsGec,
  edgeTimestamp,
  edgeAvailable,
  stripAudioHeader,
  DEFAULT_VOICE,
  DEFAULT_RATE,
  GEC_VERSION,
  TRUSTED_CLIENT_TOKEN
};
