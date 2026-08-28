# ============================================================
# gen_owl — 双峰林地夜鸮权威细模（Blender 4.1.1 headless）。
#
# 替换 twinpeaks.js 里 12 段 Lathe 的简陋猫头鹰（v1.1 遗留弱资产）。
# 与游戏同坐标系（Y-up，爪下枝面 y=0，脸朝 +Z），分两部件导出，
# 头部独立局部原点在颈枢轴——游戏侧做「无声转头凝视」动画：
#   body   蹲姿躯干（胸腹横斑/背羽压暗）+ 折翼双壳（羽排阶梯 +
#          扇贝羽缘）+ 五枚尾羽扇 + 双爪（前三后一趾 + 勾爪）
#   head   颅壳（面盘双凹陷 + 盘缘棱 + 眉脊）+ 双耳羽簇 + 勾喙；
#          眼窝熏黑顶点色，眼球留给游戏侧程序化发光件
#          （挂点 ±0.048, 0.065, 0.085，随凝视动画调 emissive）
#
# HI 档：高段数 + 逐顶点绒羽噪声（渲染自检用）
# GAME 档：同参数低段数（body ≤1500 tris / head ≤1000 tris）
#
# 运行：blender -b -P gen_owl.py
# 产物：blends/owl.blend / renders/owl-*.png / exports/owl.json
# ============================================================
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import svlib  # noqa: E402

TAU = math.tau

NECK_Y = 0.335          # 颈枢轴高度（body 顶端收口处；head 局部原点落在这里）
EYE = (0.048, 0.065, 0.058)  # 游戏侧眼球挂点（头局部坐标，坐进眼窝暗腔）


def feather_col(rnd, y_v, band, dark=0.0, warm=1.0, bar_amp=0.26):
    """羽色顶点色：横斑 + 噪点，游戏内与暗棕底色相乘。
    band 为横斑相位；dark 直接压暗（背羽/羽尖）。"""
    bar = math.sin(band) * bar_amp
    v = (0.92 + bar + (rnd.random() - 0.5) * 0.14) * (1 - dark)
    return (min(1.3, v * warm), min(1.3, v * 0.94), min(1.3, v * 0.85))


# ---------- 躯干 ----------
def build_torso(radial, rings, noise=0.0, seed=71):
    rnd = random.Random(seed)
    verts = []
    faces = []
    cols = []
    y0 = 0.015
    y1 = NECK_Y

    def prof(v):
        # 尾根（收窄）→ 下腹 → 胸（最宽 v≈0.52）→ 溜肩 → 颈口
        if v < 0.20:
            return 0.062 + v / 0.20 * 0.044
        if v < 0.52:
            return 0.106 + math.sin((v - 0.20) / 0.32 * math.pi * 0.5) * 0.013
        if v < 0.80:
            return 0.119 - (v - 0.52) / 0.28 * 0.036
        return 0.083 - (v - 0.80) / 0.20 * 0.031

    for j in range(rings + 1):
        v = j / rings
        y = y0 + (y1 - y0) * v
        r = prof(v)
        lean = math.exp(-((v - 0.42) ** 2) / 0.05) * 0.014   # 蹲姿：胸腹微前凸
        for s in range(radial):
            a = s / radial * TAU
            fz = math.sin(a)          # +1 正面（胸腹）/ -1 背面
            # 绒羽鼓包：胸腹柔软外鼓（幅度压低，不出「土豆」块）
            fluff = (math.sin(a * 5 + y * 26) * 0.022 + math.sin(a * 11 + y * 47) * 0.014) * max(0.0, fz)
            rr = r * (1 + fluff)
            if noise:
                rr *= 1 + (rnd.random() - 0.5) * noise
            x = math.cos(a) * rr
            z = math.sin(a) * rr + lean * max(0.0, fz)
            verts.append((x, y, z))
            # 胸腹亮 + 粗横斑；背面压暗少斑
            front = max(0.0, fz)
            c = feather_col(rnd, v, band=y * 110 + math.sin(a * 2.3) * 1.3,
                            dark=0.30 * (1 - front), warm=1.0 + front * 0.10,
                            bar_amp=0.12 + front * 0.24)
            cols.append(c)
    for j in range(rings):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    # 颈口封盖
    top0 = rings * radial
    verts.append((0.0, y1 + 0.008, 0.004))
    cols.append((0.62, 0.58, 0.53))
    for s in range(radial):
        faces.append((len(verts) - 1, top0 + s, top0 + (s + 1) % radial))
    # 尾根封底
    verts.append((0.0, y0 - 0.004, 0.0))
    cols.append((0.5, 0.47, 0.43))
    for s in range(radial):
        faces.append((len(verts) - 1, (s + 1) % radial, s))
    return verts, faces, cols


# ---------- 折翼壳（左右各一，羽排阶梯 + 扇贝羽缘） ----------
def build_wing(side, rows, arc_segs, seed=83):
    """side=-1 左 / +1 右。壳面贴着躯干侧后方，从肩滑到翼尖。"""
    rnd = random.Random(seed + side)
    verts = []
    faces = []
    cols = []
    yr_top, yr_tip = 0.295, 0.058
    for j in range(rows + 1):
        v = j / rows
        y = yr_top + (yr_tip - yr_top) * v
        # 该高度的躯干半径（跟 build_torso.prof 同步近似）
        u = (y - 0.015) / (NECK_Y - 0.015)
        if u < 0.20:
            r = 0.062 + u / 0.20 * 0.044
        elif u < 0.52:
            r = 0.106 + math.sin((u - 0.20) / 0.32 * math.pi * 0.5) * 0.013
        elif u < 0.80:
            r = 0.119 - (u - 0.52) / 0.28 * 0.036
        else:
            r = 0.083 - (u - 0.80) / 0.20 * 0.031
        shell = r + 0.015 + v * 0.004      # 壳面浮出躯干，向翼尖收拢贴体
        # 羽排阶梯：每排羽缘略外挑 + 扇贝缘
        step = (j % 2) * 0.006
        # 弧段：从侧前方绕到背后（折翼包住背侧）
        a0 = 0.55 - v * 0.20               # 前缘（越往下越收向侧后）
        a1 = 2.30 + v * 0.30               # 后缘（往背中线卷）
        for s in range(arc_segs + 1):
            w = s / arc_segs
            a = a0 + (a1 - a0) * w
            scallop = math.sin(w * math.pi * 5) * 0.005 * (0.5 + v)
            rr = shell + step + scallop
            x = math.cos(a) * rr * side
            z = -math.sin(a) * rr + 0.014
            # 翼尖向后收拢下坠
            yy = y - v * v * 0.012 - scallop * 1.6
            verts.append((x, yy, z))
            # 羽排交替明暗 + 羽缘亮线（可读的层叠结构），整体不再发黑
            dark = 0.06 + v * 0.15 - (j % 2) * 0.10
            edge = 0.16 if (j % 2 == 1) else 0.0
            cols.append(feather_col(rnd, v, band=v * 26 + w * 4.4,
                                    dark=max(0.0, dark - edge), warm=0.95, bar_amp=0.12))
    n = arc_segs + 1
    for j in range(rows):
        for s in range(arc_segs):
            p = j * n + s
            faces.append((p, p + 1, p + 1 + n, p + n))
    if side > 0:  # 右翼绕向相反，翻面保法线朝外
        faces = [tuple(reversed(f)) for f in faces]
    return verts, faces, cols


# ---------- 尾羽扇 ----------
def build_tail(n_feathers, seed=97):
    rnd = random.Random(seed)
    items = []
    for i in range(n_feathers):
        t = (i - (n_feathers - 1) / 2) / max(1, n_feathers - 1)
        a = t * 0.75                      # 扇开角
        lg = 0.150 - abs(t) * 0.028       # 中长边短
        wd = 0.024
        # 羽根在尾根（y0.07, z-0.048），向后下方伸出
        bx, by, bz = t * 0.030, 0.072, -0.048
        dx = math.sin(a) * 0.35
        dy = -0.55
        dz = -0.72
        verts = []
        cols = []
        for k in (0.0, 0.55, 1.0):
            w = wd * (1 - k * 0.35)
            cxp = bx + dx * lg * k
            cyp = by + dy * lg * k
            czp = bz + dz * lg * k
            px = math.cos(a) * w
            pz = -math.sin(a) * w * 0.4
            verts.append((cxp - px, cyp, czp - pz))
            verts.append((cxp + px, cyp, czp + pz))
            dark = 0.30 + k * 0.26
            band = math.sin(k * 9 + i) * 0.1
            v = (0.9 + band + (rnd.random() - 0.5) * 0.1) * (1 - dark)
            cols.extend([(v, v * 0.93, v * 0.84)] * 2)
        faces = [(0, 1, 3, 2), (2, 3, 5, 4)]
        items.append((verts, faces, cols))
    return svlib.merge_pydata(items)


# ---------- 双爪（前三后一趾 + 勾爪） ----------
def build_feet(seg, seed=59):
    rnd = random.Random(seed)
    items = []
    for side in (-1, 1):
        fx = side * 0.050
        toes = [(-0.42, 1.0), (0.0, 1.12), (0.42, 1.0), (math.pi, 0.78)]  # (偏航, 长度系数)
        for (ta, tl) in toes:
            verts = []
            cols = []
            faces = []
            L = 0.058 * tl
            for j in range(3):
                k = j / 2
                r = 0.013 * (1 - k * 0.42)
                # 趾节沿枝面弯拱，整体前移露出腹下
                px = fx + math.sin(ta) * L * k * 0.35
                py = 0.014 - k * k * 0.011
                pz = 0.030 + math.cos(ta) * L * k
                for s in range(seg):
                    a = s / seg * TAU
                    verts.append((px + math.cos(a) * r, py + math.sin(a) * r * 0.8, pz))
                    g = 0.35 + (rnd.random() - 0.5) * 0.08
                    cols.append((g, g * 0.92, g * 0.85))
            for j in range(2):
                for s in range(seg):
                    p = j * seg + s
                    q = j * seg + (s + 1) % seg
                    faces.append((p, q, q + seg, p + seg))
            # 勾爪（小三棱锥，向下抠）
            tipx = fx + math.sin(ta) * L * 0.42
            tipz = 0.030 + math.cos(ta) * L * 1.12
            b = len(verts)
            for (ox, oy, oz) in ((-0.005, 0.006, -0.008), (0.005, 0.006, -0.008), (0, 0.012, -0.004)):
                verts.append((tipx + ox, 0.004 + oy, tipz + oz))
                cols.append((0.16, 0.15, 0.14))
            verts.append((tipx, -0.006, tipz + 0.016))
            cols.append((0.12, 0.11, 0.10))
            faces.extend([(b, b + 1, b + 3), (b + 1, b + 2, b + 3), (b + 2, b, b + 3), (b, b + 2, b + 1)])
            items.append((verts, faces, cols))
    return svlib.merge_pydata(items)


def build_body(hi):
    radial = 30 if hi else 18
    rings = 22 if hi else 12
    items = [
        build_torso(radial, rings, noise=0.012 if hi else 0.0),
        build_wing(-1, 12 if hi else 6, 14 if hi else 7),
        build_wing(1, 12 if hi else 6, 14 if hi else 7),
        build_tail(7 if hi else 5),
        build_feet(8 if hi else 5)
    ]
    return svlib.merge_pydata(items)


# ---------- 头（局部原点 = 颈枢轴） ----------
def build_head(radial, rows, noise=0.0, seed=41):
    rnd = random.Random(seed)
    verts = []
    faces = []
    cols = []
    R = 0.088
    cy = 0.052                            # 颅心相对颈枢轴抬高（头坐进肩里，无脖）
    for j in range(rows + 1):
        t = j / rows
        phi = t * math.pi
        for s in range(radial):
            a = s / radial * TAU
            x = math.sin(phi) * math.cos(a) * R
            z = math.sin(phi) * math.sin(a) * R
            y = math.cos(phi) * R * 0.92
            # 面盘：正面压扁成浅盘
            fm = max(0.0, min(1.0, (z - 0.008) / 0.07))
            fm = fm * fm * (3 - 2 * fm)
            z -= fm * (z - 0.055) * 0.66
            # 双眼窝深陷（高斯收窄成两个分立暗腔，不许融成一个大坑）
            for ex in (-EYE[0], EYE[0]):
                d2 = ((x - ex) ** 2 + (y - (EYE[1] - cy)) ** 2) / 0.0009
                z -= fm * math.exp(-d2) * 0.034
            # 盘缘棱（面盘外圈一圈细脊）
            rim = math.exp(-((math.hypot(x, y - (EYE[1] - cy) * 0.6) - 0.072) ** 2) / 0.00016)
            z += fm * rim * 0.010
            # 眉脊（眼窝上沿向耳簇挑）
            brow = math.exp(-((y - (EYE[1] - cy) - 0.032) ** 2) / 0.0007) * min(1.0, abs(x) / 0.02)
            z += fm * brow * 0.009 * max(0.0, 1 - abs(x) / 0.075)
            if noise:
                k = 1 + (rnd.random() - 0.5) * noise
                x *= k
                z *= k
            verts.append((x, y + cy, z))
            # 顶点色：面盘亮、盘缘更亮、眼窝熏黑、颅顶背面压暗
            socket = 0.0
            for ex in (-EYE[0], EYE[0]):
                d2 = ((x - ex) ** 2 + (y + cy - EYE[1]) ** 2) / 0.0014
                socket = max(socket, math.exp(-d2))
            g = 0.60 + fm * 0.34 + rim * 0.30 - socket * 0.78
            g += (rnd.random() - 0.5) * 0.10
            g = max(0.08, min(1.28, g))
            cols.append((g, g * 0.94, g * 0.86))
    for j in range(rows):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    return verts, faces, cols


def build_tufts(seg, seed=53):
    """双耳羽簇：三节微曲锥，向外上方挑。"""
    rnd = random.Random(seed)
    items = []
    for side in (-1, 1):
        bx = side * 0.055
        by = 0.135
        verts = []
        cols = []
        faces = []
        rows = [(0.016, 0.0), (0.011, 0.026), (0.005, 0.046)]
        for (r, h) in rows:
            cxp = bx + side * h * 0.9
            cyp = by + h
            czp = -0.012 - h * 0.18
            for s in range(seg):
                a = s / seg * TAU
                verts.append((cxp + math.cos(a) * r, cyp + math.sin(a) * r * 0.5, czp + math.sin(a) * r))
                g = 0.30 + (rnd.random() - 0.5) * 0.1 - h * 2.2
                g = max(0.12, g)
                cols.append((g, g * 0.93, g * 0.85))
        for j in range(2):
            for s in range(seg):
                p = j * seg + s
                q = j * seg + (s + 1) % seg
                faces.append((p, q, q + seg, p + seg))
        # 簇尖
        b = len(verts)
        verts.append((bx + side * 0.062, by + 0.066, -0.026))
        cols.append((0.12, 0.11, 0.10))
        top0 = 2 * seg
        for s in range(seg):
            faces.append((b, top0 + s, top0 + (s + 1) % seg))
        items.append((verts, faces, cols))
    return svlib.merge_pydata(items)


def build_beak(seg):
    """勾喙：短锥 + 下勾尖。"""
    verts = []
    cols = []
    faces = []
    base_y, base_z = 0.040, 0.070
    rows = [(0.017, 0.0, 0.0), (0.011, -0.008, 0.020), (0.004, -0.022, 0.030)]
    for (r, dy, dz) in rows:
        for s in range(seg):
            a = s / seg * TAU
            verts.append((math.cos(a) * r, base_y + dy + math.sin(a) * r * 0.7, base_z + dz))
            cols.append((0.30, 0.26, 0.22))
    for j in range(2):
        for s in range(seg):
            p = j * seg + s
            q = j * seg + (s + 1) % seg
            faces.append((p, q, q + seg, p + seg))
    b = len(verts)
    verts.append((0.0, base_y - 0.034, base_z + 0.031))   # 勾尖向下
    cols.append((0.18, 0.16, 0.14))
    top0 = 2 * seg
    for s in range(seg):
        faces.append((b, top0 + s, top0 + (s + 1) % seg))
    return verts, faces, cols


def build_head_all(hi):
    return svlib.merge_pydata([
        build_head(26 if hi else 20, 20 if hi else 14, noise=0.010 if hi else 0.0),
        build_tufts(8 if hi else 5),
        build_beak(8 if hi else 6)
    ])


def build_all(detail):
    hi = detail == 'hi'
    return {'body': build_body(hi), 'head': build_head_all(hi)}


def main():
    svlib.reset_scene()
    fm = svlib.vcol_material('feather', roughness=0.92, base=(0.30, 0.22, 0.15))
    mat_of = {'body': fm, 'head': fm}

    hi_parts = build_all('hi')
    for name, (v, f, c) in hi_parts.items():
        ob = svlib.mesh_object(f'hi_{name}', v, f, c)
        ob.data.materials.append(mat_of[name])
        svlib.smooth(ob, angle=0.9)
        ob.rotation_euler = (math.pi / 2, 0, 0)
        if name == 'head':
            ob.location = (0, 0, NECK_Y)   # 头挂回颈枢轴（场景 Z-up：location.z）

    game_parts = build_all('game')
    game_obs = {}
    for name, (v, f, c) in game_parts.items():
        ob = svlib.mesh_object(f'game_{name}', v, f, c)
        ob.data.materials.append(mat_of[name])
        svlib.smooth(ob, angle=0.9)
        ob.rotation_euler = (math.pi / 2, 0, 0)
        ob.location = (0.55, 0, 0 if name == 'body' else NECK_Y)
        game_obs[name] = ob

    # 月夜林地灯位：冷月主光 + 暖窗远补（对应双峰厅路灯色）
    svlib.add_light('AREA', (-0.9, -1.4, 1.3), 60, color=(0.62, 0.74, 1.0), size=2.5, target=(0.2, 0, 0.25))
    svlib.add_light('POINT', (1.4, -1.0, 0.5), 12, color=(1.0, 0.72, 0.4))

    svlib.render_views('owl', [
        ((0.28, -0.95, 0.42), (0.28, 0, 0.24), 48),    # 双机同框 3/4
        ((-0.22, -0.42, 0.44), (0.0, 0.02, 0.30), 55),  # HI 头/面盘特写
        ((0.30, -0.55, 0.18), (0.0, 0.05, 0.22), 45)    # HI 侧后（翼壳/尾扇/爪）
    ], samples=40)

    svlib.export_parts('owl', game_obs,
                       note='局部 Y-up 脸朝 +Z；body 爪下 y=0，head 原点=颈枢轴 y=0.335；'
                            '眼球挂点 head 局部 (±0.048, 0.065, 0.085) 由游戏侧程序化补')
    svlib.save_blend('owl')
    for name, ob in game_obs.items():
        print(f'[gen_owl] game {name}: {len(ob.data.vertices)} verts / {len(ob.data.polygons)} polys')


main()
