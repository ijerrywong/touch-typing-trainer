// 键位数据：MacBook 美式键盘。键 id 用 KeyboardEvent.code，方便和真实按键对上。
// 指法与 make.py（指法图）一致。

export const FINGERS = {
  LP: { name: '左手小指', hand: 'L', home: 'KeyA' },
  LR: { name: '左手无名指', hand: 'L', home: 'KeyS' },
  LM: { name: '左手中指', hand: 'L', home: 'KeyD' },
  LI: { name: '左手食指', hand: 'L', home: 'KeyF' },
  RI: { name: '右手食指', hand: 'R', home: 'KeyJ' },
  RM: { name: '右手中指', hand: 'R', home: 'KeyK' },
  RR: { name: '右手无名指', hand: 'R', home: 'KeyL' },
  RP: { name: '右手小指', hand: 'R', home: 'Semicolon' },
  TH: { name: '大拇指', hand: null, home: 'Space' },
};

// k(id, 基础字符, Shift 字符, 手指, 宽度, 标签)
const k = (id, char, shiftChar, finger, w = 1, label = null) => ({ id, char, shiftChar, finger, w, label });
const letter = (c, finger) => k(`Key${c}`, c.toLowerCase(), c, finger);
const mod = (id, label, w, finger = null) => k(id, null, null, finger, w, label);

export const ROWS = [
  [
    k('Backquote', '`', '~', 'LP'), k('Digit1', '1', '!', 'LP'), k('Digit2', '2', '@', 'LR'),
    k('Digit3', '3', '#', 'LM'), k('Digit4', '4', '$', 'LI'), k('Digit5', '5', '%', 'LI'),
    k('Digit6', '6', '^', 'RI'), k('Digit7', '7', '&', 'RI'), k('Digit8', '8', '*', 'RM'),
    k('Digit9', '9', '(', 'RR'), k('Digit0', '0', ')', 'RP'), k('Minus', '-', '_', 'RP'),
    k('Equal', '=', '+', 'RP'), mod('Backspace', 'delete', 1.5, 'RP'),
  ],
  [
    mod('Tab', 'tab', 1.5, 'LP'), letter('Q', 'LP'), letter('W', 'LR'), letter('E', 'LM'),
    letter('R', 'LI'), letter('T', 'LI'), letter('Y', 'RI'), letter('U', 'RI'), letter('I', 'RM'),
    letter('O', 'RR'), letter('P', 'RP'), k('BracketLeft', '[', '{', 'RP'),
    k('BracketRight', ']', '}', 'RP'), k('Backslash', '\\', '|', 'RP'),
  ],
  [
    mod('CapsLock', 'caps lock', 1.75, 'LP'), letter('A', 'LP'), letter('S', 'LR'), letter('D', 'LM'),
    letter('F', 'LI'), letter('G', 'LI'), letter('H', 'RI'), letter('J', 'RI'), letter('K', 'RM'),
    letter('L', 'RR'), k('Semicolon', ';', ':', 'RP'), k('Quote', "'", '"', 'RP'),
    mod('Enter', 'return', 1.75, 'RP'),
  ],
  [
    mod('ShiftLeft', 'shift', 2.25, 'LP'), letter('Z', 'LP'), letter('X', 'LR'), letter('C', 'LM'),
    letter('V', 'LI'), letter('B', 'LI'), letter('N', 'RI'), letter('M', 'RI'),
    k('Comma', ',', '<', 'RM'), k('Period', '.', '>', 'RR'), k('Slash', '/', '?', 'RP'),
    mod('ShiftRight', 'shift', 2.25, 'RP'),
  ],
  [
    mod('Fn', 'fn', 1), mod('ControlLeft', 'control', 1), mod('AltLeft', 'option', 1),
    mod('MetaLeft', 'command', 1.25), k('Space', ' ', null, 'TH', 5, ''),
    mod('MetaRight', 'command', 1.25), mod('AltRight', 'option', 1), mod('Arrows', '', 3),
  ],
];

export const KEYS = Object.fromEntries(ROWS.flat().map((key) => [key.id, key]));

// 字符 → 击键。Shift 由另一只手的小指按。
const STROKES = new Map();
for (const key of ROWS.flat()) {
  if (key.char != null) STROKES.set(key.char, { keyId: key.id, shiftId: null });
  if (key.shiftChar != null) {
    const shiftId = FINGERS[key.finger].hand === 'L' ? 'ShiftRight' : 'ShiftLeft';
    STROKES.set(key.shiftChar, { keyId: key.id, shiftId });
  }
}

/** 打出某个字符要按哪些键、用哪些手指。打不出来返回 null。 */
export function strokeFor(char) {
  const s = STROKES.get(char);
  if (!s) return null;
  const keyIds = s.shiftId ? [s.keyId, s.shiftId] : [s.keyId];
  return { ...s, keyIds, fingers: keyIds.map((id) => KEYS[id].finger) };
}

/** 所有能打出来的字符（95 个可打印 ASCII）。 */
export const TYPABLE = [...STROKES.keys()];

/** 不用 Shift、按一个键就能打出的字符（48 个：小写字母、数字、符号键下排、空格）。 */
export const SINGLE_KEY = TYPABLE.filter((c) => !STROKES.get(c).shiftId);

/** 显示框里给人看的名字。 */
export function displayName(char) {
  if (char === ' ') return '空格';
  return char;
}

/** 按键盘单位（1 = 一个字母键宽）算出每个键的位置。键盘和手共用这套坐标。 */
export function computeLayout() {
  const keys = {};
  ROWS.forEach((row, r) => {
    let x = 0;
    for (const key of row) {
      keys[key.id] = { ...key, x, y: r, cx: x + key.w / 2, cy: r + 0.5 };
      x += key.w;
    }
  });
  const width = Math.max(...ROWS.map((row) => row.reduce((s, key) => s + key.w, 0)));
  return { keys, width, height: ROWS.length };
}
