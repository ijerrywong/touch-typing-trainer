import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrill } from '../src/drill.js';
import { createSession } from '../src/session.js';
import { normalizeText } from '../src/text.js';
import { TYPABLE } from '../src/keymap.js';

// ---------- S5 出题 ----------
test('出题：1000 题内不连续重复，且覆盖全部 95 个字符', () => {
  const d = createDrill({ pool: TYPABLE });
  const seen = new Set([d.current]);
  for (let i = 0; i < 1000; i++) {
    const prev = d.current;
    const { next } = d.submit(prev);
    assert.notEqual(next, prev);
    seen.add(next);
  }
  assert.equal(seen.size, 95);
});

test('出题：按错停在原题，连击清零', () => {
  const d = createDrill({ pool: ['a', 'b', 'c'] });
  const q = d.current;
  d.submit(q);
  const q2 = d.current;
  const r = d.submit(q2 === 'a' ? 'b' : 'a');
  assert.equal(r.correct, false);
  assert.equal(d.current, q2);
  assert.deepEqual(d.stats, { correct: 1, wrong: 1, streak: 0 });
});

// ---------- S6 计分 ----------
function clock() {
  let t = 0;
  const now = () => t;
  now.advance = (ms) => { t += ms; };
  return now;
}

test('计分：打错标红后继续前进', () => {
  const s = createSession('abc');
  s.input('a');
  s.input('x');
  assert.deepEqual(s.status, ['correct', 'wrong', 'pending']);
  assert.equal(s.cursor, 2);
});

test('计分：退格改正，但按错次数不抹掉', () => {
  const s = createSession('abc');
  s.input('a'); s.input('x');
  s.backspace();
  assert.deepEqual(s.status, ['correct', 'pending', 'pending']);
  s.input('b'); s.input('c');
  assert.ok(s.done);
  const st = s.stats();
  assert.equal(st.mistakes, 1);
  assert.equal(st.accuracy, 75); // 4 次击键错 1 次
});

test('计分：开头不能退格，打完后不再接受输入', () => {
  const s = createSession('a');
  assert.equal(s.backspace(), null);
  s.input('a');
  assert.equal(s.input('b'), null);
  assert.equal(s.backspace(), null);
});

test('计分：WPM = 正确字符 / 5 / 分钟，从第一次按键开始计时', () => {
  const now = clock();
  const s = createSession('a'.repeat(50), { now });
  now.advance(99999); // 没开始打之前的时间不算
  for (let i = 0; i < 50; i++) { s.input('a'); now.advance(1200); }
  // 第 50 个字符在 49*1.2s = 58.8s 时打完
  assert.equal(s.stats().wpm, Math.round(10 / (58.8 / 60)));
});

// ---------- S7 文字清洗 ----------
test('清洗：弯引号、破折号、省略号、换行转成能打的字符', () => {
  const r = normalizeText('“Hi” — it’s ok…\n\n  next\tline');
  assert.equal(r.text, '"Hi" - it\'s ok... next line');
  assert.deepEqual(r.removed, []);
});

test('清洗：中文剔除并报告', () => {
  const r = normalizeText('Hello 世界 ok');
  assert.equal(r.text, 'Hello ok');
  assert.deepEqual(r.removed, ['世', '界']);
});
