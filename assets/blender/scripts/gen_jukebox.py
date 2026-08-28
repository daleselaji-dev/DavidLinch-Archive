# ============================================================
# gen_jukebox — 歌厅点唱机权威细模（Blender 4.1.1 headless）。
#
# 替换 props.js jukebox（圆角盒 + 半圆柱拱 + 九根盒条格栅的
# v1.1 拼装弱资产）。局部坐标：Y-up，正面朝 +Z，地面 y=0；
# 总足迹 ~1.04(W) × 1.36(H) × 0.62(D)，与原件同货架足迹。
# 游戏接线保持原 userData 契约（win / setOn / tubeMats）：
# 氖光弧管 ×2、显示窗、按键排、踢脚、点光仍由 three.js 程序化
# 生成（发光动画通道），Blender 提供：
#   wood   瀑布拱机壳（直边 + 半圆拱冠）+ 凸出前脸板（扇窝压暗 +
#          显示窗暗腔）+ 双侧半圆立柱（凹槽顶点色）+ 底板
#   brass  日出扇格栅条 ×7 + 拱冠双弧饰带（氖管座圈）+
#          显示窗四边梃 + 按键床 + 踢脚铜线 + 立柱冠
#
# 对齐原件（bluevelvet.js 动画通道坐标）：
#   氖弧 r0.42/0.34 圆心 (0, 0.9) / 窗 (0, 0.98) 0.56×0.2 /
#   键排 y0.76 / 踢脚 0.98×0.09
#
# HI：轮廓加密；GAME：同参数低段数
# 运行：blender -b -P gen_jukebox.py
# 产物：blends/jukebox.blend / renders/jukebox-*.png / exports/jukebox.json
# ============================================================
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import svlib  # noqa: E402

TAU = math.tau

GRILLE = (0.0, 0.43, 0.31)    # 扇窝 (x, y, r)
WIN = (0.0, 0.98, 0.60, 0.24)  # 显示窗 (x, y, w, h)
ARCH_C = (0.0, 0.90)           # 拱冠圆心（氖弧同心）


def wood_col(rnd, x, y, wear=0.0, tone=1.0):
    """竖木纹顶点色（游戏内与暖木程序纹理相乘）。"""
    grain = math.sin(x * 38 + y * 3.1) * 0.05 + math.sin(x * 118 + y * 9) * 0.025
    v = (0.95 + grain + (rnd.random() - 0.5) * 0.07 + wear * 0.3) * tone
    return (v, v * 0.96, v * 0.9)


def brass_col(rnd, tarnish=0.0):
    v = (1.0 + (rnd.random() - 0.5) * 0.18) * (1 - tarnish * 0.3)
    return (v, v * 0.99, v * 0.95)


# ---------- 瀑布拱轮廓（前视 XY 平面，逆时针） ----------
def outline(arch_segs, scale=1.0, y_lift=0.0):
    pts = [(0.46, 0.07), (0.46, 0.90)]
    for i in range(1, arch_segs):
        u = i / arch_segs * math.pi
        pts.append((0.46 * math.cos(u), 0.90 + 0.46 * math.sin(u)))
    pts.append((-0.46, 0.90))
    pts.append((-0.46, 0.07))
    if scale != 1.0:
        cx, cy = 0.0, 0.72
        pts = [((x - cx) * scale + cx, (y - cy) * scale + cy) for (x, y) in pts]
    return [(x, y + y_lift) for (x, y) in pts]


def extrude_outline(pts, z0, z1, col_fn, cap_front=True, cap_back=True):
    """轮廓沿 Z 挤出 + 前后扇形封盖（轮廓为凸形）。"""
    verts = []
    faces = []
    cols = []
    n = len(pts)
    for z in (z0, z1):
        for (x, y) in pts:
            verts.append((x, y, z))
            cols.append(col_fn(x, y, z))
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, j + n, i + n))
    cx = sum(p[0] for p in pts) / n
    cy = sum(p[1] for p in pts) / n
    if cap_back:
        c0 = len(verts)
        verts.append((cx, cy, z0))
        cols.append(col_fn(cx, cy, z0))
        for i in range(n):
            faces.append((c0, (i + 1) % n, i))
    if cap_front:
        c1 = len(verts)
        verts.append((cx, cy, z1))
        cols.append(col_fn(cx, cy, z1))
        for i in range(n):
            faces.append((c1, n + i, n + (i + 1) % n))
    return verts, faces, cols


def tube_along(points, r, seg, col_fn):
    """沿折线放样圆管（立柱/饰带用）。points: [(x,y,z)]。"""
    verts = []
    faces = []
    cols = []
    n = len(points)
    for i, (px, py, pz) in enumerate(points):
        # 切向：相邻点差分
        a = points[max(0, i - 1)]
        b = points[min(n - 1, i + 1)]
        tx, ty, tz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
        tl = math.sqrt(tx * tx + ty * ty + tz * tz) or 1.0
        tx, ty, tz = tx / tl, ty / tl, tz / tl
        # 法平面基（取 Z 轴与切向叉积起手）
        ux, uy, uz = ty * 1 - tz * 0, tz * 0 - tx * 1, tx * 0 - ty * 0
        ul = math.sqrt(ux * ux + uy * uy + uz * uz)
        if ul < 1e-6:
            ux, uy, uz = 1, 0, 0
            ul = 1
        ux, uy, uz = ux / ul, uy / ul, uz / ul
        vx = ty * uz - tz * uy
        vy = tz * ux - tx * uz
        vz = tx * uy - ty * ux
        for s in range(seg):
            th = s / seg * TAU
            ca, sa = math.cos(th), math.sin(th)
            verts.append((px + (ux * ca + vx * sa) * r,
                          py + (uy * ca + vy * sa) * r,
                          pz + (uz * ca + vz * sa) * r))
            cols.append(col_fn(px, py, pz))
    for i in range(n - 1):
        for s in range(seg):
            p = i * seg + s
            q = i * seg + (s + 1) % seg
            faces.append((p, q, q + seg, p + seg))
    return verts, faces, cols


# ---------- wood ----------
def build_wood(hi):
    rnd = random.Random(311)
    segs = 26 if hi else 15
    items = []

    def shell_col(x, y, z):
        wear = 0.14 if y > 1.24 else (0.06 if abs(x) > 0.42 else 0.0)
        return wood_col(rnd, x, y, wear=wear)

    def bezel_col(x, y, z):
        # 扇窝压暗（格栅后暗腔）+ 显示窗暗腔
        d = math.hypot((x - GRILLE[0]) * 1.0, (y - GRILLE[1]) * 1.25)
        sunk = max(0.0, 1 - d / GRILLE[2]) * 0.62
        wx = abs(x - WIN[0]) / (WIN[2] / 2)
        wy = abs(y - WIN[1]) / (WIN[3] / 2)
        if max(wx, wy) < 1.0:
            sunk = max(sunk, 0.72 * (1 - max(wx, wy) ** 3))
        return wood_col(rnd, x, y, tone=1.0 - sunk)

    # 主壳（背板厚）+ 凸出前脸板
    items.append(extrude_outline(outline(segs), -0.31, 0.285, shell_col))
    items.append(extrude_outline(outline(segs, scale=0.94), 0.285, 0.315, bezel_col))
    # 底板出沿
    items.append(extrude_outline(
        [(0.50, 0.05), (0.50, 0.10), (-0.50, 0.10), (-0.50, 0.05)],
        -0.325, 0.30, lambda x, y, z: wood_col(rnd, x, y, tone=0.75)))
    # 双侧瀑布立柱（半圆管沿直边上行、绕拱冠收进壳里）
    def pil_col(x, y, z):
        flute = math.sin(y * 60) * 0.10
        return wood_col(rnd, x, y, tone=0.88 + flute)
    for side in (-1, 1):
        # 直边贴壳上行（半嵌进壳缘），拱肩处向内收一小卷收头
        path = [(side * 0.472, 0.08, 0.155)]
        for i in range(6):
            u = i / 5
            path.append((side * 0.472, 0.10 + u * 0.80, 0.155))
        for i in range(1, 4):
            u = i / 3
            path.append((side * (0.472 - 0.055 * u * u), 0.90 + 0.11 * math.sin(u * math.pi * 0.5), 0.155))
        items.append(tube_along(path, 0.042, 10 if hi else 6, pil_col))
    # 背板通风槽 ×3
    for i in range(3):
        items.append(extrude_outline(
            [(0.14, 0.30 + i * 0.14), (0.14, 0.36 + i * 0.14), (-0.14, 0.36 + i * 0.14), (-0.14, 0.30 + i * 0.14)],
            -0.317, -0.31, lambda x, y, z: wood_col(rnd, x, y, tone=0.5)))
    return svlib.merge_pydata(items)


# ---------- brass ----------
def build_brass(hi):
    rnd = random.Random(419)
    items = []
    zf = 0.318
    # 日出扇格栅条 ×7（从扇窝底心放射）
    ox, oy = 0.0, 0.12
    for i in range(7):
        a = (i - 3) * 0.22                # 与竖直的夹角
        n_seg = 6 if hi else 3
        verts = []
        faces = []
        cols = []
        r0, r1 = 0.14, 0.375
        for j in range(n_seg + 1):
            u = j / n_seg
            rr = r0 + (r1 - r0) * u
            cxp = ox + math.sin(a) * rr
            cyp = oy + math.cos(a) * rr * 1.05
            w = 0.012 + u * 0.008          # 向外略展宽
            px, py = math.cos(a) * w, -math.sin(a) * w
            for (sx, sz) in ((-1, 0.0), (1, 0.0), (1, 0.012), (-1, 0.012)):
                verts.append((cxp + px * sx, cyp + py * sx, zf + sz))
                cols.append(brass_col(rnd, tarnish=0.25 * u))
        for j in range(n_seg):
            for s in range(4):
                p = j * 4 + s
                q = j * 4 + (s + 1) % 4
                faces.append((p, q, q + 4, p + 4))
        items.append((verts, faces, cols))
    # 拱冠双弧饰带（氖管座圈 r0.44 / r0.305，圆心 (0,0.9)）
    for (rr, tar) in ((0.44, 0.1), (0.305, 0.2)):
        n_arc = 22 if hi else 12
        verts = []
        faces = []
        cols = []
        for j in range(n_arc + 1):
            u = j / n_arc * math.pi
            cxp = ARCH_C[0] + math.cos(u) * rr
            cyp = ARCH_C[1] + math.sin(u) * rr
            # 弧带截面：宽 0.018 × 凸 0.010
            nx, ny = math.cos(u), math.sin(u)
            for (o, dz) in ((-0.009, 0.0), (0.009, 0.0), (0.009, 0.010), (-0.009, 0.010)):
                verts.append((cxp + nx * o, cyp + ny * o, zf + dz))
                cols.append(brass_col(rnd, tarnish=tar))
        for j in range(n_arc):
            for s in range(4):
                p = j * 4 + s
                q = j * 4 + (s + 1) % 4
                faces.append((p, q, q + 4, p + 4))
        items.append((verts, faces, cols))
    # 显示窗四边梃
    t = 0.014
    w, h = WIN[2] + 0.04, WIN[3] + 0.04
    for (cx, cy, sx, sy) in (
        (WIN[0], WIN[1] + h / 2, w, t), (WIN[0], WIN[1] - h / 2, w, t),
        (WIN[0] - w / 2, WIN[1], t, h - t), (WIN[0] + w / 2, WIN[1], t, h - t)
    ):
        verts = []
        cols = []
        for ddx in (-1, 1):
            for ddy in (-1, 1):
                for ddz in (0, 1):
                    verts.append((cx + ddx * sx / 2, cy + ddy * sy / 2, zf - 0.002 + ddz * 0.010))
                    cols.append(brass_col(rnd))
        faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
        items.append((verts, faces, cols))
    # 按键床（键排托台）+ 踢脚铜线 + 立柱冠
    bars = [
        (0.0, 0.735, 0.52, 0.030, 0.016),   # 键床
        (0.0, 0.115, 0.94, 0.018, 0.008)    # 踢脚线
    ]
    for (cx, cy, sw, sh, sd) in bars:
        verts = []
        cols = []
        for ddx in (-1, 1):
            for ddy in (-1, 1):
                for ddz in (0, 1):
                    verts.append((cx + ddx * sw / 2, cy + ddy * sh / 2, zf - 0.002 + ddz * sd))
                    cols.append(brass_col(rnd, tarnish=0.15))
        faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
        items.append((verts, faces, cols))
    for side in (-1, 1):
        verts = []
        cols = []
        for ddx in (-1, 1):
            for ddy in (-1, 1):
                for ddz in (-1, 1):
                    verts.append((side * 0.485 + ddx * 0.055, 0.92 + ddy * 0.02, 0.10 + ddz * 0.055))
                    cols.append(brass_col(rnd, tarnish=0.1))
        faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
        items.append((verts, faces, cols))
    return svlib.merge_pydata(items)


def build_all(detail):
    hi = detail == 'hi'
    return {'wood': build_wood(hi), 'brass': build_brass(hi)}


def main():
    svlib.reset_scene()
    woodm = svlib.vcol_material('wood', roughness=0.5, base=(0.2, 0.11, 0.06))
    brassm = svlib.vcol_material('brass', roughness=0.28, metallic=0.9, base=(0.55, 0.4, 0.16))
    mat_of = {'wood': woodm, 'brass': brassm}

    hi_parts = build_all('hi')
    for name, (v, f, c) in hi_parts.items():
        ob = svlib.mesh_object(f'hi_{name}', v, f, c)
        ob.data.materials.append(mat_of[name])
        svlib.smooth(ob, angle=0.8)
        ob.rotation_euler = (math.pi / 2, 0, 0)

    game_parts = build_all('game')
    game_obs = {}
    for name, (v, f, c) in game_parts.items():
        ob = svlib.mesh_object(f'game_{name}', v, f, c)
        ob.data.materials.append(mat_of[name])
        svlib.smooth(ob, angle=0.8)
        ob.rotation_euler = (math.pi / 2, 0, 0)
        ob.location = (1.5, 0, 0)
        game_obs[name] = ob

    # 歌厅灯位：粉氖主光（对应游戏内氖弧色）+ 暖吊灯补
    svlib.add_light('POINT', (-0.6, -1.3, 1.35), 55, color=(1.0, 0.36, 0.62))
    svlib.add_light('AREA', (1.8, -1.6, 1.6), 70, color=(1.0, 0.78, 0.5), size=2.5, target=(0.7, 0, 0.7))

    svlib.render_views('jukebox', [
        ((0.75, -2.35, 1.0), (0.75, 0, 0.66), 38),      # 双机同框
        ((-0.95, -1.6, 1.05), (0.0, 0.0, 0.68), 42),    # HI 3/4（拱冠/立柱/扇窝）
        ((0.0, -1.1, 0.5), (0.0, 0.0, 0.48), 45)        # HI 正面近景（格栅/窗梃/键床）
    ], samples=40)

    svlib.export_parts('jukebox', game_obs,
                       note='局部 Y-up 正面 +Z 地面 y=0；氖弧/显示窗/按键/踢脚/点光由游戏侧程序化补'
                            '（氖弧 r0.42/0.34 圆心 y0.9 / 窗 y0.98 / 键排 y0.76）')
    svlib.save_blend('jukebox')
    for name, ob in game_obs.items():
        print(f'[gen_jukebox] game {name}: {len(ob.data.vertices)} verts / {len(ob.data.polygons)} polys')


main()
