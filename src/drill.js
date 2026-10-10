// 熟悉模式出题：随机给一个字符，按对了换下一题，按错停在原题。

export function createDrill({ pool, random = Math.random }) {
  if (pool.length < 2) throw new Error('题库至少要 2 个字符');
  const stats = { correct: 0, wrong: 0, streak: 0 };
  let current = null;

  function pick() {
    let c;
    do c = pool[Math.floor(random() * pool.length)];
    while (c === current);
    current = c;
    return c;
  }

  pick();

  return {
    get current() { return current; },
    stats,
    /** 用户打了一个字符。返回 { correct, next }，next 是下一题（按错时仍是原题）。 */
    submit(char) {
      if (char === current) {
        stats.correct++;
        stats.streak++;
        return { correct: true, next: pick() };
      }
      stats.wrong++;
      stats.streak = 0;
      return { correct: false, next: current };
    },
  };
}
