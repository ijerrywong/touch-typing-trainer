// 自定义文字清洗：把键盘打不出的字符换成能打的，换不了的剔除并报告。
import { strokeFor } from './keymap.js';

const REPLACE = [
  [/[‘’‚′]/g, "'"],
  [/[“”„″]/g, '"'],
  [/[–—−]/g, '-'],
  [/…/g, '...'],
  [/[  - 　\t]/g, ' '],
  [/\s*[\r\n]+\s*/g, ' '], // 换行变空格：练习时不按回车
];

export function normalizeText(raw) {
  let s = raw;
  for (const [re, to] of REPLACE) s = s.replace(re, to);
  const removed = new Set();
  s = [...s].filter((c) => (strokeFor(c) ? true : (removed.add(c), false))).join('');
  s = s.replace(/ {2,}/g, ' ').trim();
  return { text: s, removed: [...removed] };
}

export const SAMPLES = [
  'The quick brown fox jumps over the lazy dog.',
  'Practice makes perfect. Keep your fingers on the home row and let them find their way back after every key.',
  'Typing without looking at the keyboard feels slow at first, but speed comes naturally once accuracy is solid.',
  'Good habits: sit up straight, relax your shoulders, and press each key with the correct finger, even when it feels awkward.',
];
