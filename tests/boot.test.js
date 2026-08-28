const fs = require('fs');
const path = require('path').join(__dirname, '..');

function makeEl() {
  const el = {
    textContent: '', innerHTML: '', value: '', disabled: false, className: '',
    style: {}, dataset: {}, onclick: null, onchange: null, oninput: null, onsubmit: null,
    classList: { add() {}, remove() {}, contains: () => false },
    addEventListener() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [],
    scrollIntoView() {}, scrollTo() {}, focus() {},
    setAttribute() {}, getAttribute: () => null
  };
  return el;
}

const els = new Map();
global.document = {
  querySelector: (sel) => { if (!els.has(sel)) els.set(sel, makeEl()); return els.get(sel); },
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  addEventListener() {}
};
global.location = { hash: '#/' };
const storage = new Map();
global.localStorage = {
  getItem: (k) => storage.has(k) ? storage.get(k) : null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k)
};
global.window = { addEventListener() {}, scrollY: 0, speechSynthesis: null };
global.confirm = () => true;

// seed data
const seed = {
  attempts: [
    { section: 'listening', band: 6.5, raw: 25, total: 40, date: Date.now() - 86400000 },
    { section: 'writing', band: 7, date: Date.now() - 3600000 }
  ],
  mistakes: [
    { sig: 'l:x', section: 'listening', prompt: 'Q1 test', given: 'north', correct: 'south', date: Date.now() },
    { sig: 'r:y', section: 'reading', prompt: 'Q2 test', given: 'TRUE', correct: 'FALSE', date: Date.now() }
  ],
  feedback: {
    writing: { band: 7, tasks: [{ title: 'Task 1', band: 6.5 }, { title: 'Task 2', band: 7 }], summary: 's' }
  },
  coachMessages: [{ role: 'user', text: 'hello' }],
  user: null
};
storage.set('ielts-v2-store', JSON.stringify(seed));

const src = fs.readFileSync(path + '/script.js', 'utf8');
const fn = new Function('document', 'localStorage', 'location', 'window', 'confirm', src + '\n;globalThis.__render = render; globalThis.__go = go;');
try {
  // load content + i18n + premium pack + services globals
  eval(fs.readFileSync(path + '/data.js', 'utf8'));
  eval(fs.readFileSync(path + '/i18n.js', 'utf8'));
  eval(fs.readFileSync(path + '/content2.js', 'utf8'));
  eval(fs.readFileSync(path + '/content3.js', 'utf8'));
  eval(fs.readFileSync(path + '/content4.js', 'utf8'));
  eval(fs.readFileSync(path + '/services.js', 'utf8'));
  fn(global.document, global.localStorage, global.location, global.window, global.confirm);
  const render = globalThis.__render;
  console.log('script.js BOOTED OK');

  // render each route
  const routes = ['/', '/mock', '/listening', '/reading', '/writing', '/speaking', '/results', '/mistakes', '/coach', '/dashboard', '/lessons', '/vocabulary', '/quiz', '/fullmock', '/settings', '/login', '/unknown'];
  let ok = true;
  for (const r of routes) {
    global.location.hash = '#' + r;
    try { render(); } catch (e) { ok = false; console.log("FAIL render", r, "->", e.message); }
  }
  console.log(ok ? 'ALL ROUTES RENDER OK' : 'SOME ROUTES FAILED');

  // exercise submit handlers with fake data
  global.location.hash = '#/results';
  render();
  console.log('results page contains Result card:', document.querySelector('#app').innerHTML.includes('View feedback'));
  console.log('results page contains band 6.5:', document.querySelector('#app').innerHTML.includes('6.5'));
  console.log('results page contains band 7:', document.querySelector('#app').innerHTML.includes('7'));

  global.location.hash = '#/mistakes';
  render();
  const html = document.querySelector('#app').innerHTML;
  console.log('mistakes page has 2 groups:', html.includes('listening (1)') && html.includes('reading (1)'));
  console.log('mistakes page has Remove buttons:', html.includes('data-remove-mistake'));

  global.location.hash = '#/coach';
  render();
  console.log('coach page has history bubble:', document.querySelector('#app').innerHTML.includes('hello'));
} catch (e) {
  console.log('BOOT FAIL:', e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}
process.exit(0);
