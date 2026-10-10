# 盲打练习 · 模块与 spike 清单

先把每个模块单独做成 spike 验证，全部通过后再拼成 `index.html`。

- 纯逻辑模块：用 `node --test tests/` 跑单元测试
- 界面模块：每个都有一个 `spikes/NN-*/index.html` 测试台，在浏览器里看效果
- 本地预览：`python3 -m http.server 8765`，然后打开 `http://localhost:8765/spikes/`

## CSS token 规则

| 层 | 文件 | 允许写字面量？ |
|---|---|---|
| 基础 token（dashboard-swiss 包，原样复制） | `vendor/ds/dashboard-swiss/tokens.css` | 是（构建产物，不手改） |
| 应用 token（手指色、键盘尺寸） | `src/styles/app-tokens.css` | **只有这里**可以写 |
| 组件样式 | `src/styles/*.css` 其余文件 | 否，只能用 `var(--…)` |

`node scripts/lint-css.mjs` 会检查这条规则。

## 模块

| # | 模块 | 文件 | 类型 | 验收标准 | 状态 |
|---|---|---|---|---|---|
| S0 | Token 分层 | `src/styles/app-tokens.css` | 样式 | 手指色板在亮色下可读；lint 检查组件 CSS 里零字面量 | ✅ lint 先用故意写错的样式确认它能报错，再检查正式代码 |
| S1 | 键位数据 | `src/keymap.js` | 纯逻辑 | 95 个可打字符都能查到「哪个键 + 要不要 Shift + 哪根手指」；Shift 由另一只手的小指按 | ✅ 7 项单测 |
| S2 | 虚拟键盘 | `src/keyboard.js` | 界面 | SVG 渲染 MacBook 键盘；支持 ① 高亮目标键 ② 按手指上色 ③ 按下时的对/错反馈 | ✅ 截图核对 |
| S3 | 搭在键盘上的手 | `src/hand-geometry.js` `src/hand.js` | 纯逻辑 + 界面 | 指尖落在 ASDF / JKL;，大拇指在空格；能给指定手指淡色填充（只填手指，不伸进手掌）；支持多种手形和画法 | ✅ 5 项单测 + 截图核对。第三版：做了 10 双手的对比页 `spikes/05-hands/`，用户选定 **7 线稿** 和 **10 毛玻璃**，手形都是「弯指打字」（`SHAPES.curled`） |
| S4 | 键盘输入 | `src/input.js` | 界面 | 把 keydown 转成「字符 / 退格」；能识别中文输入法并提示；记录按的是左 Shift 还是右 Shift；拦住空格滚屏 | ✅ 真实按键事件核对；大写锁定需真机验证 |
| S5 | 熟悉模式出题 | `src/drill.js` | 纯逻辑 | 从 95 个字符里随机出题，不连续重复；按错停在原题；统计对错 | ✅ 2 项单测 |
| S6 | 提升模式计分 | `src/session.js` | 纯逻辑 | 打错标红后继续；可以退格；算出 WPM 和准确率 | ✅ 4 项单测 |
| S7 | 自定义文字清洗 | `src/text.js` | 纯逻辑 | 弯引号、破折号、换行都转成键盘能打的字符；中文等打不出的字符剔除并告诉用户 | ✅ 2 项单测 |
| S8 | 文字显示框 | `src/textview.js` | 界面 | 逐字显示 待打 / 当前 / 对 / 错 四种状态，长文自动滚动 | ✅ 截图核对；修了滚动时半行被裁的 bug |
| S3c | 手指伸向目标键 | `src/hand.js` 的 `setReach`、`reach` / `ghost` 选项；`hand-geometry.js` 每根手指的 `build(tip)` | 界面 | 高亮键不在基准键时，负责的手指伸过去，形状 / 指甲 / 褶皱跟着重算；`spikes/06-reach/` 对比了 5 种 | ✅ 用户选定 **2 + 3**：循环「伸出 → 停 → 收回」，手指离开基准键期间原位留虚线虚影。逐帧取坐标确认：在家无虚影、伸出有虚影、收回途中仍有、到家消失 |
| S9 | 使用说明 | `index.html` 里两张 `data-panel` 说明卡 | 界面 | 键盘下方，随模式切换 | ✅ 截图核对 |
| — | 拼装 | `index.html` `src/app.js` `src/styles/app.css` | 界面 | 两种模式切换，各自满足需求 | ✅ 真实按键事件跑通：熟悉模式出题与判对错；提升模式标红、退格、自定义文字（中文被剔除并提示）、打完按空格重来；来回切换模式时手和颜色正确 |

## 已定的决定

| 决定 | 选择 | 改起来要动哪里 |
|---|---|---|
| 视觉风格 | dashboard-swiss 包 | 换 `vendor/ds/` 下的包，组件 CSS 不用改 |
| 提升模式打错 | 标红后继续，可退格；按错次数退格后也照样算进准确率 | `src/session.js` |
| 熟悉模式出题范围 | 只练单键：不按 Shift 就能打出的 48 个字符（小写字母、数字、符号键下排、空格），不练组合键 | `src/keymap.js` 的 `SINGLE_KEY` |
| 键盘布局 | MacBook 美式，指法和 `make.py` 指法图一致 | `src/keymap.js` |
| 手的样式 | 线稿 / 毛玻璃 两种，熟悉键位模式里切换，默认线稿，记住上次的选择 | `src/app.js` 的 `HAND_STYLES`；配色在 `app-tokens.css` 的 `.hand--line` `.hand--glass` |
| 手指伸向目标键 | 循环伸出—收回 + 离开基准键时原位虚影；节奏 `--hand-reach-cycle`，伸缩速度 `--hand-reach-duration` | `src/app.js` 的 `createHand(…, { reach: 'loop', ghost: true })` |
| Shift 指法 | 用另一只手的小指按；用了同一只手的 Shift 会提醒，但不算错 | `src/keymap.js` `src/app.js` |

## 拼装时发现的问题

- dashboard-swiss 的 `.ds-row` 等 class 自带 `display`，会让 `hidden` 属性失效 → `app.css` 加了 `[hidden]{display:none!important}`
- 字体从 Google Fonts 加载，页面 JS 要等字体样式表下载完才执行（大约 1～2 秒），这期间按键不响应
