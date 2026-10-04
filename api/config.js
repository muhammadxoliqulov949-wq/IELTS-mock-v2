/* The browser cannot read .env. Expose ONLY the two public Supabase settings.
 * dotenv is loaded by server.js locally; Vercel supplies process.env directly.
 * Never add AI keys, database passwords or service-role keys to this response. */
module.exports = function config(req, res) {
  if (res.setHeader) res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_ANON_KEY || '').trim();
  if (!url && !key) return res.json({ configured: false });
  let publicKey = key.startsWith('sb_publishable_');
  try {
    publicKey ||= JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon';
  } catch { /* opaque non-public keys are rejected */ }
  let validUrl = false;
  try {
    const parsed = new URL(url);
    validUrl = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname));
  } catch { /* invalid URL */ }
  if (!validUrl || !publicKey || key.startsWith('sb_secret_')) {
    return res.status(503).json({ error: 'Set a valid SUPABASE_URL and a PUBLIC SUPABASE_ANON_KEY on the server.' });
  }
  return res.json({ configured: true, SUPABASE_URL: url, SUPABASE_ANON_KEY: key });
};
