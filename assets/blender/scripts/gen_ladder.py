# ============================================================
# gen_ladder — 档案长廊滚动图书梯权威细模（Blender 4.1.1 headless）。
#
# 与游戏内 archive.js 图书梯同坐标系（Y-up，梯身局部：
# 弦木 x=±0.26、高 4.55、踏杆 y=0.35+i*0.39、轮子 (±0.26,0.05,0.06)）。
# 部件：
#   wood   双弦木（成型剖面/倒角/木身微弯）+ 11 根车削踏杆
#          （中腹鼓 + 踩磨顶平 + 端肩收颈），顶点色做色温/磨损变化
#   brass  端销 ×22 / 顶端挂钩 ×2（钩板+颈杆）/ 轮叉 ×2 / 加固横带
#   wheel  单只胶轮（胎面凹槽 + 轮毂），游戏内 L/R 复用并各自转动
#
# HI：高段数 + 木面噪声起伏；GAME：同参数低段数
# 运行：blender -b -P gen_ladder.py
# ============================================================
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import svlib  # noqa: E402

TAU = math.tau
H = 4.55
RUNGS = 11
RUNG_Y0 = 0.35
RUNG_DY = 0.39
SX = 0.26


def wood_col(rnd, wear=0.0):
    # 围绕 1.0 的变化量（游戏内与 woodMat 程序木纹相乘）
    v = 0.96 + (rnd.random() - 0.5) * 0.22 + wear * 0.45
    return (v, v * 0.97, v * 0.92)


# ---------- 弦木：成型剖面挤出（外圆内平 + 双倒角），沿高微弯 ----------
def build_stringer(x0, segs, noise=0.0, seed=3):
    rnd = random.Random(seed)
    w = 0.042
    d = 0.095
    # 剖面（绕 y 轴挤出的闭合折线，x=横向 z=纵深）：外缘圆化
    prof = []
    n_p = 14
    for i in range(n_p):
        a = i / n_p * TAU
        px = math.cos(a)
        pz = math.sin(a)
        # 方角圆化：superellipse
        k = (abs(px) ** 3 + abs(pz) ** 3) ** (1 / 3) or 1
        prof.append((px / k * w / 2, pz / k * d / 2))
    verts = []
    faces = []
    cols = []
    for j in range(segs + 1):
        v = j / segs
        y = v * H
        bow = math.sin(v * math.pi) * 0.008  # 木身微弯（旧木）
        for (px, pz) in prof:
            nx = px * (1 + (rnd.random() - 0.5) * noise)
            nz = pz * (1 + (rnd.random() - 0.5) * noise)
            verts.append((x0 + nx + bow * 0.4, y, nz + bow))
            cols.append(wood_col(rnd))
    n = len(prof)
    for j in range(segs):
        for s in range(n):
            p = j * n + s
            q = j * n + (s + 1) % n
            faces.append((p, q, q + n, p + n))
    # 上下端封口
    for (ring0, yy, flip) in ((0, 0.0, True), (segs * n, H, False)):
        c = len(verts)
        verts.append((x0, yy, 0.0))
        cols.append(wood_col(rnd))
        for s in range(n):
            tri = (c, ring0 + (s + 1) % n, ring0 + s)
            faces.append(tri if flip else (c, ring0 + s, ring0 + (s + 1) % n))
    return verts, faces, cols


# ---------- 踏杆：车削（端肩收颈 + 中腹鼓 + 顶面踩磨平） ----------
def build_rung(y, radial, segs, noise=0.0, seed=7):
    rnd = random.Random(seed)
    L = 0.52
    verts = []
    faces = []
    cols = []
    for j in range(segs + 1):
        v = j / segs
        x = -L / 2 + v * L
        # 车削剖面：端颈 0.013 → 肩 0.0175 → 中腹 0.0205
        edge = min(v, 1 - v)
        if edge < 0.045:
            r = 0.013 + edge / 0.045 * 0.0045
        else:
            r = 0.0175 + math.sin(min(1.0, (edge - 0.045) / 0.455) * math.pi / 2) * 0.003
        wear = math.sin(v * math.pi) ** 2  # 中段被踩得最狠
        for s in range(radial):
            a = s / radial * TAU
            rr = r
            # 顶面踩磨平：法线朝上的一窄条压扁
            if math.sin(a) > 0.78:
                rr *= 1 - 0.16 * wear
            if noise:
                rr *= 1 + (rnd.random() - 0.5) * noise
            verts.append((x, y + math.sin(a) * rr, 0.0 + math.cos(a) * rr))
            cols.append(wood_col(rnd, wear=wear * 0.4 if math.sin(a) > 0.6 else 0.0))
    for j in range(segs):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    return verts, faces, cols


# ---------- 黄铜件 ----------
def brass_col(rnd):
    v = 1.0 + (rnd.random() - 0.5) * 0.18
    return (v, v * 0.99, v * 0.96)


def build_pin(x, y, radial=8, seed=11):
    """踏杆端黄铜销钉（帽 + 短杆）。"""
    rnd = random.Random(seed)
    items = []
    pv, pf = svlib.lathe([(0.001, 0.0), (0.012, 0.001), (0.013, 0.006), (0.009, 0.011), (0.001, 0.013)],
                         radial, cap_top=True, cap_bottom=True)
    verts = []
    cols = []
    for (px, py, pz) in pv:
        # lathe 绕 y；销钉轴向 x → 旋转 (y→x)
        verts.append((x + math.copysign(py, x), y + px, pz))
        cols.append(brass_col(rnd))
    return verts, pf, cols


def build_hook(x, radial=10, segs=16, noise=0.0, seed=13):
    """顶端挂钩：颈杆 + 3/4 圆钩（扣墙轨）+ 钩尾球。"""
    rnd = random.Random(seed)
    verts = []
    faces = []
    cols = []
    R = 0.055
    r0 = 0.014
    cy = H - 0.03
    cz = 0.02
    for j in range(segs + 1):
        t = j / segs
        a = -0.35 + t * math.pi * 1.25
        r = r0 * (1 - t * 0.25)
        ccy = cy + math.sin(a) * R
        ccz = cz - math.cos(a) * R
        for s in range(radial):
            b = s / radial * TAU
            # 圆管截面（沿钩弧的法向）
            nx = math.cos(b) * r
            ny = math.sin(b) * r * math.cos(a)
            nz = math.sin(b) * r * math.sin(a)
            k = 1 + ((rnd.random() - 0.5) * noise if noise else 0)
            verts.append((x + nx * k, ccy + ny * k, ccz + nz * k))
            cols.append(brass_col(rnd))
    for j in range(segs):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    # 钩尾球
    tipc = len(verts)
    a = -0.35 + math.pi * 1.25
    verts.append((x, cy + math.sin(a) * R, cz - math.cos(a) * R - 0.012))
    cols.append(brass_col(rnd))
    last0 = segs * radial
    for s in range(radial):
        faces.append((tipc, last0 + s, last0 + (s + 1) % radial))
    return verts, faces, cols


def build_fork(x, seed=17):
    """底端轮叉：双叉板 + 轴螺栓头。"""
    rnd = random.Random(seed)
    items = []
    for dz in (-0.028, 0.028):
        v, f = svlib.lathe([(0.001, 0.0), (0.024, 0.0), (0.026, 0.012), (0.02, 0.11), (0.001, 0.12)], 8,
                           cap_top=True, cap_bottom=True)
        verts = []
        cols = []
        for (px, py, pz) in v:
            # 压扁成板，贴在轮两侧
            verts.append((x + px * 0.9, 0.0 + py, 0.06 + dz + pz * 0.22))
            cols.append(brass_col(rnd))
        items.append((verts, f, cols))
    # 轴螺栓（穿轮心）
    v, f = svlib.lathe([(0.001, -0.045), (0.009, -0.045), (0.009, 0.045), (0.013, 0.046), (0.013, 0.056), (0.001, 0.057)],
                       8, cap_top=True, cap_bottom=True)
    verts = []
    cols = []
    for (px, py, pz) in v:
        verts.append((x + px, 0.05 + pz, 0.06 + py))  # 轴向 z
        cols.append(brass_col(rnd))
    items.append((verts, f, cols))
    return svlib.merge_pydata(items)


def build_band(y, seed=19):
    """弦木加固横带（黄铜薄带绕过双弦背面——老图书梯的箍件语言）。"""
    rnd = random.Random(seed)
    verts = []
    faces = []
    cols = []
    w = 0.02
    pts = [(-SX - 0.032, -0.052), (SX + 0.032, -0.052)]
    n = 8
    for j in range(n + 1):
        t = j / n
        x = pts[0][0] + (pts[1][0] - pts[0][0]) * t
        for (dy, dz) in ((0, 0), (w, 0), (w, 0.008), (0, 0.008)):
            verts.append((x, y + dy, pts[0][1] + dz))
            cols.append(brass_col(rnd))
    for j in range(n):
        for s in range(4):
            p = j * 4 + s
            q = j * 4 + (s + 1) % 4
            faces.append((p, q, q + 4, p + 4))
    return verts, faces, cols


# ---------- 胶轮（局部坐标：轮心在原点，轴向 x） ----------
def build_wheel(radial, treads, noise=0.0, seed=23):
    rnd = random.Random(seed)
    verts = []
    faces = []
    cols = []
    R = 0.05
    W = 0.03
    prof = []
    n_t = treads
    for i in range(n_t + 1):
        t = i / n_t
        x = -W / 2 + t * W
        r = R * (1 - 0.06 * math.sin(t * math.pi))  # 胎面微凹
        # 凹槽
        if 0 < i < n_t and i % 2 == 0:
            r *= 0.97
        prof.append((x, r))
    for (x, r) in prof:
        for s in range(radial):
            a = s / radial * TAU
            rr = r * (1 + ((rnd.random() - 0.5) * noise if noise else 0))
            verts.append((x, math.sin(a) * rr, math.cos(a) * rr))
            v = 0.95 + (rnd.random() - 0.5) * 0.22
            cols.append((v, v, v))
    for j in range(len(prof) - 1):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    # 轮毂盖两侧
    for (ring0, xx, flip) in ((0, -W / 2, True), ((len(prof) - 1) * radial, W / 2, False)):
        c = len(verts)
        verts.append((xx, 0, 0))
        cols.append((0.85, 0.8, 0.6))
        for s in range(radial):
            tri = (c, ring0 + (s + 1) % radial, ring0 + s)
            faces.append(tri if flip else (c, ring0 + s, ring0 + (s + 1) % radial))
    return verts, faces, cols


def build_all(detail):
    hi = detail == 'hi'
    parts = {}
    wood_items = [
        build_stringer(-SX, segs=64 if hi else 10, noise=0.03 if hi else 0.0, seed=3),
        build_stringer(SX, segs=64 if hi else 10, noise=0.03 if hi else 0.0, seed=4)
    ]
    for i in range(RUNGS):
        wood_items.append(build_rung(RUNG_Y0 + i * RUNG_DY, radial=14 if hi else 9,
                                     segs=22 if hi else 8, noise=0.02 if hi else 0.0, seed=30 + i))
    parts['wood'] = svlib.merge_pydata(wood_items)
    brass_items = []
    for i in range(RUNGS):
        y = RUNG_Y0 + i * RUNG_DY
        brass_items.append(build_pin(-SX - 0.022, y, seed=50 + i))
        brass_items.append(build_pin(SX + 0.022, y, seed=70 + i))
    brass_items.append(build_hook(-SX, segs=20 if hi else 10, noise=0.02 if hi else 0, seed=13))
    brass_items.append(build_hook(SX, segs=20 if hi else 10, noise=0.02 if hi else 0, seed=14))
    brass_items.append(build_fork(-SX, seed=17))
    brass_items.append(build_fork(SX, seed=18))
    brass_items.append(build_band(1.62, seed=19))
    brass_items.append(build_band(3.18, seed=20))
    parts['brass'] = svlib.merge_pydata(brass_items)
    parts['wheel'] = build_wheel(radial=18 if hi else 10, treads=8 if hi else 4,
                                 noise=0.015 if hi else 0.0, seed=23)
    return parts


def main():
    svlib.reset_scene()
    woodm = svlib.vcol_material('wood', roughness=0.62, base=(0.2, 0.128, 0.066))
    brassm = svlib.vcol_material('brass', roughness=0.3, metallic=0.9, base=(0.55, 0.4, 0.16))
    rubberm = svlib.vcol_material('rubber', roughness=0.9, base=(0.06, 0.055, 0.05))
    mat_of = {'wood': woodm, 'brass': brassm, 'wheel': rubberm}

    hi_parts = build_all('hi')
    for name, (v, f, c) in hi_parts.items():
        ob = svlib.mesh_object(f'hi_{name}', v, f, c)
        ob.data.materials.append(mat_of[name])
        svlib.smooth(ob, angle=0.9)
        ob.rotation_euler = (math.pi / 2, 0, 0)
        if name == 'wheel':
            # 渲染摆位：放到左轮位（游戏内两只轮由同一几何复用）
            ob.location = (-SX, -0.06, 0.05)
            ob.rotation_euler = (0, 0, 0)

    game_parts = build_all('game')
    game_obs = {}
    for name, (v, f, c) in game_parts.items():
        ob = svlib.mesh_object(f'game_{name}', v, f, c)
        ob.data.materials.append(mat_of[name])
        svlib.smooth(ob, angle=0.9)
        ob.rotation_euler = (math.pi / 2, 0, 0)
        ob.location = (1.4, 0, 0)
        if name == 'wheel':
            ob.location = (1.4 - SX, -0.06, 0.05)
            ob.rotation_euler = (0, 0, 0)
        game_obs[name] = ob

    # 档案廊式暖冷双灯
    svlib.add_light('AREA', (-1.6, -2.4, 3.6), 320, color=(0.85, 0.9, 1.0), size=3, target=(0, 0, 2.2))
    svlib.add_light('POINT', (0.8, -1.2, 4.4), 60, color=(1.0, 0.75, 0.4))

    svlib.render_views('ladder', [
        ((0.4, -3.9, 2.5), (0.7, 0, 2.2), 40),   # 双梯同框全景
        ((-0.5, -0.9, 3.9), (-0.26, 0, 4.35), 50),  # 顶钩特写
        ((-0.6, -0.8, 0.35), (-0.26, 0, 0.18), 45)  # 轮叉/端销特写
    ], samples=40)

    svlib.export_parts('ladder', game_obs,
                       note='梯身局部坐标同 archive.js；wheel 局部原点在轮心（轴向 x）')
    svlib.save_blend('ladder')
    for name, ob in game_obs.items():
        print(f'[gen_ladder] game {name}: {len(ob.data.vertices)} verts / {len(ob.data.polygons)} polys')


main()
