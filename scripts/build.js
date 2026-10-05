const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const staticFiles = [
  'index.html', 'styles.css', 'script.js', 'data.js', 'content2.js',
  'content3.js', 'content4.js', 'i18n.js', 'services.js', 'supabase.bundle.js',
  'manifest.webmanifest', 'sw.js', 'robots.txt', 'sitemap.xml'
];
module.exports = { staticFiles };
if (require.main === module) {
  esbuild.buildSync({
    entryPoints: [path.join(root, 'supabaseClient.js')],
    outfile: path.join(root, 'supabase.bundle.js'), bundle: true,
    format: 'iife', globalName: 'IELTS_CLOUD', target: ['es2020'], minify: true
  });
  if (!process.argv.includes('--bundle-only')) {
    const output = path.join(root, 'public');
    fs.mkdirSync(output, { recursive: true });
    for (const file of staticFiles) fs.copyFileSync(path.join(root, file), path.join(output, file));
    fs.cpSync(path.join(root, 'icons'), path.join(output, 'icons'), { recursive: true });
    fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
  }
}
