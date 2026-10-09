'use strict';
/* AI reply Markdown renderer (lib/markdown.js): tables, lists, bold, code and
 * line breaks render as HTML, while every scripted or unsafe construct is
 * stripped. Runs in Node with jsdom providing the DOM that DOMPurify needs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const check = (condition, message) => assert.ok(condition, message);
const log = message => console.log('✓ ' + message);

/* A real DOM must exist before DOMPurify is loaded, as it is in a browser. */
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test/' });
global.window = dom.window;
global.document = dom.window.document;
const md = require(path.join(root, 'lib/markdown.js'));

function rendererTests() {
  const html = md.render([
    '## Study plan',
    '',
    'Focus on **Reading** first.',
    'Then revise line two.',
    '',
    '- Read one passage daily',
    '- Review every wrong answer',
    '',
    '1. Timed test',
    '2. Mistake review',
    '',
    '| Skill | Band | Target |',
    '| --- | :---: | ---: |',
    '| Reading | 6.5 | 7.0 |',
    '| Writing | 5.5 | 6.5 |',
    '',
    '```js',
    'const band = 7;',
    '```',
    '',
    'Inline `code` example.'
  ].join('\n'));

  check(html.includes('<h2>Study plan</h2>'), 'headings render as <h2>');
  check(html.includes('<strong>Reading</strong>'), '**bold** renders as <strong>');
  check(html.includes('Focus on <strong>Reading</strong> first.<br>Then revise line two.'),
    'a single newline inside a paragraph becomes <br> (chat layout preserved)');
  check(/<ul>\s*<li>Read one passage daily<\/li>\s*<li>Review every wrong answer<\/li>\s*<\/ul>/.test(html),
    'bullet list renders as <ul><li>');
  check(/<ol>\s*<li>Timed test<\/li>\s*<li>Mistake review<\/li>\s*<\/ol>/.test(html),
    'numbered list renders as <ol><li>');
  check(html.includes('<div class="md-table-wrap"><table>'), 'tables are wrapped for horizontal scrolling');
  check(html.includes('</table></div>'), 'table wrapper is closed');
  check((html.match(/<th\b/g) || []).length === 3, 'table header has 3 cells');
  check((html.match(/<tr>/g) || []).length >= 3, 'table body rows are rendered');
  check(html.includes('<th align="center">Band</th>') && html.includes('<th align="right">Target</th>'),
    'column alignment from the | :---: | row is kept');
  check(/<pre><code class="language-js">const band = 7;/.test(html), 'fenced code block renders as <pre><code>');
  check(html.includes('<code>code</code>'), 'inline `code` renders as <code>');
  log('Markdown renders headings, bold, lists, GFM tables, code and line breaks');

  const table = md.render('| a | b |\n| --- | --- |\n| 1 | 2 |');
  check(table.startsWith('<div class="md-table-wrap"><table>') && table.trimEnd().endsWith('</table></div>'),
    'a standalone table is wrapped exactly once');
  log('Tables are wrapped once in a scroll container');

  check(md.render(undefined) === '' && md.render(null) === '' && md.render('   \n ') === '',
    'empty, null and whitespace-only replies render as empty HTML');
  check(md.render('Ўқиш: o‘qish, ko‘rish — "salom" ✓').includes('o‘qish'),
    'Uzbek/Cyrillic/typographic text survives unchanged');
  check(md.render(42) === '<p>42</p>\n', 'non-string input is converted, not thrown on');
  log('Empty, null and non-string input never throw');
}

function securityTests() {
  const evil = md.render([
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(1)">',
    '<iframe src="https://evil.test"></iframe>',
    '<a href="javascript:alert(3)" onclick="alert(4)">click</a>',
    '<div style="background:url(javascript:alert(5))">styled</div>',
    '[link](javascript:alert(6))'
  ].join('\n\n'));
  check(!/<script/i.test(evil), 'script tags are removed');
  check(!/onerror|onclick/i.test(evil), 'event handler attributes are removed');
  check(!/<iframe/i.test(evil), 'iframes are removed');
  check(!/javascript:/i.test(evil), 'javascript: URLs are removed');
  check(!/style=/i.test(evil), 'inline style attributes are removed');
  check(evil.includes('click') && evil.includes('styled'), 'the harmless text is kept');
  log('Scripts, event handlers, iframes, javascript: links and inline styles are stripped');

  const link = md.render('See [IELTS](https://www.ielts.org/) for details.');
  check(link.includes('href="https://www.ielts.org/"'), 'https links are kept');
  check(link.includes('target="_blank"') && link.includes('rel="noopener noreferrer nofollow"'),
    'links open in a new tab with rel="noopener noreferrer"');
  log('Safe links open in a new tab with noopener/noreferrer');
}

function bundleTests() {
  /* The browser never loads lib/markdown.js directly; it runs the esbuild
     IIFE bundle that scripts/build.js writes to markdown.bundle.js. */
  const built = esbuild.buildSync({
    entryPoints: [path.join(root, 'lib/markdown.js')],
    bundle: true, format: 'iife', target: ['es2020'], minify: true, write: false
  });
  const code = built.outputFiles[0].text;
  check(!/require\(/.test(code), 'the browser bundle has no unresolved require() calls');
  const win = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' }).window;
  win.eval(code);
  check(win.IELTS_MARKDOWN && typeof win.IELTS_MARKDOWN.render === 'function',
    'the bundle exposes window.IELTS_MARKDOWN.render');
  const out = win.IELTS_MARKDOWN.render('| k | v |\n| - | - |\n| x | **y** |<script>bad()</script>');
  check(out.includes('<div class="md-table-wrap"><table>') && out.includes('<strong>y</strong>'),
    'the bundled renderer produces the same table and bold output');
  check(!/<script/i.test(out), 'the bundled renderer also sanitises');
  log('The esbuild browser bundle exposes window.IELTS_MARKDOWN and sanitises output');
}

function wiringTests() {
  const html = read('index.html');
  const script = read('script.js');
  const sw = read('sw.js');
  const build = read('scripts/build.js');
  const styles = read('styles.css');
  const gitignore = read('.gitignore');
  const pkg = JSON.parse(read('package.json'));

  const bundleAt = html.indexOf('markdown.bundle.js');
  check(bundleAt > 0 && bundleAt < html.indexOf('script.js?v='),
    'index.html loads markdown.bundle.js before script.js');
  check(sw.includes("'/markdown.bundle.js'"), 'the service worker precaches markdown.bundle.js');
  check(build.includes("'markdown.bundle.js'") && build.includes("'lib/markdown.js'"),
    'the build generates markdown.bundle.js and copies it into public/');
  check(gitignore.split('\n').includes('markdown.bundle.js'), 'the generated markdown bundle is git-ignored');
  check(/coachBubble\(m\)/.test(script) && /window\.IELTS_MARKDOWN/.test(script),
    'the Coach page renders AI replies through window.IELTS_MARKDOWN');
  check(/coachBubble[\s\S]*?m\.role !== 'ai'[\s\S]*?esc\(m\.text\)/.test(script),
    'learner messages stay escaped plain text');
  check(styles.includes('.md-table-wrap') && styles.includes('.coach-md'),
    'styles.css defines table and Markdown typography rules');
  check(pkg.dependencies.marked && pkg.dependencies.dompurify, 'marked and dompurify are runtime dependencies');
  check(pkg.devDependencies.jsdom, 'jsdom is a dev dependency for the DOM tests');
  check(pkg.scripts.test.includes('tests/markdown.test.js'), 'npm test runs the Markdown suite');
  log('Build, service worker, HTML, Coach page, CSS and package wiring are in place');
}

rendererTests();
securityTests();
bundleTests();
wiringTests();
console.log('MARKDOWN RENDERER TESTS OK ✓');
