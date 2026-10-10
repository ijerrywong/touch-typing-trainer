// 提升模式计分：打错标红后继续，可退格改正。
// 每个位置的状态：pending 待打 / correct 对 / wrong 错。

export function createSession(text, { now = () => Date.now() } = {}) {
  const chars = [...text];
  const status = chars.map(() => 'pending');
  let cursor = 0;
  let startedAt = null;
  let finishedAt = null;
  let keystrokes = 0;
  let mistakes = 0; // 每按错一次记一次，退格改对也不抹掉

  const done = () => cursor >= chars.length;

  return {
    chars,
    status,
    get cursor() { return cursor; },
    get done() { return done(); },

    input(char) {
      if (done()) return null;
      if (startedAt === null) startedAt = now();
      const ok = char === chars[cursor];
      status[cursor] = ok ? 'correct' : 'wrong';
      keystrokes++;
      if (!ok) mistakes++;
      cursor++;
      if (done()) finishedAt = now();
      return { index: cursor - 1, ok };
    },

    backspace() {
      if (cursor === 0 || done()) return null;
      cursor--;
      status[cursor] = 'pending';
      return { index: cursor };
    },

    stats() {
      const end = finishedAt ?? now();
      const minutes = startedAt === null ? 0 : (end - startedAt) / 60000;
      const correctChars = status.filter((s) => s === 'correct').length;
      return {
        // 标准 WPM：每 5 个正确字符算一个词
        wpm: minutes > 0 ? Math.round(correctChars / 5 / minutes) : 0,
        accuracy: keystrokes ? Math.round(((keystrokes - mistakes) / keystrokes) * 100) : 100,
        mistakes,
        progress: chars.length ? cursor / chars.length : 1,
        seconds: Math.round(minutes * 60),
      };
    },
  };
}
