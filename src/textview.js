// 文字显示框：逐字显示 待打 / 当前 / 对 / 错，当前行保持在可视区域。

export function createTextView(container) {
  const box = document.createElement('div');
  box.className = 'tv';
  const inner = document.createElement('div');
  inner.className = 'tv-inner';
  box.append(inner);
  container.append(box);

  let spans = [];

  function render(session) {
    inner.replaceChildren();
    spans = session.chars.map((c) => {
      const s = document.createElement('span');
      s.className = 'tv-char';
      if (c === ' ') s.classList.add('tv-char--space');
      s.textContent = c;
      inner.append(s);
      return s;
    });
    // 末尾放一个空位，打完时光标停在这里
    const end = document.createElement('span');
    end.className = 'tv-char tv-char--end';
    inner.append(end);
    spans.push(end);
    sync(session);
  }

  function sync(session) {
    session.status.forEach((st, i) => { spans[i].dataset.state = st; });
    spans.forEach((s, i) => s.classList.toggle('is-current', i === session.cursor && !session.done));
    // 让当前字所在行保持在第二行。按整行滚：行高取 line-height，不取字高
    const cur = spans[Math.min(session.cursor, spans.length - 1)];
    const lh = parseFloat(getComputedStyle(inner).lineHeight) || 1;
    const line = Math.floor(cur.offsetTop / lh);
    inner.style.transform = `translateY(${-Math.max(0, line - 1) * lh}px)`;
  }

  return { el: box, render, sync };
}
