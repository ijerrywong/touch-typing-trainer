// 搭在键盘上的手：画在键盘的 overlay 图层里，指尖落在 ASDF / JKL;，大拇指在空格上。
// 颜色、透明度全部交给 hand.css；这里只出几何和结构。
import { computeHand } from './hand-geometry.js';
import { UNIT } from './keyboard.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
function el(name, attrs = {}, children = []) {
  const n = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  n.append(...children);
  return n;
}

// 画法：用哪个滤镜、画哪些细节
export const STYLES = {
  real: { filter: 'fx', knuckles: true, creases: true, nails: true }, // 写实：渐变 + 立体暗边 + 投影
  flat: { filter: 'outline', creases: true, nails: true }, // 扁平插画：纯色 + 外轮廓
  line: { filter: 'line', creases: true, nails: true }, // 线稿：只有轮廓线
  silhouette: { filter: null }, // 剪影：一块半透明的颜色
  cartoon: { filter: 'outline', nails: true }, // 卡通：粗轮廓
  glass: { filter: 'glass', nails: true }, // 毛玻璃：白色半透明 + 亮边
};

// 伸向目标键的方式（spikes/06-reach 对比用）。另有 ghost 开关：手指离开基准键时，在基准键上留虚线虚影
export const REACH = {
  none: '不动',
  stretch: '直接伸长',
  loop: '伸出—收回循环',
  shift: '整只手跟着挪',
  spring: '弹性生长',
};

let seq = 0;

/**
 * @param kb    createKeyboard() 的结果
 * @param opts  { style: STYLES 的键, shape: computeHand 的手形参数, reach: REACH 的键, ghost: 是否留原位虚影 }
 */
export function createHand(kb, { style = 'real', shape = {}, reach = 'none', ghost = false } = {}) {
  const geo = computeHand(kb.layout, kb.pos, UNIT, shape);
  const S = STYLES[style];
  const W = kb.svg.viewBox.baseVal.width;
  const n = seq++;
  const id = (name) => `hand${n}-${name}`; // 一页上有多只手时 id 不能撞
  const url = (name) => `url(#${id(name)})`;

  // 轮廓粗细是 token（--hand-outline-radius），挂到页面后才读得到
  const dilates = [];
  const dilate = (result) => {
    const d = el('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: 2, result });
    dilates.push(d);
    return d;
  };
  const shadow = (blur, dy) => [
    el('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: blur, result: 'soft' }),
    el('feOffset', { in: 'soft', dx: 0, dy, result: 'drop' }),
    el('feFlood', { class: 'hand-fx-shadow', result: 'shadowColor' }),
    el('feComposite', { in: 'shadowColor', in2: 'drop', operator: 'in', result: 'shadow' }),
  ];
  const ring = () => [
    dilate('fat'),
    el('feComposite', { in: 'fat', in2: 'SourceAlpha', operator: 'out', result: 'ringAlpha' }),
    el('feFlood', { class: 'hand-fx-outline', result: 'lineColor' }),
    el('feComposite', { in: 'lineColor', in2: 'ringAlpha', operator: 'in', result: 'ring' }),
  ];
  const merge = (...ins) => el('feMerge', {}, ins.map((i) => el('feMergeNode', { in: i })));
  const box = { x: '-10%', y: '-10%', width: '120%', height: '130%' };

  const filters = {
    // 写实：轮廓内侧一圈暗边 + 投到键盘上的影子
    fx: el('filter', { id: id('fx'), ...box }, [
      el('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 5, result: 'blur' }),
      el('feComposite', { in: 'SourceAlpha', in2: 'blur', operator: 'arithmetic', k2: 1, k3: -1, result: 'edge' }),
      el('feFlood', { class: 'hand-fx-shade', result: 'shadeColor' }),
      el('feComposite', { in: 'shadeColor', in2: 'edge', operator: 'in', result: 'shade' }),
      ...shadow(7, 9),
      merge('shadow', 'SourceGraphic', 'shade'),
    ]),
    // 外轮廓：整只手的形状往外扩一圈当描边，手指和手掌之间不出现内线
    outline: el('filter', { id: id('outline'), ...box }, [...ring(), merge('ring', 'SourceGraphic')]),
    // 线稿：只留外扩那一圈
    line: el('filter', { id: id('line'), ...box }, [...ring(), merge('ring')]),
    // 毛玻璃：半透明 + 亮边 + 柔和投影
    glass: el('filter', { id: id('glass'), ...box }, [...ring(), ...shadow(8, 6), merge('shadow', 'SourceGraphic', 'ring')]),
  };

  const defs = el('defs', {}, [
    // 皮肤：指尖亮、手腕暗（写实用）
    el('linearGradient', { id: id('skin'), gradientUnits: 'userSpaceOnUse', x1: 0, y1: kb.pos(2), x2: 0, y2: geo.bottom }, [
      el('stop', { class: 'hand-skin-light', offset: 0 }),
      el('stop', { class: 'hand-skin-mid', offset: 0.45 }),
      el('stop', { class: 'hand-skin-dark', offset: 1 }),
    ]),
    ...(S.filter ? [filters[S.filter]] : []),
    // 骨节高光要柔
    el('filter', { id: id('soft'), x: '-50%', y: '-50%', width: '200%', height: '200%' }, [el('feGaussianBlur', { stdDeviation: 4 })]),
    // 手腕往下淡出，像手臂从屏幕外伸进来
    el('linearGradient', { id: id('fade-grad'), gradientUnits: 'userSpaceOnUse', x1: 0, y1: geo.fadeFrom, x2: 0, y2: geo.bottom }, [
      el('stop', { class: 'hand-fade-on', offset: 0 }),
      el('stop', { class: 'hand-fade-off', offset: 1 }),
    ]),
    el('mask', { id: id('fade'), class: 'hand-fade', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: geo.bottom + UNIT }, [
      el('rect', { x: 0, y: 0, width: W, height: geo.bottom + UNIT, fill: url('fade-grad') }),
    ]),
  ]);

  // ---- 手：左右各一组，「整只手跟着挪」时整组平移 ----
  const sides = {};
  const parts = geo.fingers.map(() => ({}));
  for (const side of ['L', 'R']) {
    const mine = geo.fingers.map((f, i) => [f, i]).filter(([f]) => f.side === side);
    // fill 属性给写实的渐变；其他画法在 hand.css 里用 CSS 覆盖成纯色
    const body = el('g', { class: 'hand-body', fill: url('skin'), ...(S.filter ? { filter: url(S.filter) } : {}) }, [
      el('path', { d: geo.palms[side === 'L' ? 0 : 1] }),
    ]);
    const ghosts = el('g', { class: 'hand-ghosts' });
    const active = el('g', { class: 'hand-active' });
    const details = el('g', { class: 'hand-details' },
      S.knuckles ? geo.knuckles.filter((k) => k.side === side).map(({ cx, cy, rx, ry }) =>
        el('ellipse', { class: 'hand-knuckle', filter: url('soft'), cx, cy, rx, ry })) : []);

    for (const [f, i] of mine) {
      const p = parts[i];
      p.body = el('path', { d: f.path });
      body.append(p.body);
      p.ghost = el('path', { class: 'hand-ghost', d: f.activePath, 'data-finger': f.finger });
      ghosts.append(p.ghost);
      p.active = el('path', { class: 'hand-active-finger', d: f.activePath, 'data-finger': f.finger });
      active.append(p.active);
      p.creases = S.creases ? f.creases.map((d) => el('path', { class: 'hand-crease', d })) : [];
      details.append(...p.creases);
      if (S.nails) {
        p.nailPath = el('path', { class: 'hand-nail', d: f.nail.path });
        p.nailShine = el('path', { class: 'hand-nail-shine', d: f.nail.shine });
        p.nail = el('g', { transform: `matrix(${f.nail.matrix.join(' ')})` }, [p.nailPath, p.nailShine]);
        details.append(p.nail);
      }
    }
    sides[side] = el('g', { class: 'hand-side', 'data-side': side }, [ghosts, body, active, details]);
  }

  const g = el('g', { class: `hand hand--${style} hand--reach-${reach}`, 'aria-hidden': 'true', mask: url('fade') }, [defs, sides.L, sides.R]);

  // ---------------- 伸向目标键 ----------------
  // 每根手指记着「现在指尖在哪」，每帧按动画算出新位置再重画这一根
  const state = geo.fingers.map((f) => ({ cur: f.tip, drawn: f.tip, from: f.tip, to: f.tip }));
  const shift = { L: { cur: [0, 0], from: [0, 0], to: [0, 0] }, R: { cur: [0, 0], from: [0, 0], to: [0, 0] } };
  let reachIndex = -1; // 正在伸出去的手指
  let startedAt = 0;
  let raf = 0;

  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const same = (a, b) => Math.abs(a[0] - b[0]) < 0.05 && Math.abs(a[1] - b[1]) < 0.05;
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const easeOutBack = (t) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; }; // 冲过头一点再回来
  const anticipate = (t) => (t < 0.25 ? -0.12 * Math.sin((t / 0.25) * Math.PI) : easeOutBack((t - 0.25) / 0.75)); // 先缩一下再弹出

  function ms(name, fallback) {
    const v = getComputedStyle(g).getPropertyValue(name).trim();
    const n = parseFloat(v);
    if (Number.isNaN(n)) return fallback;
    return v.endsWith('ms') ? n : n * 1000;
  }
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function draw(i) {
    const st = state[i];
    if (same(st.cur, st.drawn)) return;
    st.drawn = st.cur;
    const b = geo.fingers[i].build(st.cur);
    const p = parts[i];
    p.body.setAttribute('d', b.path);
    p.active.setAttribute('d', b.activePath);
    p.creases.forEach((n, k) => n.setAttribute('d', b.creases[k]));
    if (p.nail) p.nail.setAttribute('transform', `matrix(${b.nail.matrix.join(' ')})`);
  }

  function frame(now) {
    const t = now - startedAt;
    const dur = ms('--hand-reach-duration', 240);
    const cycle = ms('--hand-reach-cycle', 1600);
    const instant = reduced();
    let busy = false;

    state.forEach((st, i) => {
      const f = geo.fingers[i];
      if (i === reachIndex && reach === 'loop' && !instant) {
        // 伸出 → 停 → 收回 → 停，循环
        const k = (t % cycle) / cycle;
        const amt = k < 0.3 ? easeOut(k / 0.3) : k < 0.6 ? 1 : k < 0.85 ? 1 - easeOut((k - 0.6) / 0.25) : 0;
        st.cur = lerp(f.tip, st.to, amt);
        busy = true;
      } else if (i === reachIndex && reach === 'spring' && !instant) {
        const grow = dur * 1.6;
        if (t < grow) {
          st.cur = lerp(st.from, st.to, anticipate(t / grow));
        } else {
          // 到位后指尖每个周期轻点一下：往指根方向缩一点再回来
          const k = ((t - grow) % cycle) / cycle;
          const tap = k < 0.2 ? Math.sin((k / 0.2) * Math.PI) : 0;
          const d = [f.root[0] - st.to[0], f.root[1] - st.to[1]];
          const l = Math.hypot(...d) || 1;
          st.cur = [st.to[0] + (d[0] / l) * tap * 5, st.to[1] + (d[1] / l) * tap * 5];
        }
        busy = true;
      } else {
        const k = instant ? 1 : Math.min(1, t / dur);
        st.cur = lerp(st.from, st.to, easeOut(k));
        if (k < 1) busy = true;
      }
      draw(i);
      // 虚影：只要这根手指没回到基准键就显示
      if (ghost) parts[i].ghost.classList.toggle('is-visible', Math.hypot(st.cur[0] - f.tip[0], st.cur[1] - f.tip[1]) > 2);
    });

    for (const side of ['L', 'R']) {
      const sh = shift[side];
      const k = instant ? 1 : Math.min(1, t / dur);
      sh.cur = lerp(sh.from, sh.to, easeOut(k));
      if (k < 1) busy = true;
      sides[side].setAttribute('transform', `translate(${sh.cur[0].toFixed(1)} ${sh.cur[1].toFixed(1)})`);
    }

    raf = busy ? requestAnimationFrame(frame) : 0;
  }

  /** 让负责 keyId 的手指伸过去；null 或基准键 = 全部收回 */
  function setReach(keyId) {
    const key = keyId && kb.layout.keys[keyId];
    const fid = key?.finger;
    const idx = reach === 'none' || !fid || fid === 'TH' ? -1 : geo.fingers.findIndex((f) => f.finger === fid);
    const target = idx >= 0 ? geo.tipFor(keyId) : null;
    const isHome = idx >= 0 && same(target, geo.fingers[idx].tip);
    reachIndex = isHome ? -1 : idx;

    // 整只手跟着挪：手平移一部分，手指再伸剩下的
    const side = reachIndex >= 0 ? geo.fingers[reachIndex].side : null;
    let move = [0, 0];
    if (reach === 'shift' && reachIndex >= 0) {
      const ratio = parseFloat(getComputedStyle(g).getPropertyValue('--hand-shift-ratio')) || 0.4;
      const home = geo.fingers[reachIndex].tip;
      move = [(target[0] - home[0]) * ratio, (target[1] - home[1]) * ratio];
    }
    for (const sd of ['L', 'R']) {
      shift[sd].from = shift[sd].cur;
      shift[sd].to = sd === side ? move : [0, 0];
    }
    state.forEach((st, i) => {
      st.from = st.cur;
      st.to = i === reachIndex ? [target[0] - move[0], target[1] - move[1]] : geo.fingers[i].tip;
    });

    startedAt = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  return {
    el: g,
    show() {
      kb.overlay.replaceChildren(g);
      kb.setPadBottom(geo.bottom - kb.height);
      const r = getComputedStyle(g).getPropertyValue('--hand-outline-radius').trim();
      for (const d of dilates) d.setAttribute('radius', r || '2');
      if (!raf && (reachIndex >= 0 || reach !== 'none')) { startedAt = performance.now(); raf = requestAnimationFrame(frame); }
    },
    hide() {
      cancelAnimationFrame(raf);
      raf = 0;
      g.remove();
      kb.setPadBottom(0);
    },
    /** 给要用的手指淡色填充，传空数组清除 */
    setActive(fingers) {
      for (const p of parts) p.active.classList.toggle('is-active', fingers.includes(p.active.dataset.finger));
    },
    setReach,
  };
}
