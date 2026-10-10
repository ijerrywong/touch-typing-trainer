import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout } from '../src/keymap.js';
import { computeHand } from '../src/hand-geometry.js';

const U = 60, PAD = 12;
const layout = computeLayout();
const pos = (u) => u * U + PAD;
const hand = computeHand(layout, pos, U);
const HOME = { LP: 'KeyA', LR: 'KeyS', LM: 'KeyD', LI: 'KeyF', RI: 'KeyJ', RM: 'KeyK', RR: 'KeyL', RP: 'Semicolon' };

test('8 根手指 + 2 个大拇指 + 2 个手掌', () => {
  assert.equal(hand.fingers.length, 10);
  assert.equal(hand.palms.length, 2);
});

test('指尖落在各自基准键的键帽范围内', () => {
  for (const f of hand.fingers.filter((f) => f.finger !== 'TH')) {
    const k = layout.keys[HOME[f.finger]];
    const [x, y] = f.tip;
    assert.ok(Math.abs(x - pos(k.cx)) < U / 2 && Math.abs(y - pos(k.cy)) < U / 2, `${f.finger} 指尖不在 ${HOME[f.finger]} 上`);
  }
});

test('大拇指尖在空格键上', () => {
  const sp = layout.keys.Space;
  for (const f of hand.fingers.filter((f) => f.finger === 'TH')) {
    const [x, y] = f.tip;
    assert.ok(x > pos(sp.x) && x < pos(sp.x + sp.w) && Math.abs(y - pos(sp.cy)) < U / 2);
  }
});

test('左右手镜像对称', () => {
  const l = hand.fingers.find((f) => f.finger === 'LM').root[1];
  const r = hand.fingers.find((f) => f.finger === 'RM').root[1];
  assert.equal(l, r);
});

test('所有路径里没有 NaN', () => {
  const all = JSON.stringify(hand);
  assert.ok(!all.includes('NaN'));
});

test('手指可以伸到别的键上：左小指伸到 1，指尖在 1 上，路径没有 NaN', () => {
  const lp = hand.fingers.find((f) => f.finger === 'LP');
  const tip = hand.tipFor('Digit1');
  const k = layout.keys.Digit1;
  assert.ok(Math.abs(tip[0] - pos(k.cx)) < 1 && Math.abs(tip[1] - pos(k.cy)) < U / 2);
  const b = lp.build(tip);
  assert.ok(!JSON.stringify(b).includes('NaN'));
  assert.notEqual(b.path, lp.path);
});
