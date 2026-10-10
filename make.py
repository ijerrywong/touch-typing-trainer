"""生成 MacBook 盲打指法图（A4 横向）。输出 chart.html，再用 Chrome 打印成 PDF。"""
import math

U = 60  # 一个键位宽度
OX, OY = 40, 20  # 键盘左上角

# 手指：名字、描边色、键帽底色、手指宽度
F = {
    "LP": ("左手小指", "#D9433A", "#FBD3CF", 30),
    "LR": ("左手无名指", "#E07B12", "#FCE0C2", 33),
    "LM": ("左手中指", "#B8900A", "#FFF0B0", 35),
    "LI": ("左手食指", "#2E9D52", "#CDEFD8", 35),
    "RI": ("右手食指", "#2F7FD8", "#D2E4FA", 35),
    "RM": ("右手中指", "#8A44B0", "#E8D6F2", 35),
    "RR": ("右手无名指", "#CC2F7E", "#F9D2E6", 33),
    "RP": ("右手小指", "#7A5544", "#EADDD5", 30),
    "TH": ("大拇指", "#6B7780", "#E3E7EA", 42),
}
HOME = {"LP": "A", "LR": "S", "LM": "D", "LI": "F", "RI": "J", "RM": "K", "RR": "L", "RP": ";"}

# 键盘：每行 (显示上排, 显示下排/主标签, 宽度, 手指, 键名id)
def k(main, w=1, f=None, top="", kid=None, small=False):
    return dict(main=main, w=w, f=f, top=top, id=kid or main, small=small)

rows = [
    [k("`", f="LP", top="~"), k("1", f="LP", top="!"), k("2", f="LR", top="@"), k("3", f="LM", top="#"),
     k("4", f="LI", top="$"), k("5", f="LI", top="%"), k("6", f="RI", top="^"), k("7", f="RI", top="&"),
     k("8", f="RM", top="*"), k("9", f="RR", top="("), k("0", f="RP", top=")"), k("-", f="RP", top="_"),
     k("=", f="RP", top="+"), k("delete", 1.5, "RP", small=True)],
    [k("tab", 1.5, "LP", small=True), k("Q", f="LP"), k("W", f="LR"), k("E", f="LM"), k("R", f="LI"),
     k("T", f="LI"), k("Y", f="RI"), k("U", f="RI"), k("I", f="RM"), k("O", f="RR"), k("P", f="RP"),
     k("[", f="RP", top="{"), k("]", f="RP", top="}"), k("\\", f="RP", top="|")],
    [k("caps lock", 1.75, "LP", small=True), k("A", f="LP"), k("S", f="LR"), k("D", f="LM"), k("F", f="LI"),
     k("G", f="LI"), k("H", f="RI"), k("J", f="RI"), k("K", f="RM"), k("L", f="RR"),
     k(";", f="RP", top=":"), k("'", f="RP", top='"'), k("return", 1.75, "RP", small=True)],
    [k("shift", 2.25, "LP", small=True, kid="lshift"), k("Z", f="LP"), k("X", f="LR"), k("C", f="LM"),
     k("V", f="LI"), k("B", f="LI"), k("N", f="RI"), k("M", f="RI"), k(",", f="RM", top="<"),
     k(".", f="RR", top=">"), k("/", f="RP", top="?"), k("shift", 2.25, "RP", small=True, kid="rshift")],
    [k("fn", small=True), k("control", small=True), k("option", small=True), k("command", 1.25, small=True, kid="lcmd"),
     k("", 5, "TH", kid="space"), k("command", 1.25, small=True, kid="rcmd"), k("option", small=True, kid="ropt"),
     k("arrows", 3)],
]
FROW_H = 0.55 * U
ROW0 = OY + FROW_H + 6

keys = {}  # id -> (cx, cy, finger)
svg_keys = []
svg_labels = []


def rect(x, y, w, h, fill, stroke="#9AA3AB", r=7):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>'


def text(x, y, s, size, weight=600, fill="#2B2F33", anchor="middle"):
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
    return f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}" stroke="#FFFFFF" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke">{s}</text>'


# 键盘外壳
KW = 14.5 * U
svg_keys.append(f'<rect x="{OX-12}" y="{OY-12}" width="{KW+24}" height="{ROW0-OY+5*U+24}" rx="18" fill="#F4F5F6" stroke="#C9CED3" stroke-width="1.5"/>')

# 功能键行（esc + F1–F12 + Touch ID），只作参照
fx = OX
for i, (lab, w) in enumerate([("esc", 1.5)] + [(f"F{n}", 1.0) for n in range(1, 13)] + [("", 1.0)]):
    svg_keys.append(rect(fx + 2, OY + 2, w * U - 4, FROW_H - 4, "#FFFFFF", r=5))
    if lab:
        svg_keys.append(text(fx + w * U / 2, OY + FROW_H / 2 + 4, lab, 10, 500, "#8A939B"))
    else:
        svg_keys.append(f'<circle cx="{fx + w*U/2:.1f}" cy="{OY + FROW_H/2:.1f}" r="9" fill="none" stroke="#B5BCC3" stroke-width="1.2"/>')
    fx += w * U

for r, row in enumerate(rows):
    x = OX
    y = ROW0 + r * U
    for key in row:
        w = key["w"] * U
        cx, cy = x + w / 2, y + U / 2
        if key["main"] == "arrows":
            # 方向键：← ↑↓ →
            for j, sym in enumerate(["◀", None, "▶"]):
                ax = x + j * U
                if sym:
                    svg_keys.append(rect(ax + 2, y + U / 2 + 1, U - 4, U / 2 - 3, "#FFFFFF", r=4))
                    svg_keys.append(text(ax + U / 2, y + U * 0.82, sym, 10, 500, "#8A939B"))
                else:
                    svg_keys.append(rect(ax + 2, y + 2, U - 4, U / 2 - 3, "#FFFFFF", r=4))
                    svg_keys.append(rect(ax + 2, y + U / 2 + 1, U - 4, U / 2 - 3, "#FFFFFF", r=4))
                    svg_keys.append(text(ax + U / 2, y + U * 0.33, "▲", 9, 500, "#8A939B"))
                    svg_keys.append(text(ax + U / 2, y + U * 0.82, "▼", 9, 500, "#8A939B"))
            x += w
            continue
        f = key["f"]
        fill = F[f][2] if f else "#FFFFFF"
        stroke = F[f][1] if f else "#9AA3AB"
        is_home = f and HOME.get(f) == key["id"]
        svg_keys.append(rect(x + 2, y + 2, w - 4, U - 4, fill, stroke if f else "#9AA3AB"))
        if is_home:  # 基准键加粗框
            svg_keys.append(f'<rect x="{x+2:.1f}" y="{y+2:.1f}" width="{w-4:.1f}" height="{U-4:.1f}" rx="7" fill="none" stroke="{stroke}" stroke-width="3"/>')
        if key["small"]:
            svg_labels.append(text(cx, cy + 4, key["main"], 11, 600, "#4A5259"))
        elif key["top"]:
            svg_labels.append(text(cx, cy - 6, key["top"], 13, 600, "#6A737B"))
            svg_labels.append(text(cx, cy + 15, key["main"], 19, 800))
        elif key["main"]:
            svg_labels.append(text(cx, cy + 9, key["main"], 26, 800))
        if key["id"] in ("F", "J"):  # 定位小凸起
            svg_keys.append(f'<line x1="{cx-7:.1f}" y1="{cy+19:.1f}" x2="{cx+7:.1f}" y2="{cy+19:.1f}" stroke="#2B2F33" stroke-width="3" stroke-linecap="round"/>')
        keys[key["id"]] = (cx, cy, f)
        x += w

# ---------- 手 ----------
def kc(i):
    return keys[i][0], keys[i][1]

yZ = keys["Z"][1]
Yr = yZ + 0.95 * U  # 指根所在高度
roots = {}
for f, home, dx, dy in [("LP", "A", 0.40, 0.42), ("LR", "S", 0.18, 0.12), ("LM", "D", 0.0, 0.0), ("LI", "F", -0.12, 0.08)]:
    hx = keys[home][0]
    roots[f] = (hx + dx * U, Yr + dy * U)
    mirror = {"LP": ("RP", ";"), "LR": ("RR", "L"), "LM": ("RM", "K"), "LI": ("RI", "J")}[f]
    roots[mirror[0]] = (keys[mirror[1]][0] - dx * U, Yr + dy * U)

space_x, space_y = keys["space"][0], keys["space"][1]
thumb_root = {"L": (roots["LI"][0] + 0.30 * U, Yr + 1.05 * U), "R": (roots["RI"][0] - 0.30 * U, Yr + 1.05 * U)}
thumb_tip = {"L": (roots["LI"][0] + 0.95 * U, space_y), "R": (roots["RI"][0] - 0.95 * U, space_y)}


def finger_path(root, tip, w, closed):
    """从指根长到指尖的手指：两条边 + 圆头。closed=False 时底部不封口，看起来像从手掌长出来。"""
    (x0, y0), (x1, y1) = root, tip
    L = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    nx, ny = -uy, ux
    h = w / 2
    # 指根略宽，指尖略窄
    hb, ht = h * 1.08, h * 0.92
    a = (x0 + nx * hb, y0 + ny * hb)
    b = (x1 + nx * ht, y1 + ny * ht)
    c = (x1 - nx * ht, y1 - ny * ht)
    d = (x0 - nx * hb, y0 - ny * hb)
    p = f"M{a[0]:.1f},{a[1]:.1f} L{b[0]:.1f},{b[1]:.1f} A{ht:.1f},{ht:.1f} 0 0 1 {c[0]:.1f},{c[1]:.1f} L{d[0]:.1f},{d[1]:.1f}"
    return p + (" Z" if closed else "")


def nail(root, tip, w):
    (x0, y0), (x1, y1) = root, tip
    L = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    cx, cy = x1 - ux * w * 0.15, y1 - uy * w * 0.15
    ang = math.degrees(math.atan2(uy, ux)) + 90
    return (f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{w*0.27:.1f}" ry="{w*0.33:.1f}" '
            f'transform="rotate({ang:.1f} {cx:.1f} {cy:.1f})" fill="#FFFFFF" fill-opacity="0.55" stroke="#C7958A" stroke-width="1"/>')


def smooth_closed(pts):
    """Catmull-Rom 闭合曲线 → 贝塞尔路径"""
    n = len(pts)
    d = f"M{pts[0][0]:.1f},{pts[0][1]:.1f} "
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f} "
    return d + "Z"


def palm(side):
    s = -1 if side == "L" else 1  # 向外的方向
    P, R, M, I = (roots["LP"], roots["LR"], roots["LM"], roots["LI"]) if side == "L" else (roots["RP"], roots["RR"], roots["RM"], roots["RI"])
    T = thumb_root[side]
    pts = [
        (I[0] - s * 0.05 * U, I[1] - 0.22 * U),
        (M[0], M[1] - 0.28 * U),
        (R[0], R[1] - 0.26 * U),
        (P[0] + s * 0.05 * U, P[1] - 0.22 * U),
        (P[0] + s * 0.32 * U, P[1] + 0.25 * U),
        (P[0] + s * 0.30 * U, Yr + 1.6 * U),
        (P[0] + s * 0.05 * U, Yr + 2.55 * U),
        (I[0] + s * 0.35 * U, Yr + 2.75 * U),
        (I[0] - s * 0.40 * U, Yr + 2.0 * U),
        (T[0] - s * 0.45 * U, T[1] + 0.55 * U),
        (T[0] - s * 0.62 * U, T[1] + 0.05 * U),
        (I[0] - s * 0.35 * U, I[1] + 0.30 * U),
    ]
    return smooth_closed(pts)


fingers_of_key = {}
for kid, (cx, cy, f) in keys.items():
    if f and f != "TH":
        fingers_of_key.setdefault(f, []).append(kid)
# 修饰键 control/fn 不画手指，只画常用的
SKIN = "#F2B9A0"

skin_fill, outlines_dash, outlines_solid, nails = [], [], [], []
for side in "LR":
    skin_fill.append(f'<path d="{palm(side)}" fill="{SKIN}"/>')
for f, kids in fingers_of_key.items():
    name, col, _, w = F[f]
    root = roots[f]
    for kid in kids:
        tip = kc(kid)
        if kid == HOME[f]:
            skin_fill.append(f'<path d="{finger_path(root, tip, w, True)}" fill="{SKIN}"/>')
            outlines_solid.append(f'<path d="{finger_path(root, tip, w, False)}" fill="none" stroke="{col}" stroke-width="3.2" stroke-linejoin="round"/>')
            nails.append(nail(root, tip, w))
        else:
            outlines_dash.append(f'<path d="{finger_path(root, tip, w*0.86, False)}" fill="none" stroke="{col}" stroke-width="1.6" stroke-dasharray="5 4" stroke-linejoin="round" opacity="0.8"/>')
for side in "LR":
    w = F["TH"][3]
    skin_fill.append(f'<path d="{finger_path(thumb_root[side], thumb_tip[side], w, True)}" fill="{SKIN}"/>')
    nails.append(nail(thumb_root[side], thumb_tip[side], w))

# 指根小圆点：所有轮廓都从这里出发
dots = [f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{F[f][1]}"/>' for f, (x, y) in roots.items()]

hand_svg = (
    # 手的剪影：先画粗描边再盖上填充，只剩外轮廓（手掌和拇指连成一体）
    f'<g opacity="0.45">{"".join(p.replace(f'fill="{SKIN}"', 'fill="none" stroke="#7A3E2E" stroke-width="5" stroke-linejoin="round"') for p in skin_fill)}{"".join(skin_fill)}</g>'
    + "".join(outlines_dash) + "".join(outlines_solid) + "".join(nails) + "".join(dots)
    + "".join(svg_labels)
)

# 手的说明文字（写在手掌上）
labels = []
for side, txt in (("L", "左手"), ("R", "右手")):
    I = roots["LI" if side == "L" else "RI"]
    P = roots["LP" if side == "L" else "RP"]
    labels.append(text((I[0] + P[0]) / 2, Yr + 1.75 * U, txt, 26, 800, "#8A4E40"))

H = Yr + 2.85 * U + 10
W = OX * 2 + KW
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" class="chart">'
       + "".join(svg_keys) + hand_svg + "".join(labels) + "</svg>")

legend = "".join(
    f'<div class="lg"><span class="sw" style="background:{F[f][2]};border-color:{F[f][1]}"></span>{F[f][0]}'
    f'{"：" + HOME[f] if f in HOME else "：空格"}</div>'
    for f in ["LP", "LR", "LM", "LI", "TH", "RI", "RM", "RR", "RP"]
)

html = f"""<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>盲打指法图</title>
<style>
@page {{ size: A4 landscape; margin: 0; }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; background: #fff; font-family: "PingFang SC", "Hiragino Sans GB", sans-serif; color: #2B2F33; }}
.page {{ width: 297mm; height: 210mm; padding: 8mm 10mm 6mm; display: flex; flex-direction: column; }}
h1 {{ margin: 0; font-size: 22pt; letter-spacing: 1px; }}
h1 small {{ font-size: 11pt; font-weight: 500; color: #6A737B; margin-left: 10px; letter-spacing: 0; }}
.chart {{ flex: 1; min-height: 0; width: 100%; margin: 2mm 0; }}
.chart text {{ font-family: "Helvetica Neue", "PingFang SC", sans-serif; }}
.bottom {{ display: flex; gap: 6mm; align-items: flex-start; }}
.legend {{ display: grid; grid-template-columns: repeat(3, auto); gap: 1.4mm 4mm; font-size: 9.5pt; flex: none; }}
.lg {{ display: flex; align-items: center; gap: 2mm; white-space: nowrap; }}
.sw {{ width: 6mm; height: 4.5mm; border: 2px solid; border-radius: 1.2mm; display: inline-block; }}
.how {{ flex: 1; font-size: 10pt; line-height: 1.55; border-left: 3px solid #D9433A; padding-left: 4mm; }}
.how b {{ color: #B03227; }}
.ex {{ display: inline-block; width: 12mm; border-top: 3px solid #2E9D52; vertical-align: middle; margin-right: 1.5mm; }}
.ex.d {{ border-top: 2px dashed #2E9D52; }}
</style></head><body><div class="page">
<h1>盲打指法图 <small>MacBook 键盘 · 每根手指管一种颜色的键</small></h1>
{svg}
<div class="bottom">
  <div class="legend">{legend}</div>
  <div class="how">
    <div><span class="ex"></span><b>实线手指</b> = 手指的"家"。不打字时，八根手指轻轻放在 A S D F 和 J K L ; 上。</div>
    <div><span class="ex d"></span><b>虚线手指</b> = 同一根手指伸出去能按的键。按完马上回家！</div>
    <div>摸一摸 <b>F</b> 和 <b>J</b> 上的小凸起：两根食指找到它们，不看键盘也能回家。</div>
  </div>
</div>
</div></body></html>"""

open("chart.html", "w").write(html)
print("ok", W, H)
