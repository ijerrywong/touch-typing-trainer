// 打包成单个 HTML：所有 CSS、JS 内联，双击就能用（file:// 打开，不需要本地服务器）。
// 用法：node scripts/build-standalone.mjs [输出路径]，默认 dist/盲打练习.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const out = process.argv[2] ?? 'dist/盲打练习.html';
let html = readFileSync('index.html', 'utf8');

// ---- CSS：按 index.html 里的顺序内联 ----
let fontImport = '';
const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(([, href]) => {
  let s = readFileSync(href, 'utf8');
  // 字体的 @import 会让脚本等字体下载完才执行，挪到脚本后面用 <link> 加载
  s = s.replace(/@import url\('([^']+)'\);\s*/, (_, url) => { fontImport = url; return ''; });
  return `/* ---- ${href} ---- */\n${s}`;
}).join('\n');
// 替换内容用函数给出：代码里有 '$' 这类字符，直接写字符串会被当成替换占位符
html = html.replace(/(<link rel="stylesheet" href="[^"]+">\n)+/, () => `<style>\n${css}\n</style>\n`);

// ---- JS：每个模块包进一个函数里，避免同名变量冲突；import 换成从前面模块取值 ----
const ORDER = ['keymap', 'keyboard', 'hand-geometry', 'hand', 'input', 'drill', 'session', 'text', 'textview', 'app'];
const varOf = (name) => `__${name.replace(/-/g, '_')}`;
const js = ORDER.map((name) => {
  let src = readFileSync(`src/${name}.js`, 'utf8');
  const exports = [...src.matchAll(/^export (?:async )?(?:function|const|let|class) (\w+)/gm)].map((m) => m[1]);
  src = src.replace(/^import \{([^}]+)\} from '\.\/([\w-]+)\.js';$/gm, (_, names, from) => {
    if (!ORDER.includes(from) || ORDER.indexOf(from) >= ORDER.indexOf(name)) throw new Error(`${name} 依赖 ${from}，顺序不对`);
    return `const {${names}} = ${varOf(from)};`;
  });
  if (/^import /m.test(src)) throw new Error(`${name}.js 里有打包脚本不认识的 import 写法`);
  src = src.replace(/^export /gm, '');
  return `// ---- src/${name}.js ----\nconst ${varOf(name)} = (() => {\n${src}\nreturn { ${exports.join(', ')} };\n})();`;
}).join('\n\n');
html = html.replace(/<script type="module" src="src\/app\.js"><\/script>/, () =>
  `<script>\n${js}\n</script>\n${fontImport ? `<link rel="stylesheet" href="${fontImport}">` : ''}`);

if (/src="src\/|href="(src|vendor)\//.test(html)) throw new Error('还有没内联的本地文件引用');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`✔ ${out}  ${(html.length / 1024).toFixed(0)} KB`);
