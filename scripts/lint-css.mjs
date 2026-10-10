// 检查组件 CSS 里没有视觉字面量：颜色、带单位的长度、时长都必须走 var(--…)。
// 只有 *tokens.css 允许写字面量。
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['src/styles', 'spikes'];
const RULES = [
  [/#[0-9a-f]{3,8}\b/i, '十六进制颜色'],
  [/\b(rgba?|hsla?|oklch|lab|lch)\(/i, '颜色函数'],
  [/(?<![\w-])-?\d*\.?\d+(px|rem|em|vh|vw|ms|s|pt|%)(?![\w-])/, '带单位的数值'],
  [/:\s*(white|black|red|green|blue|gray|grey|orange|yellow|purple|pink)\b/i, '颜色名'],
];

let bad = 0;
for (const DIR of DIRS) for (const f of readdirSync(DIR).filter((f) => f.endsWith('.css') && !f.endsWith('tokens.css'))) {
  readFileSync(join(DIR, f), 'utf8').split('\n').forEach((line, i) => {
    const code = line
      .replace(/\/\*.*?\*\//g, '') // 注释
      .replace(/\d+%(\s*,\s*\d+%)*\s*\{/g, '{') // @keyframes 的 50% { 是时间点不是外观
      .replace(/(?<![\d.])100%/g, ''); // 占满容器是结构，不是外观
    for (const [re, what] of RULES) {
      if (re.test(code)) {
        console.log(`${DIR}/${f}:${i + 1}  ${what}：${line.trim()}`);
        bad++;
      }
    }
  });
}
console.log(bad ? `✖ ${bad} 处字面量` : '✔ 组件 CSS 零字面量');
process.exit(bad ? 1 : 0);
