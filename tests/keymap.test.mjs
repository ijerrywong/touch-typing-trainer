import test from 'node:test';
import assert from 'node:assert/strict';
import { ROWS, KEYS, FINGERS, TYPABLE, SINGLE_KEY, strokeFor, computeLayout, displayName } from '../src/keymap.js';

test('95 个可打印 ASCII 字符全部能打出来', () => {
  const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));
  for (const c of ascii) assert.ok(strokeFor(c), `打不出 ${JSON.stringify(c)}`);
  assert.equal(TYPABLE.length, 95);
});

test('小写字母不需要 Shift，大写需要另一只手的 Shift', () => {
  assert.deepEqual(strokeFor('a'), { keyId: 'KeyA', shiftId: null, keyIds: ['KeyA'], fingers: ['LP'] });
  assert.deepEqual(strokeFor('A').keyIds, ['KeyA', 'ShiftRight']);
  assert.deepEqual(strokeFor('A').fingers, ['LP', 'RP']);
  assert.deepEqual(strokeFor('J').keyIds, ['KeyJ', 'ShiftLeft']);
  assert.deepEqual(strokeFor('J').fingers, ['RI', 'LP']);
});

test('符号的 Shift 也按手分', () => {
  assert.equal(strokeFor('!').shiftId, 'ShiftRight'); // 1 在左手
  assert.equal(strokeFor('?').shiftId, 'ShiftLeft'); // / 在右手
  assert.equal(strokeFor('"').keyId, 'Quote');
});

test('空格用大拇指', () => {
  assert.deepEqual(strokeFor(' ').fingers, ['TH']);
  assert.equal(displayName(' '), '空格');
});

test('中文和换行打不出来', () => {
  assert.equal(strokeFor('中'), null);
  assert.equal(strokeFor('\n'), null);
});

test('每根手指的基准键都在键盘上，且该键归这根手指', () => {
  for (const [f, { home }] of Object.entries(FINGERS)) assert.equal(KEYS[home].finger, f);
});

test('布局：每排宽度一致（14.5 个键宽），和指法图一样', () => {
  const { keys, width } = computeLayout();
  for (const row of ROWS) assert.equal(row.reduce((s, k) => s + k.w, 0), 14.5);
  assert.equal(width, 14.5);
  assert.deepEqual([keys.KeyA.cx, keys.KeyA.cy], [2.25, 2.5]);
});

test('单键字符：48 个，都不需要 Shift，不含大写', () => {
  assert.equal(SINGLE_KEY.length, 48);
  for (const c of SINGLE_KEY) assert.equal(strokeFor(c).shiftId, null);
  assert.ok(SINGLE_KEY.includes(' ') && SINGLE_KEY.includes(';') && !SINGLE_KEY.includes('A') && !SINGLE_KEY.includes('!'));
});
