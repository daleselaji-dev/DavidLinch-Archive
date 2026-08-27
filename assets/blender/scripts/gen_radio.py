# ============================================================
# gen_radio — 大教堂式木壳电子管收音机权威细模（Blender 4.1.1 headless）。
#
# 替换 props.js radioCabinet v2（圆角盒 + 半圆柱顶）。
# 局部坐标：Y-up，正面朝 +Z，底面 y=0；
# 总尺寸 ~0.65(W) × 0.575(H) × 0.30(D)，与原件同货架足迹。
# 游戏接线保持原 userData 契约：布网圆片/表盘玻璃/指针仍由
# three.js 程序化生成（发光动画通道），Blender 提供：
#   body   拱形轮廓双层壳（主壳 + 凸出前脸板）+ 底座条 +
#          竖木纹/边缘磨损顶点色 + 扬声器暗窝
#   brass  扇形格栅条 ×5 + 表盘框 + 双旋钮（带指痕）+ 台名铜条
#
# 布局对齐原件（studio.js 动画通道坐标）：
#   扬声器 (-0.13, 0.24) r0.13 / 表盘 (0.14, 0.26) 0.2×0.12 /
#   旋钮 (0.08, 0.1) (0.2, 0.1)
#
# HI：轮廓加密 + 木面噪声；GAME：同参数低段数
# 运行：blender -b -P gen_radio.py
# 产物：blends/radio.blend / renders/radio-*.png / exports/radio.json
# ============================================================
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import svlib  # noqa: E402

TAU = math.tau

SPK = (-0.13, 0.24, 0.13)   # 扬声器 (x, y, r)
DIAL = (0.14, 0.26)          # 表盘中心
KNOBS = ((0.08, 0.10), (0.20, 0.10))


def wood_col(rnd, x, y, wear=0.0, tone=1.0):
    """竖木纹顶点色（游戏内与 warmWood 程序纹理相乘）。"""
    grain = math.sin(x * 46 + y * 3.5) * 0.05 + math.sin(x * 130) * 0.025
    v = (0.95 + grain + (rnd.random() - 0.5) * 0.07 + wear * 0.3) * tone
    return (v, v * 0.96, v * 0.9)


def brass_col(rnd, tarnish=0.0):
    v = (1.0 + (rnd.random() - 0.5) * 0.18) * (1 - tarnish * 0.3)
    return (v, v * 0.99, v * 0.95)


# ---------- 大教堂轮廓（前视 XY 平面，逆时针） ----------
def outline(arch_segs, scale=1.0, y_lift=0.0):
    """底两角方、侧边直、顶为半椭圆拱。scale 绕形心缩放。"""
    pts = [(0.31, 0.02), (0.31, 0.30)]
    for i in range(1, arch_segs):
        u = i / arch_segs * math.pi
        pts.append((0.31 * math.cos(u), 0.30 + 0.24 * math.sin(u)))
    pts.append((-0.31, 0.30))
    pts.append((-0.31, 0.02))
    if scale != 1.0:
        cx, cy = 0.0, 0.26
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


# ---------- body ----------
def build_body(hi):
    rnd = random.Random(31)
    segs = 22 if hi else 14
    items = []

    def shell_col(x, y, z):
        # 边缘磨损：贴近轮廓拱缘略亮；壳身竖木纹
        wear = 0.12 if y > 0.44 else 0.0
        return wood_col(rnd, x, y, wear=wear)

    def bezel_col(x, y, z):
        # 前脸板：扬声器窝压暗（布网圆片后面的阴影底）
        d = math.hypot(x - SPK[0], y - SPK[1])
        sunk = max(0.0, 1 - d / SPK[2]) * 0.55
        return wood_col(rnd, x, y, tone=1.0 - sunk)

    # 主壳（含背板/前板）+ 凸出前脸板
    items.append(extrude_outline(outline(segs), -0.15, 0.115, shell_col))
    items.append(extrude_outline(outline(segs, scale=0.93), 0.115, 0.138, bezel_col))
    # 出沿底板
    items.append(extrude_outline([(0.335, 0.0), (0.335, 0.028), (-0.335, 0.028), (-0.335, 0.0)],
                                 -0.16, 0.125, lambda x, y, z: wood_col(rnd, x, y, tone=0.78)))
    # 背板通风条缝（背面三条浅槽读作格栅）
    for i in range(3):
        items.append(extrude_outline(
            [(0.09, 0.10 + i * 0.09), (0.09, 0.14 + i * 0.09), (-0.09, 0.14 + i * 0.09), (-0.09, 0.10 + i * 0.09)],
            -0.156, -0.15, lambda x, y, z: wood_col(rnd, x, y, tone=0.5)))
    return svlib.merge_pydata(items)


# ---------- brass ----------
def build_brass(hi):
    rnd = random.Random(47)
    items = []
    zf = 0.142
    # 扇形格栅条 ×5：绕扬声器心微扇开（大教堂放射感），长度嵌进圆窗
    for i in range(5):
        dx = -0.08 + i * 0.04
        half = math.sqrt(max(0.001, SPK[2] ** 2 - dx ** 2)) * 0.92
        fan = (i - 2) * 0.085
        n_y = 6 if hi else 3
        verts = []
        faces = []
        cols = []
        for j in range(n_y + 1):
            v = j / n_y
            y = SPK[1] - half + v * half * 2
            xx = SPK[0] + dx + math.sin(fan) * (y - SPK[1])
            for (ox, oz) in ((-0.006, 0), (0.006, 0), (0.006, 0.008), (-0.006, 0.008)):
                verts.append((xx + ox, y, zf + oz))
                cols.append(brass_col(rnd, tarnish=0.2 * v))
        for j in range(n_y):
            for s in range(4):
                p = j * 4 + s
                q = j * 4 + (s + 1) % 4
                faces.append((p, q, q + 4, p + 4))
        items.append((verts, faces, cols))
    # 表盘框（四边梃）
    t = 0.01
    w, h = 0.21, 0.13
    for (cx, cy, sx, sy) in (
        (DIAL[0], DIAL[1] + h / 2, w, t), (DIAL[0], DIAL[1] - h / 2, w, t),
        (DIAL[0] - w / 2, DIAL[1], t, h - t), (DIAL[0] + w / 2, DIAL[1], t, h - t)
    ):
        verts = []
        cols = []
        for ddx in (-1, 1):
            for ddy in (-1, 1):
                for ddz in (0, 1):
                    verts.append((cx + ddx * sx / 2, cy + ddy * sy / 2, zf - 0.002 + ddz * 0.008))
                    cols.append(brass_col(rnd))
        faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
        items.append((verts, faces, cols))
    # 双旋钮（车削 + 指位小尖）
    kv, kf = svlib.lathe(
        [(0.001, 0.0), (0.024, 0.003), (0.027, 0.010), (0.024, 0.018), (0.013, 0.028), (0.001, 0.031)],
        14 if hi else 9, cap_top=True, cap_bottom=True)
    for (kx, ky) in KNOBS:
        verts = [(kx + x, ky + z, zf - 0.004 + y) for (x, y, z) in kv]  # lathe 轴 y → 前向 z
        cols = [brass_col(rnd, tarnish=0.15) for _ in verts]
        items.append((verts, kf, cols))
        # 指位尖
        verts2 = []
        cols2 = []
        for (ox, oy, oz) in ((0, 0.02, 0.028), (-0.004, 0.006, 0.03), (0.004, 0.006, 0.03), (0, 0.01, 0.036)):
            verts2.append((kx + ox, ky + oy, zf - 0.004 + oz))
            cols2.append(brass_col(rnd))
        items.append((verts2, [(0, 1, 3), (1, 2, 3), (2, 0, 3), (0, 2, 1)], cols2))
    # 台名铜条（表盘下）
    verts = []
    cols = []
    for ddx in (-1, 1):
        for ddy in (-1, 1):
            for ddz in (0, 1):
                verts.append((DIAL[0] + ddx * 0.05, 0.165 + ddy * 0.009, zf - 0.002 + ddz * 0.006))
                cols.append(brass_col(rnd, tarnish=0.1))
    items.append((verts, [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)], cols))
    return svlib.merge_pydata(items)


def build_all(detail):
    hi = detail == 'hi'
    return {'body': build_body(hi), 'brass': build_brass(hi)}


def main():
    svlib.reset_scene()
    woodm = svlib.vcol_material('wood', roughness=0.55, base=(0.23, 0.14, 0.07))
    brassm = svlib.vcol_material('brass', roughness=0.3, metallic=0.9, base=(0.55, 0.4, 0.16))
    mat_of = {'body': woodm, 'brass': brassm}

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
        ob.location = (0.9, 0, 0)
        game_obs[name] = ob

    # 深夜房间灯位：暖台灯主光 + 冷窗补
    svlib.add_light('POINT', (-0.5, -0.9, 0.66), 32, color=(1.0, 0.72, 0.4))
    svlib.add_light('AREA', (1.6, -1.3, 0.9), 40, color=(0.6, 0.7, 1.0), size=2, target=(0.4, 0, 0.3))

    svlib.render_views('radio', [
        ((0.45, -1.35, 0.42), (0.45, 0, 0.28), 42),   # 双机同框
        ((-0.30, -0.62, 0.40), (0.0, 0.02, 0.26), 50),  # HI 3/4 近景（拱顶/格栅/旋钮）
        ((0.15, -0.34, 0.30), (0.14, 0.06, 0.26), 55)   # 表盘/旋钮特写
    ], samples=40)

    svlib.export_parts('radio', game_obs, note='局部 Y-up 正面 +Z 底面 y=0；布网/表盘玻璃/指针由游戏侧程序化补')
    svlib.save_blend('radio')
    for name, ob in game_obs.items():
        print(f'[gen_radio] game {name}: {len(ob.data.vertices)} verts / {len(ob.data.polygons)} polys')


main()
