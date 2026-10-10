// 键盘输入：把 keydown 归一成「字符 / 退格」，顺带报告中文输入法、大写锁定、按的是哪边的 Shift。

const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

export function attachInput(target, handlers) {
  const { onChar, onBackspace, onKey, onIme, onCapsLock } = handlers;
  const shiftDown = new Set(); // ShiftLeft / ShiftRight
  let caps = null;

  function down(e) {
    if (e.target.closest?.(EDITABLE)) return; // 在输入框里打字时不接管

    const nowCaps = e.getModifierState?.('CapsLock') ?? false;
    if (nowCaps !== caps) { caps = nowCaps; onCapsLock?.(caps); }

    // 中文输入法：浏览器给的是 Process / 229，拿不到真实字符
    if (e.isComposing || e.key === 'Process' || e.keyCode === 229) {
      onIme?.();
      return;
    }

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shiftDown.add(e.code);
    if (!e.repeat) onKey?.(e.code);

    if (e.metaKey || e.ctrlKey || e.altKey) return; // 不抢系统快捷键
    if (e.repeat) return; // 按住不放不算连打

    if (e.key === 'Backspace') {
      e.preventDefault();
      onBackspace?.();
    } else if (e.key.length === 1) {
      e.preventDefault(); // 空格不滚屏，' 不触发 Firefox 快速查找
      const shiftSide = shiftDown.has('ShiftLeft') ? 'ShiftLeft' : shiftDown.has('ShiftRight') ? 'ShiftRight' : null;
      onChar?.(e.key, { code: e.code, shiftSide });
    }
  }

  function up(e) {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shiftDown.delete(e.code);
  }

  function blur() { shiftDown.clear(); }

  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return function detach() {
    target.removeEventListener('keydown', down);
    target.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
  };
}
