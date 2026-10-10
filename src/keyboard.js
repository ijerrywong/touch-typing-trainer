// 虚拟键盘：SVG 渲染。1 个字母键宽 = UNIT 个 SVG 单位，手的图层共用这套坐标。
// 外观全部交给 keyboard.css，这里只给元素打 class / data-*。
import { computeLayout } from './keymap.js';

export const UNIT = 60;
export const PAD = 12; // 键盘外壳内边距
const GAP = 2; // 键帽之间的缝，属于几何不属于外观

const SVG_NS = 'http://www.w3.org/2000/svg';
function el(name, attrs = {}, text) {
  const n = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

const isLetter = (key) => /^Key[A-Z]$/.test(key.id);

export function createKeyboard() {
  const layout = computeLayout();
  const W = layout.width * UNIT + PAD * 2;
  const H = layout.height * UNIT + PAD * 2;
  const pos = (u) => u * UNIT + PAD; // 键盘单位 → SVG 坐标

  const svg = el('svg', { class: 'kb', role: 'img', 'aria-label': '虚拟键盘' });
  const caseRect = el('rect', { class: 'kb-case', x: 0, y: 0, width: W, height: H });
  const keysLayer = el('g', { class: 'kb-keys' });
  const overlay = el('g', { class: 'kb-overlay' }); // 手画在这里：盖住键帽，但在字下面
  const labelsLayer = el('g', { class: 'kb-labels' });
  svg.append(caseRect, keysLayer, overlay, labelsLayer);

  const keyEls = {};
  for (const key of Object.values(layout.keys)) {
    const x = pos(key.x) + GAP, y = pos(key.y) + GAP;
    const w = key.w * UNIT - GAP * 2, h = UNIT - GAP * 2;
    const g = el('g', { class: 'kb-key', 'data-id': key.id });
    if (key.finger) g.dataset.finger = key.finger;

    if (key.id === 'Arrows') {
      // 方向键：下排 ← ↓ →，↓ 上面叠 ↑，只作参照
      const half = (h - GAP) / 2, cell = UNIT;
      const arrow = (ax, ay) => el('rect', { class: 'kb-cap kb-cap--minor', x: ax, y: ay, width: cell - GAP * 2, height: half });
      g.append(arrow(x, y + half + GAP), arrow(x + cell, y), arrow(x + cell, y + half + GAP), arrow(x + cell * 2, y + half + GAP));
    } else {
      g.append(el('rect', { class: 'kb-cap', x, y, width: w, height: h }));
      if (key.id === 'KeyF' || key.id === 'KeyJ') {
        // 定位小凸起
        const cx = pos(key.cx), by = pos(key.cy) + UNIT * 0.32;
        g.append(el('line', { class: 'kb-bump', x1: cx - 7, y1: by, x2: cx + 7, y2: by }));
      }
    }
    keysLayer.append(g);
    keyEls[key.id] = g;

    // 标签
    const cx = pos(key.cx), cy = pos(key.cy);
    const lg = el('g', { class: 'kb-label', 'data-id': key.id });
    if (key.label != null) {
      if (key.label) lg.append(el('text', { class: 'kb-text kb-text--mod', x: cx, y: cy }, key.label));
    } else if (isLetter(key)) {
      lg.append(el('text', { class: 'kb-text kb-text--letter', x: cx, y: cy }, key.shiftChar));
    } else {
      lg.append(el('text', { class: 'kb-text kb-text--top', x: cx, y: cy - UNIT * 0.17 }, key.shiftChar));
      lg.append(el('text', { class: 'kb-text kb-text--main', x: cx, y: cy + UNIT * 0.15 }, key.char));
    }
    labelsLayer.append(lg);
  }

  // 读 token 里的圆角，写进 rx 属性（Safari 不认 CSS 的 rx）
  function applyRadius() {
    const r = getComputedStyle(svg).getPropertyValue('--kb-key-radius').trim() || '0';
    svg.querySelectorAll('.kb-cap').forEach((n) => n.setAttribute('rx', r));
    caseRect.setAttribute('rx', String(Number(r) * 2.5));
  }

  let padBottom = 0;
  function updateViewBox() {
    svg.setAttribute('viewBox', `0 0 ${W} ${H + padBottom}`);
  }
  updateViewBox();

  let targets = [];
  return {
    svg,
    overlay,
    layout,
    pos,
    height: H, // 不含 padBottom 的键盘高度
    /** 挂到页面后调用一次，让 token 生效 */
    mount(parent) {
      parent.append(svg);
      applyRadius();
    },
    /** 手会伸到键盘下面，给它留地方（SVG 单位） */
    setPadBottom(px) {
      padBottom = px;
      updateViewBox();
    },
    /** 熟悉模式：高亮要按的键 */
    setTargets(ids) {
      for (const id of targets) keyEls[id]?.classList.remove('is-target');
      targets = ids.filter((id) => keyEls[id]);
      for (const id of targets) keyEls[id].classList.add('is-target');
    },
    /** 提升模式：键帽按手指上色 */
    setColored(on) {
      svg.classList.toggle('kb--colored', on);
    },
    /** 按键反馈：kind = ok | err | neutral */
    press(id, kind = 'neutral') {
      const g = keyEls[id];
      if (!g) return;
      g.classList.remove('is-press-ok', 'is-press-err', 'is-press-neutral');
      // 下一帧再加回来，连按同一个键时动画才会重播
      requestAnimationFrame(() => {
        g.classList.add(`is-press-${kind}`);
        g.addEventListener('animationend', () => g.classList.remove(`is-press-${kind}`), { once: true });
      });
    },
  };
}
