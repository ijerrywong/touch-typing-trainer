// 手的几何：从上往下看，两只手搭在键盘上，指尖落在基准键。纯函数，不碰 DOM。
// 坐标是 SVG 单位（一个字母键宽 = U）。

const HOME = { LP: 'KeyA', LR: 'KeyS', LM: 'KeyD', LI: 'KeyF', RI: 'KeyJ', RM: 'KeyK', RR: 'KeyL', RP: 'Semicolon' };
const LEFT = ['LP', 'LR', 'LM', 'LI'];
const MIRROR = { LP: 'RP', LR: 'RR', LM: 'RM', LI: 'RI' };

// 指形：手指沿长度方向的宽度变化 [位置 t（0 = 指根，1 = 指尖圆头的圆心）, 相对宽度]
export const PROFILES = {
  // 第二个关节（0.38）略鼓，越往指尖越细
  normal: [[-0.25, 1.04], [0, 1], [0.2, 0.95], [0.38, 0.97], [0.52, 0.91], [0.68, 0.9], [0.82, 0.87], [0.92, 0.85]],
  // 弯着的手指从上看被压短，粗细变化小，关节更鼓
  curled: [[-0.25, 1.04], [0, 1], [0.25, 0.98], [0.42, 1.02], [0.58, 0.95], [0.74, 0.95], [0.86, 0.92], [0.94, 0.9]],
  // 修长：一路收细
  slender: [[-0.25, 1.05], [0, 1], [0.2, 0.92], [0.38, 0.92], [0.55, 0.84], [0.7, 0.82], [0.84, 0.76], [0.93, 0.72]],
  // 卡通：粗细几乎不变
  sausage: [[-0.25, 1], [0, 1], [0.5, 1.02], [0.92, 1]],
};
const THUMB_PROFILE = [[-0.3, 1.1], [0, 1.06], [0.3, 1], [0.55, 0.97], [0.75, 0.93], [0.9, 0.9]];

/** 默认手形。长度单位都是键宽。 */
export const DEFAULT_SHAPE = {
  width: { P: 0.64, R: 0.72, M: 0.76, I: 0.76, T: 0.88 }, // 手指宽度
  widthScale: 1,
  rootY: 0.5, // 指根基线：Z 那排中心往下多少；越小手指越短（越弯）
  // 指根相对基准键：[x 偏移（正 = 往手心）, y 偏移]
  root: { P: [0.28, 0.22], R: [0.12, 0.08], M: [0, 0], I: [-0.08, 0.08] },
  bend: { P: 0.05, R: 0.025, M: 0, I: -0.02, T: -0.08 }, // 弯曲（正 = 往拇指方向）
  profile: 'normal',
  tipLift: 0.08, // 指尖圆心比键中心高多少
  thumbRoot: [0.02, 1.55], // 相对食指指根 [往手心, 往下]
  thumbTip: [0.92, -0.02], // 相对食指指根的 x、相对空格中心的 y
  palmSpread: 1, // 手掌外缘鼓出的程度
  creases: [3, 2], // 两个关节各几道褶皱
};

/** 选定的手形（spikes/05-hands 里的第 2 种）：手指弯着打字，从上看更短更粗，指根更靠上 */
export const SHAPES = {
  curled: {
    rootY: 0.2, widthScale: 1.06, profile: 'curled', tipLift: 0.02,
    bend: { P: 0.03, R: 0.015, M: 0, I: -0.01 },
    root: { P: [0.3, 0.3], R: [0.12, 0.1], M: [0, 0], I: [-0.06, 0.08] },
    thumbRoot: [0.05, 1.45], creases: [2, 1],
  },
};

const f1 = (n) => n.toFixed(1);
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const unit = ([x, y]) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
const perp = ([x, y]) => [-y, x];

/** Catmull-Rom 闭合曲线 → 贝塞尔路径 */
export function smoothClosed(pts) {
  const n = pts.length;
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])} `;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])},${f1(c1[1])} ${f1(c2[0])},${f1(c2[1])} ${f1(p2[0])},${f1(p2[1])} `;
  }
  return `${d}Z`;
}

/** 一根手指的中轴：从指根 R 到指尖 E 的二次曲线，bend 让它微微弯。 */
function axis(R, E, bend) {
  const L = Math.hypot(E[0] - R[0], E[1] - R[1]);
  const C = add([(R[0] + E[0]) / 2, (R[1] + E[1]) / 2], perp(unit([E[0] - R[0], E[1] - R[1]])), bend * L);
  const at = (t) => {
    if (t < 0) return add(R, unit([C[0] - R[0], C[1] - R[1]]), t * L); // 指根往手掌里延长，好和手掌接上
    const s = 1 - t;
    return [s * s * R[0] + 2 * s * t * C[0] + t * t * E[0], s * s * R[1] + 2 * s * t * C[1] + t * t * E[1]];
  };
  const dir = (t) => {
    const tt = Math.max(0, t);
    return unit([2 * (1 - tt) * (C[0] - R[0]) + 2 * tt * (E[0] - C[0]), 2 * (1 - tt) * (C[1] - R[1]) + 2 * tt * (E[1] - C[1])]);
  };
  return { at, dir, L };
}

/** 手指外形：两侧按 PROFILE 变宽变窄，指尖是圆头。 */
export function fingerOutline(R, E, w, bend, profile = PROFILES.normal) {
  const ax = axis(R, E, bend);
  const left = profile.map(([t, k]) => add(ax.at(t), perp(ax.dir(t)), (w / 2) * k));
  const right = profile.map(([t, k]) => add(ax.at(t), perp(ax.dir(t)), (-w / 2) * k)).reverse();
  const d = ax.dir(1), n = perp(d), r = (w / 2) * profile[profile.length - 1][1];
  const cap = [0, 0.25, 0.5, 0.75, 1].map((a) => {
    const ang = a * Math.PI;
    return add(add(E, n, r * Math.cos(ang)), d, r * Math.sin(ang) * 1.08);
  });
  return { path: smoothClosed([...left, ...cap, ...right]), axis: ax, tipRadius: r };
}

/** 指甲：在指尖圆头上，近端（甲根）微凹，远端圆。返回局部坐标的 path + 变换矩阵。 */
function nailShape(ax, E, w, r, scale = 1) {
  const d = ax.dir(1), n = perp(d);
  const c = add(E, d, r * 0.2);
  const hw = w * 0.3 * scale, hl = w * 0.3 * scale;
  // 局部坐标：u 横向，v 朝指尖
  const path = `M${f1(-hw)},${f1(-hl * 0.55)} Q0,${f1(-hl * 0.9)} ${f1(hw)},${f1(-hl * 0.55)} `
    + `L${f1(hw * 0.98)},${f1(hl * 0.35)} C${f1(hw * 0.95)},${f1(hl * 1.15)} ${f1(-hw * 0.95)},${f1(hl * 1.15)} ${f1(-hw * 0.98)},${f1(hl * 0.35)} Z`;
  const shine = `M${f1(-hw * 0.45)},${f1(-hl * 0.2)} Q${f1(-hw * 0.55)},${f1(hl * 0.4)} ${f1(-hw * 0.2)},${f1(hl * 0.7)}`;
  return { path, shine, matrix: [n[0], n[1], d[0], d[1], c[0], c[1]].map((x) => +x.toFixed(4)) };
}

/** 关节褶皱：在 t 处横过手指的几道弧线，弧朝指尖方向鼓。 */
function creases(ax, w, t, count, spread) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const tt = t + (i - (count - 1) / 2) * 0.035;
    const p = ax.at(tt), d = ax.dir(tt), n = perp(d);
    const half = (w / 2) * spread * (1 - Math.abs(i - (count - 1) / 2) * 0.25);
    const a = add(p, n, half), b = add(p, n, -half), c = add(p, d, w * 0.12);
    out.push(`M${f1(a[0])},${f1(a[1])} Q${f1(c[0])},${f1(c[1])} ${f1(b[0])},${f1(b[1])}`);
  }
  return out;
}

/**
 * @param layout computeLayout() 的结果
 * @param pos    键盘单位 → SVG 坐标
 * @param U      一个键宽的 SVG 单位
 */
export function computeHand(layout, pos, U, shape = {}) {
  const S = { ...DEFAULT_SHAPE, ...shape };
  const WIDTH = Object.fromEntries(Object.entries({ ...DEFAULT_SHAPE.width, ...shape.width }).map(([k, v]) => [k, v * S.widthScale]));
  const ROOT = { ...DEFAULT_SHAPE.root, ...shape.root };
  const BEND = { ...DEFAULT_SHAPE.bend, ...shape.bend };
  const PROFILE = Array.isArray(S.profile) ? S.profile : PROFILES[S.profile];
  const c = (id) => [pos(layout.keys[id].cx), pos(layout.keys[id].cy)];
  const Yr = c('KeyZ')[1] + S.rootY * U; // 指根基线：打字时手指弯着，从上看指根在下排附近
  const spaceY = c('Space')[1];
  const fingers = [];
  const palms = [];
  const knuckles = [];

  for (const side of ['L', 'R']) {
    const inward = side === 'L' ? 1 : -1; // 朝手心（两手中间）的方向
    const ids = side === 'L' ? LEFT : LEFT.map((f) => MIRROR[f]);
    const roots = {};

    for (const f of ids) {
      const kind = f[1];
      const w = WIDTH[kind] * U;
      const [dx, dy] = ROOT[kind];
      const key = c(HOME[f]);
      const R = [key[0] + inward * dx * U, Yr + dy * U];
      const E = [key[0], key[1] - S.tipLift * U]; // 指尖圆头的圆心，略靠键的上半部
      roots[kind] = R;
      // 按任意指尖位置生成这根手指：伸向别的键时重新调用
      const build = (tip) => {
        const o = fingerOutline(R, tip, w, inward * BEND[kind], PROFILE);
        return {
          path: o.path,
          // 变色只填手指本身，不伸进手掌
          activePath: fingerOutline(R, tip, w, inward * BEND[kind], PROFILE.filter(([t]) => t >= 0)).path,
          nail: nailShape(o.axis, tip, w, o.tipRadius),
          creases: [...creases(o.axis, w, 0.38, S.creases[0], 0.55), ...creases(o.axis, w, 0.68, S.creases[1], 0.45)],
        };
      };
      fingers.push({ finger: f, side, root: R, tip: E, build, ...build(E) });
      knuckles.push({ side, cx: R[0], cy: R[1] + 0.05 * U, rx: w * 0.3, ry: w * 0.2 });
    }

    // 大拇指：从手掌内侧下方伸向空格键
    const { I, M, R, P } = roots;
    const wT = WIDTH.T * U;
    const tR = [I[0] + inward * S.thumbRoot[0] * U, Yr + S.thumbRoot[1] * U];
    const tE = [I[0] + inward * S.thumbTip[0] * U, spaceY + S.thumbTip[1] * U];
    const buildThumb = (tip) => {
      const t = fingerOutline(tR, tip, wT, inward * BEND.T, THUMB_PROFILE);
      return {
        path: t.path,
        activePath: fingerOutline(tR, tip, wT, inward * BEND.T, THUMB_PROFILE.filter(([x]) => x >= 0.15)).path,
        nail: nailShape(t.axis, tip, wT, t.tipRadius, 0.85),
        creases: creases(t.axis, wT, 0.5, Math.min(2, S.creases[1]), 0.4),
      };
    };
    fingers.push({ finger: 'TH', side, root: tR, tip: tE, build: buildThumb, ...buildThumb(tE) });

    // 手背：从指根一路包到手腕
    const wP = WIDTH.P * U, wI = WIDTH.I * U;
    const bottom = Yr + 4.5 * U; // 画长一点：整只手往上挪时手腕不露底（下面有淡出遮罩）
    palms.push(smoothClosed([
      add(I, [inward * wI * 0.45, 0.2 * U]),
      add(I, [0, -0.1 * U]),
      add(M, [0, -0.12 * U]),
      add(R, [0, -0.1 * U]),
      add(P, [-inward * wP * 0.1, -0.08 * U]),
      add(P, [-inward * wP * 0.55 * S.palmSpread, 0.3 * U]),
      add(P, [-inward * wP * 0.75 * S.palmSpread, 1.1 * U]),
      [P[0] - inward * 0.25 * S.palmSpread * U, Yr + 2.2 * U],
      [P[0] - inward * 0.05 * U, bottom],
      [I[0] + inward * 0.15 * U, bottom],
      [I[0] + inward * 0.35 * U, Yr + 2.1 * U],
      add(tR, [inward * wT * 0.3, 0.25 * U]),
      add(I, [inward * 0.55 * U, 0.75 * U]),
    ]));
  }

  return {
    palms, // [左, 右]
    fingers,
    /** 手指伸到某个键上时，指尖圆心放在哪 */
    tipFor: (keyId) => { const [x, y] = c(keyId); return [x, y - S.tipLift * U]; },
    knuckles,
    fadeFrom: Yr + 1.6 * U, // 从这里往下手腕渐渐淡出
    bottom: Yr + 2.9 * U, // 键盘要给手留到这里
  };
}
