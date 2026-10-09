/* ===================================================================
 * Markdown → safe HTML for AI replies (AI Coach chat)
 * -------------------------------------------------------------------
 * The coach answers in Markdown: **bold**, bullet and numbered lists,
 * `##` headings, GitHub-style tables (`| a | b |` + `| --- |`), fenced
 * code blocks and line breaks. This module turns that text into HTML.
 *
 * Two steps, on purpose:
 *
 *   1. `marked` (GFM mode) parses the Markdown. Single line breaks become
 *      <br> so a chat reply keeps its layout, the way ChatGPT/Gemini do.
 *   2. `DOMPurify` sanitises the result. The model's text is untrusted
 *      input, so scripts, event handlers and javascript: links are removed
 *      before anything reaches the page. Every link opens in a new tab
 *      with rel="noopener noreferrer".
 *
 * Tables are wrapped in <div class="md-table-wrap"> so wide tables scroll
 * sideways inside the chat bubble instead of breaking the layout.
 *
 * Tiny UMD module: `require('../lib/markdown.js')` works in Node (tests),
 * and the bundled `markdown.bundle.js` (built by scripts/build.js) exposes
 * window.IELTS_MARKDOWN in the browser.
 * =================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.IELTS_MARKDOWN = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const { Marked } = require('marked');
  const DOMPurify = require('dompurify');

  const parser = new Marked({ gfm: true, breaks: true, async: false });

  /* Links from the model must never navigate the coach page away. */
  let hooked = false;
  function ensureHooks() {
    if (hooked || typeof DOMPurify.addHook !== 'function') return;
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && node.getAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    });
    hooked = true;
  }

  /* Markdown text → sanitised HTML string. Never throws on odd input. */
  function render(text) {
    if (text === null || text === undefined) return '';
    const source = String(text);
    if (!source.trim()) return '';
    ensureHooks();
    const raw = parser.parse(source);
    const clean = DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['style']
    });
    /* Wrap tables for horizontal scrolling. Only known tags are added
       around already-sanitised markup, so this cannot add new risks. */
    return String(clean)
      .replace(/<table\b([^>]*)>/g, '<div class="md-table-wrap"><table$1>')
      .replace(/<\/table>/g, '</table></div>');
  }

  return { render };
}));
