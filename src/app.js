// 拼装：两种模式共用一个键盘和一路输入，切换模式时换掉键盘的显示方式。
import { FINGERS, SINGLE_KEY, KEYS, strokeFor, displayName } from './keymap.js';
import { createKeyboard } from './keyboard.js';
import { createHand } from './hand.js';
import { SHAPES } from './hand-geometry.js';
import { attachInput } from './input.js';
import { createDrill } from './drill.js';
import { createSession } from './session.js';
import { createTextView } from './textview.js';
import { normalizeText, SAMPLES } from './text.js';

const $ = (id) => document.getElementById(id);

// 只存个人偏好（上次的模式、自定义文字），读不到就用默认值
const store = {
  get(k) { try { return localStorage.getItem(`typing:${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`typing:${k}`, v); } catch { /* 无痕窗口等 */ } },
};

const kb = createKeyboard();
kb.mount($('keyboard'));

// 手有两种画法可选（spikes/05-hands 里的 7 线稿、10 毛玻璃），共用弯指手形。
// 目标键不在基准键时，手指循环「伸出 → 停 → 收回」，离开基准键期间原位留虚影（spikes/06-reach 选定）
const HAND_STYLES = { line: '线稿', glass: '毛玻璃' };
const hand = (() => {
  const all = Object.fromEntries(Object.keys(HAND_STYLES).map((st) => [st, createHand(kb, { style: st, shape: SHAPES.curled, reach: 'loop', ghost: true })]));
  let style = HAND_STYLES[store.get('hand')] ? store.get('hand') : 'line';
  let visible = false;
  let fingers = [];
  let reachKey = null;
  return {
    get style() { return style; },
    setStyle(st) {
      style = st;
      store.set('hand', st);
      if (visible) this.show();
    },
    show() {
      visible = true;
      all[style].show();
      all[style].setActive(fingers);
      all[style].setReach(reachKey);
    },
    hide() {
      visible = false;
      all[style].hide();
    },
    setActive(f) {
      fingers = f;
      all[style].setActive(f);
    },
    setReach(keyId) {
      reachKey = keyId;
      all[style].setReach(keyId);
    },
  };
})();

// 手的样式切换按钮
const styleRow = $('hand-style');
for (const [st, label] of Object.entries(HAND_STYLES)) {
  const b = document.createElement('button');
  b.className = 'ds-btn ds-btn--ghost';
  b.textContent = label;
  b.dataset.handStyle = st;
  b.onclick = () => {
    b.blur();
    hand.setStyle(st);
    syncStyleButtons();
  };
  styleRow.append(b);
}
function syncStyleButtons() {
  styleRow.querySelectorAll('[data-hand-style]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.handStyle === hand.style));
}
syncStyleButtons();

// ---------------- 熟悉键位 ----------------
const learn = (() => {
  const drill = createDrill({ pool: SINGLE_KEY }); // 只练单键，不练 Shift 组合
  const charEl = $('learn-char'), hintEl = $('learn-hint'), statsEl = $('learn-stats');

  function show() {
    const c = drill.current;
    const { keyId, fingers: [finger] } = strokeFor(c);
    charEl.textContent = displayName(c);
    charEl.classList.toggle('is-word', c === ' ');
    kb.setTargets([keyId]);
    hand.setActive([finger]);
    hand.setReach(keyId);

    // 键帽上字母印的是大写，提示里也用键帽上的写法
    const key = KEYS[keyId];
    const capName = /^Key/.test(keyId) ? key.shiftChar : displayName(key.char);
    const span = document.createElement('span');
    span.className = 'learn-finger';
    span.dataset.finger = finger;
    span.textContent = `${FINGERS[finger].name}按 ${capName}`;
    hintEl.replaceChildren(span);

    const st = drill.stats;
    statsEl.textContent = `对 ${st.correct} · 错 ${st.wrong} · 连对 ${st.streak}`;
  }

  return {
    enter() {
      kb.setColored(false);
      hand.show();
      show();
    },
    leave() {
      kb.setTargets([]);
      hand.hide();
    },
    onChar(c, meta) {
      const { correct } = drill.submit(c);
      kb.press(meta.code, correct ? 'ok' : 'err');
      if (!correct) {
        charEl.classList.remove('is-wrong');
        requestAnimationFrame(() => charEl.classList.add('is-wrong'));
      }
      show();
    },
    onBackspace() {},
  };
})();
$('learn-char').addEventListener('animationend', (e) => e.target.classList.remove('is-wrong'));

// ---------------- 提升速度 ----------------
const speed = (() => {
  const tv = createTextView($('speed-text'));
  const statsEl = $('speed-stats');
  let sampleIndex = 0;
  let text = store.get('custom') || SAMPLES[0];
  let session;
  let timer = null;

  function showStats() {
    const s = session.stats();
    statsEl.textContent = `WPM ${s.wpm} · 准确率 ${s.accuracy}% · 打错 ${s.mistakes} 次 · ${Math.round(s.progress * 100)}%`;
    $('speed-done').hidden = !session.done;
    if (session.done) $('speed-result').textContent = `用时 ${s.seconds} 秒，WPM ${s.wpm}，准确率 ${s.accuracy}%`;
  }

  function start(t = text) {
    text = t;
    session = createSession(text);
    tv.render(session);
    showStats();
    clearInterval(timer);
    timer = setInterval(() => !session.done && session.cursor > 0 && showStats(), 1000);
  }

  // 自定义文字
  const panel = $('speed-custom'), area = $('speed-custom-text'), hint = $('speed-custom-hint');
  const defaultHint = hint.textContent;
  function closeCustom() { panel.hidden = true; hint.textContent = defaultHint; area.blur(); }
  $('speed-custom-toggle').onclick = (e) => {
    e.currentTarget.blur();
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { area.value = text; area.focus(); }
  };
  $('speed-custom-cancel').onclick = closeCustom;
  $('speed-custom-start').onclick = () => {
    const { text: t, removed } = normalizeText(area.value);
    if (!t) { hint.textContent = '没有可以练习的英文字符。'; return; }
    store.set('custom', t);
    closeCustom();
    start(t);
    if (removed.length) {
      statsEl.textContent = `已去掉键盘打不出的字符：${removed.slice(0, 12).join(' ')}${removed.length > 12 ? ' …' : ''}`;
    }
  };
  $('speed-next').onclick = (e) => {
    e.currentTarget.blur();
    sampleIndex = (sampleIndex + 1) % SAMPLES.length;
    start(SAMPLES[sampleIndex]);
  };
  $('speed-restart').onclick = (e) => { e.currentTarget.blur(); start(); };

  return {
    enter() {
      kb.setColored(true);
      if (!session) start();
    },
    leave() {},
    onChar(c, meta) {
      if (session.done) {
        if (c === ' ') start();
        return;
      }
      const r = session.input(c);
      if (r) kb.press(meta.code, r.ok ? 'ok' : 'err');
      tv.sync(session);
      showStats();
    },
    onBackspace() {
      if (session.backspace()) kb.press('Backspace');
      tv.sync(session);
      showStats();
    },
    onEnter() {
      if (session.done) start();
    },
  };
})();

// ---------------- 模式切换 ----------------
const modes = { learn, speed };
let mode = null;
function setMode(name) {
  if (!modes[name]) name = 'learn';
  if (mode === name) return;
  modes[mode]?.leave();
  mode = name;
  store.set('mode', name);
  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.mode === name);
    b.setAttribute('aria-selected', b.dataset.mode === name);
  });
  document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== name; });
  modes[name].enter();
}
document.querySelectorAll('[data-mode]').forEach((b) => {
  b.onclick = () => { b.blur(); setMode(b.dataset.mode); };
});
setMode(store.get('mode') || 'learn');

// ---------------- 输入 ----------------
attachInput(window, {
  onChar(c, meta) {
    $('ime-warn').hidden = true;
    modes[mode].onChar(c, meta);
  },
  onBackspace() { modes[mode].onBackspace(); },
  onKey(code) { if (code === 'Enter') modes[mode].onEnter?.(); },
  onIme() { $('ime-warn').hidden = false; },
  onCapsLock(on) { $('caps-warn').hidden = !on; },
});
