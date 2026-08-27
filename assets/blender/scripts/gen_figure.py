# ============================================================
# gen_figure — 穆赫兰道拐角梦魇形体权威细模（Blender 4.1.1 headless）。
#
# 与游戏内 kit.nightmareFigure 同一坐标系（Y-up，脚底 y=0，
# 身高 2.4，脸朝 +Z），分部件导出，运行时按原有动画挂点重组：
#   body   连体破袍（垂褶/撕摆/佝偻前倾/后背驼峰），含裙脚
#   head   颅骨壳（凹陷眼窝/眉棱/塌颊/过长下颌/鼻脊/不对称）
#          —— 眼窝坐标与游戏内程序化眼球 (±0.062, 0.035) 对齐
#   hairBack / hairL / hairR  三组长绺（过颅披弧+缠结波浪+尾漂）
#   armL / armR    肩枢轴局部坐标的破袖（袖口撕裂外张）
#   handL / handR  苍白长手（掌 + 三节弯曲长指 + 拇指）
#
# HI 档：高段数 + 逐顶点噪声布纹/皮肤皴起伏（渲染自检用）
# GAME 档：同参数低段数（预算内），顶点色带煤烟斑
#
# 运行：blender -b -P gen_figure.py
# 产物：blends/figure.blend / renders/figure-*.png / exports/figure.json
# ============================================================
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import svlib  # noqa: E402

TAU = math.tau
HEIGHT = 2.4


# ---------- 破袍 ----------
def build_body(radial, rings, noise=0.0, seed=11):
    rnd = random.Random(seed)
    verts = []
    faces = []
    cols = []
    y0 = 0.02
    y1 = HEIGHT * 0.81
    # 半径剖面：裙脚 → 腰 → 胸 → 肩（顶端收口）
    def prof(v):
        if v < 0.18:
            return 0.46 - (v / 0.18) * 0.13
        if v < 0.5:
            return 0.33 - (v - 0.18) / 0.32 * 0.05
        if v < 0.80:
            return 0.28 - (v - 0.5) / 0.30 * 0.04
        if v < 0.92:  # 溜肩：快速塌下去
            return 0.24 - (v - 0.80) / 0.12 * 0.125
        return 0.115 - (v - 0.92) / 0.08 * 0.03  # 短颈茬（头从这里探出去）
    for j in range(rings + 1):
        v = j / rings
        y = y0 + (y1 - y0) * v
        r = prof(v)
        lean = (v ** 2) * 0.13            # 佝偻前倾（+Z，颈茬对齐头挂点 z=0.1）
        hump = math.exp(-((v - 0.80) ** 2) / 0.012) * 0.08  # 后背驼峰（-Z 鼓）
        for s in range(radial):
            a = s / radial * TAU
            # 垂褶：两组角频 + 底摆加深；撕摆：底缘大幅参差
            fold = (math.sin(a * 6 + y * 7) * 0.07 + math.sin(a * 13 + y * 19) * 0.05) * (0.5 + (1 - v) * 0.8)
            tear = 0.0
            if v < 0.1:
                tear = (math.sin(a * 7 + 1) * 0.14 + math.sin(a * 15) * 0.07)
            rr = r * (1 + fold + tear)
            if noise:
                rr *= 1 + (rnd.random() - 0.5) * noise * (0.4 + (1 - v))
            x = math.cos(a) * rr
            z = math.sin(a) * rr + lean - hump * max(0.0, -math.sin(a))
            # 底缘垂尖：撕摆的尖角往下坠
            dy = -max(0.0, tear) * 0.24 if v < 0.06 else 0.0
            verts.append((x, y + dy, z))
            # 煤垢顶点色：近黑袍面上炭黑竖streak与油渍斑
            g = 0.88 + math.sin(a * 9 + y * 5) * 0.22 + (rnd.random() - 0.5) * 0.26
            g = max(0.42, min(1.3, g))
            cols.append((g, g * 0.97, g * 0.94))
    for j in range(rings):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    # 颈口封盖（跟随前倾量）
    top0 = rings * radial
    verts.append((0.0, y1 + 0.01, 0.13))
    cols.append((0.7, 0.68, 0.66))
    for s in range(radial):
        faces.append((len(verts) - 1, top0 + s, top0 + (s + 1) % radial))
    return verts, faces, cols


# ---------- 颅骨壳 ----------
SOCKETS = [(-0.062, 0.035, 1.0), (0.062, 0.031, 1.18)]  # (x, y, 大小系数)——右眼略大略低


def build_head(radial, rows, noise=0.0, seed=23):
    rnd = random.Random(seed)
    verts = []
    faces = []
    cols = []
    R = 0.165
    for j in range(rows + 1):
        t = j / rows            # 0 顶 → 1 底
        phi = t * math.pi
        for s in range(radial):
            a = s / radial * TAU
            x = math.sin(phi) * math.cos(a) * R
            z = math.sin(phi) * math.sin(a) * R
            y = math.cos(phi) * R
            # 基础改形：两颊内收 / 下颌拉长 / 整体拔高
            x *= 0.82
            if y < 0:
                y *= 1.34
            y *= 1.16
            # 不对称起伏
            n = 1 + math.sin(x * 31 + y * 17) * 0.05
            x *= n
            z *= n
            # ---- 五官雕刻（细模核心，幅度要压过降噪与柔光）----
            # 前向平滑遮罩：只作用于面孔一侧，且无硬切缝
            fm = max(0.0, min(1.0, (z - 0.015) / 0.06))
            fm = fm * fm * (3 - 2 * fm)  # smoothstep
            # 眼窝：双高斯深陷（读得出「两个黑洞」）
            for (sx, sy, sc) in SOCKETS:
                d2 = ((x - sx) ** 2 + (y - sy) ** 2) / (0.055 * sc) ** 2
                z -= math.exp(-d2) * 0.09 * sc * fm
            # 眉棱：眼窝上方横向骨脊（把眼窝压进阴影）
            bd = ((y - 0.098) ** 2) / 0.0011 + (x ** 2) / 0.017
            z += math.exp(-bd) * 0.052 * fm
            # 鼻脊：中线细窄凸起（到人中收窄）
            nd = (x ** 2) / 0.0007 + ((y - 0.0) ** 2) / 0.0055
            z += math.exp(-nd) * 0.034 * fm
            # 口窝：微张之处先塌一层（游戏内的黑缝 mesh 落在这里）
            md = (x ** 2) / 0.0012 + ((y + 0.108) ** 2) / 0.0008
            z -= math.exp(-md) * 0.02 * fm
            # 颊窝：颧下深塌（饿相）
            for sx in (-0.085, 0.085):
                cd = ((x - sx) ** 2 + (y + 0.05) ** 2) / 0.0042
                z -= math.exp(-cd) * 0.05 * fm
            # 太阳穴收（平滑遮罩，无跳变）
            for sx in (-0.11, 0.11):
                td = ((x - sx) ** 2 + (y - 0.06) ** 2) / 0.004
                sm = max(0.0, min(1.0, (abs(x) - 0.05) / 0.02))
                x -= math.copysign(math.exp(-td) * 0.02 * sm, x)
            # 下颌尖前顶
            if y < -0.12:
                z += (min(0.1, -y - 0.12)) * 0.35
            if noise:
                k = 1 + (rnd.random() - 0.5) * noise
                x *= k
                z *= k
            verts.append((x, y, z))
            # 皮色顶点层：惨白底 + 眼周/颊侧烟熏黑晕
            soot = 0.0
            for (sx, sy, sc) in SOCKETS:
                soot = max(soot, math.exp(-(((x - sx) ** 2 + (y - sy) ** 2) / 0.006)) * 0.72)
            soot = max(soot, math.exp(-(((abs(x) - 0.1) ** 2 + (y + 0.02) ** 2) / 0.008)) * 0.3)
            base = 1.0 + ((rnd.random() - 0.5) * 0.18 if noise else 0.0)
            w = base * (1 - soot)
            cols.append((max(0.07, w), max(0.06, w * 0.95), max(0.05, w * 0.88)))
    for j in range(rows):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    return verts, faces, cols


# ---------- 长发 ----------
def hair_params(seed_base=97):
    F = math.pi / 2  # 脸朝 +Z
    groups = {}
    rb = random.Random(seed_base)
    back = []
    for i in range(14):
        a = F + 0.85 + (i / 13) * (TAU - 1.7)
        back.append({'a': a, 'len': 0.58 + rb.random() * 0.37, 'rtop': 0.013 + rb.random() * 0.008,
                     'kink': 4 + rb.random() * 5, 'ph': rb.random() * 7,
                     'bow': 0.05 + rb.random() * 0.05, 'drift': (rb.random() - 0.5) * 0.12})
    groups['hairBack'] = back
    for name, seed, sgn in (('hairL', 98, 1), ('hairR', 99, -1)):
        rr = random.Random(seed)
        gs = []
        for k, off in enumerate((0.52, 0.66, 0.8)):
            ln = (0.5 if sgn > 0 else 0.48) + rr.random() * 0.22
            gs.append({'a': F + sgn * off, 'len': ln, 'rtop': 0.013 + rr.random() * 0.008,
                       'kink': 4 + rr.random() * 5, 'ph': rr.random() * 7,
                       'bow': 0.05 + rr.random() * 0.05, 'drift': (rr.random() - 0.5) * 0.12})
        groups[name] = gs
    return groups


def build_strand(st, radial, rings, noise=0.0, seed=5):
    rnd = random.Random(seed)
    verts = []
    faces = []
    cols = []
    ux, uz = math.cos(st['a']), math.sin(st['a'])
    ln = st['len']
    for j in range(rings + 1):
        v = j / rings
        # 根粗尾细 + 中腹微鼓（成绺的头发是一束）
        r = st['rtop'] * (1 - v) + 0.0045 * v
        r *= 1 + math.sin(v * math.pi) * 0.35
        bow = math.sin(min(1.0, v * 2.2) * math.pi) * st['bow']
        kink = math.sin(v * math.pi * st['kink'] + st['ph']) * 0.013 * v
        sway = st['drift'] * v * v
        cx = ux * 0.125 + ux * (bow + sway) + kink * uz
        cz = uz * 0.125 + uz * (bow + sway) - kink * ux
        cy = 0.115 - ln * v
        for s in range(radial):
            b = s / radial * TAU
            ox = math.cos(b) * r
            oz = math.sin(b) * r
            jag = 1 + ((rnd.random() - 0.5) * noise if noise else 0.0)
            verts.append((cx + ox * jag, cy + math.sin(b * 2 + v * 9) * r * 0.2, cz + oz * jag))
            sh = 0.62 + v * 0.55 + (rnd.random() - 0.5) * 0.22  # 根暗梢亮
            cols.append((sh, sh * 0.97, sh * 0.95))
    for j in range(rings):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    # 尾尖
    tipc = len(verts)
    v = 1.0
    verts.append((ux * 0.125 + ux * (st['drift']) + 0, 0.115 - ln - 0.02, uz * 0.125 + uz * st['drift']))
    cols.append((1.05, 1.0, 0.97))
    last0 = rings * radial
    for s in range(radial):
        faces.append((tipc, last0 + s, last0 + (s + 1) % radial))
    return verts, faces, cols


def build_hair_cap(radial, rows, noise=0.0, seed=31):
    """贴颅乱壳（长绺根部之间的填充）——脸窗开在正前方
    （±0.72 rad 不盖），下缘参差；额前另补一条垂帘碎发短檐。"""
    rnd = random.Random(seed)
    verts = []
    faces = []
    cols = []
    R = 0.178
    F = math.pi / 2  # 脸朝 +Z（azimuth 以 atan2(z,x) 记为 π/2）
    a0 = F + 0.72
    span = TAU - 1.44
    for j in range(rows + 1):
        t = j / rows * 0.68
        phi = t * math.pi
        for s in range(radial + 1):  # 开口壳：不首尾闭合
            a = a0 + s / radial * span
            n = 1 + math.sin(a * 9 + math.cos(phi) * 23) * 0.1
            if noise:
                n *= 1 + (rnd.random() - 0.5) * noise
            # 下缘（phi 大处）向颅面收拢一点、参差
            edge = 1 - max(0.0, t - 0.5) * 0.12 * (1 + math.sin(a * 7 + seed) * 0.6)
            x = math.sin(phi) * math.cos(a) * R * n * edge
            z = math.sin(phi) * math.sin(a) * R * n * 0.96 * edge
            y = math.cos(phi) * R * 1.12 + 0.02
            verts.append((x, y, z))
            sh = 0.6 + (rnd.random() - 0.5) * 0.3
            cols.append((0.045 * sh, 0.033 * sh, 0.026 * sh))
    W = radial + 1
    for j in range(rows):
        for s in range(radial):
            p = j * W + s
            q = j * W + s + 1
            faces.append((p, q, q + W, p + W))
    # 额前碎发短檐：贴着发际线垂到眉棱上一线（脸窗上沿的一排小垂片）
    fr_rows = max(2, rows // 3)
    fringe0 = len(verts)
    n_fr = max(5, radial // 3)
    for j in range(fr_rows + 1):
        t = j / fr_rows
        for s in range(n_fr + 1):
            a = F - 0.62 + (s / n_fr) * 1.24
            drop = t * (0.055 + math.sin(a * 13 + seed) * 0.02)
            rr = R * (1.0 - t * 0.06)
            x = math.cos(a) * rr * 0.86
            z = math.sin(a) * rr * 0.9
            y = 0.135 - drop
            if noise:
                x *= 1 + (rnd.random() - 0.5) * noise
            verts.append((x, y, z))
            sh = 0.62 + (rnd.random() - 0.5) * 0.3
            cols.append((sh, sh * 0.97, sh * 0.95))
    Wf = n_fr + 1
    for j in range(fr_rows):
        for s in range(n_fr):
            p = fringe0 + j * Wf + s
            q = p + 1
            faces.append((p, q, q + Wf, p + Wf))
    return verts, faces, cols


# ---------- 臂与手 ----------
def build_arm(side, radial, rings, noise=0.0, seed=41):
    """肩枢轴局部坐标：肩在原点，袖向 -Y 垂。"""
    rnd = random.Random(seed + (0 if side < 0 else 1))
    verts = []
    faces = []
    cols = []
    L = HEIGHT * 0.5
    for j in range(rings + 1):
        v = j / rings
        y = -v * L
        r = 0.042 + v * 0.028
        # 袖口外张 + 撕边
        if v > 0.9:
            r += (v - 0.9) * 0.5
        for s in range(radial):
            a = s / radial * TAU
            ridge = 1 + math.sin(y * 9 + side * 2) * 0.12 + math.sin(a * 5 + v * 11) * 0.06
            tear = (math.sin(a * 6 + seed) * 0.18 if v > 0.97 else 0.0)
            rr = r * ridge * (1 + tear)
            if noise:
                rr *= 1 + (rnd.random() - 0.5) * noise
            verts.append((math.cos(a) * rr, y - max(0.0, tear) * 0.05, math.sin(a) * rr))
            g = 0.9 + (rnd.random() - 0.5) * 0.26
            cols.append((g, g * 0.97, g * 0.94))
    for j in range(rings):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    return verts, faces, cols


def _finger(base, dirv, lens, r0, radial, curl, seed):
    """三节指：逐节弯曲（朝 +Z 抓向你），节间关节鼓。"""
    rnd = random.Random(seed)
    verts = []
    faces = []
    cols = []
    px, py, pz = base
    dx, dy, dz = dirv
    rings_per = 4
    total = len(lens)
    ring_id = 0
    for seg_i, ln in enumerate(lens):
        bend = curl * (seg_i + 1)
        # 每节方向逐渐向 +Z 卷
        ndy = dy * math.cos(bend) + dz * math.sin(bend) * 0  # 保持下垂为主
        for j in range(rings_per + 1):
            if seg_i > 0 and j == 0:
                continue  # 与上节共享环起点（简单起见直接续排）
            v = j / rings_per
            t = (seg_i + v)
            r = r0 * (1 - t / total * 0.45)
            # 关节鼓
            r *= 1 + math.exp(-((v - 0.0) ** 2) / 0.02) * (0.18 if seg_i else 0.0)
            cy = py + dy * ln * v
            cz = pz + dz * ln * v + math.sin(bend) * ln * v * 0.55
            cx = px + dx * ln * v
            for s in range(radial):
                b = s / radial * TAU
                verts.append((cx + math.cos(b) * r, cy + (rnd.random() - 0.5) * 0.001, cz + math.sin(b) * r))
                w = 0.96 + (rnd.random() - 0.5) * 0.14
                cols.append((w, w * 0.95, w * 0.88))
            ring_id += 1
        px = px + dx * ln
        py = py + dy * ln
        pz = pz + dz * ln + math.sin(bend) * ln * 0.55
    nrings = ring_id
    for j in range(nrings - 1):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    # 指尖
    tipc = len(verts)
    verts.append((px, py, pz))
    cols.append((0.95, 0.9, 0.82))
    last0 = (nrings - 1) * radial
    for s in range(radial):
        faces.append((tipc, last0 + s, last0 + (s + 1) % radial))
    return verts, faces, cols


def build_hand(side, radial=7, noise=0.0, seed=61):
    """肩枢轴局部坐标：腕在 y=-H*0.5-0.02 附近。掌 + 4 长指 + 拇指。"""
    rnd = random.Random(seed + (0 if side < 0 else 1))
    items = []
    wy = -HEIGHT * 0.5 - 0.02
    # 掌：扁圆丘（lathe 后压扁）
    pv, pf = svlib.lathe([(0.001, -0.05), (0.03, -0.045), (0.036, -0.01), (0.028, 0.03), (0.001, 0.042)],
                         radial, cap_top=True, cap_bottom=True)
    pverts = []
    pcols = []
    for (x, y, z) in pv:
        k = 1 + (rnd.random() - 0.5) * noise if noise else 1.0
        pverts.append((x * 1.05 * k, wy + y * 1.05, z * 0.42 * k))
        w = 0.96 + (rnd.random() - 0.5) * 0.12
        pcols.append((w, w * 0.95, w * 0.88))
    items.append((pverts, pf, pcols))
    # 四指：过长（食/中指再加长），从掌缘下垂微曲
    for f in range(4):
        fl = 0.052 + (0.018 if f in (1, 2) else 0.0)
        base = (-0.024 + f * 0.016, wy - 0.048, 0.004 + f * 0.002)
        items.append(_finger(base, (0.0, -1.0, 0.06), [fl, fl * 0.92, fl * 0.8],
                             0.0085, radial, curl=0.30 + f * 0.05, seed=seed * 7 + f))
    # 拇指
    items.append(_finger((side * 0.036, wy - 0.008, 0.01), (side * 0.5, -0.72, 0.2),
                         [0.036, 0.03], 0.0095, radial, curl=0.4, seed=seed * 13))
    return svlib.merge_pydata(items)


# ---------- 组装 ----------
def build_all(detail):
    """detail: 'hi' | 'game' → {partName: (verts, faces, cols)}"""
    hi = detail == 'hi'
    parts = {}
    parts['body'] = build_body(radial=36 if hi else 16, rings=56 if hi else 16,
                               noise=0.05 if hi else 0.0)
    parts['head'] = build_head(radial=48 if hi else 22, rows=36 if hi else 16,
                               noise=0.009 if hi else 0.0)
    hp = hair_params()
    for name, strands in hp.items():
        items = []
        for i, st in enumerate(strands):
            items.append(build_strand(st, radial=9 if hi else 5, rings=22 if hi else 9,
                                      noise=0.12 if hi else 0.0, seed=300 + i * 7))
        if name == 'hairBack':
            items.append(build_hair_cap(radial=28 if hi else 14, rows=12 if hi else 6,
                                        noise=0.06 if hi else 0.0))
        parts[name] = svlib.merge_pydata(items)
    parts['armL'] = build_arm(-1, radial=14 if hi else 8, rings=18 if hi else 7,
                              noise=0.05 if hi else 0.0)
    parts['armR'] = build_arm(1, radial=14 if hi else 8, rings=18 if hi else 7,
                              noise=0.05 if hi else 0.0)
    parts['handL'] = build_hand(-1, radial=8 if hi else 6, noise=0.04 if hi else 0.0)
    parts['handR'] = build_hand(1, radial=8 if hi else 6, noise=0.04 if hi else 0.0)
    return parts


# 游戏内挂载位（渲染摆位用，与 kit.nightmareFigure 一致）
MOUNTS = {
    'body': ((0, 0, 0), (0, 0, 0)),
    'head': ((0, HEIGHT * 0.86, 0.1), (0.1, 0, 0.16)),
    'hairBack': ((0, HEIGHT * 0.86, 0.1), (0.1, 0, 0.16)),
    'hairL': ((0, HEIGHT * 0.86, 0.1), (0.1, 0, 0.16)),
    'hairR': ((0, HEIGHT * 0.86, 0.1), (0.1, 0, 0.16)),
    'armL': ((-0.27, HEIGHT * 0.62, 0.06), (0.34, 0, 0.12)),
    'armR': ((0.27, HEIGHT * 0.62, 0.06), (0.34, 0, -0.12)),
    'handL': ((-0.27, HEIGHT * 0.62, 0.06), (0.34, 0, 0.12)),
    'handR': ((0.27, HEIGHT * 0.62, 0.06), (0.34, 0, -0.12))
}


def place(name, ob, dx=0.0):
    """把 Y-up 部件按游戏挂载位摆进 Blender Z-up 场景。"""
    (px, py, pz), (rx, ry, rz) = MOUNTS[name]
    import mathutils
    m_yup = mathutils.Matrix.Rotation(math.pi / 2, 4, 'X')  # Y-up → Z-up
    t = mathutils.Matrix.Translation((px, py, pz))
    r = (mathutils.Euler((rx, ry, rz), 'XYZ')).to_matrix().to_4x4()
    ob.matrix_world = m_yup @ t @ r
    ob.location.x += dx


def main():
    svlib.reset_scene()

    rag = svlib.vcol_material('rag', roughness=0.98, base=(0.09, 0.066, 0.055))
    skin = svlib.vcol_material('skin', roughness=0.72, base=(0.62, 0.56, 0.48))
    hairm = svlib.vcol_material('hair', roughness=0.42, base=(0.05, 0.037, 0.03))
    mat_of = {'body': rag, 'armL': rag, 'armR': rag,
              'head': skin, 'handL': skin, 'handR': skin,
              'hairBack': hairm, 'hairL': hairm, 'hairR': hairm}

    # ---- HI 细模（摆位组装渲染） ----
    hi_parts = build_all('hi')
    for name, (v, f, c) in hi_parts.items():
        ob = svlib.mesh_object(f'hi_{name}', v, f, c)
        ob.data.materials.append(mat_of[name])
        svlib.smooth(ob, angle=1.35)
        place(name, ob)

    # ---- GAME 档（右侧同框对比 + 导出） ----
    game_parts = build_all('game')
    game_obs = {}
    for name, (v, f, c) in game_parts.items():
        ob = svlib.mesh_object(f'game_{name}', v, f, c)
        ob.data.materials.append(mat_of[name])
        svlib.smooth(ob, angle=1.35)
        place(name, ob, dx=1.6)
        game_obs[name] = ob

    # ---- 打光（贴近游戏：下巴前冷底光 + 背后红边光 + 弱环境补） ----
    svlib.add_light('POINT', (0.0, -0.42, 1.78), 6, color=(0.78, 0.83, 1.0))
    svlib.add_light('AREA', (0.9, 1.7, 2.3), 70, color=(1.0, 0.22, 0.17), size=2.5,
                    target=(0, 0, 1.7))
    svlib.add_light('AREA', (-2.6, -2.8, 1.6), 26, color=(0.5, 0.6, 0.9), size=4,
                    target=(0, 0, 1.3))

    svlib.render_views('figure', [
        ((0.15, -4.4, 1.6), (0, 0, 1.2), 42),        # 全身正面
        ((0.10, -0.92, 1.98), (0.0, -0.08, 2.02), 50),  # 脸部特写（眼窝/眉棱/发帘）
        ((2.6, -3.8, 1.6), (0.85, 0, 1.25), 40)      # HI vs GAME 同框
    ], samples=48)

    svlib.export_parts('figure', game_obs,
                       note='与 kit.nightmareFigure 同坐标系；肩/头部件为枢轴局部坐标')
    svlib.save_blend('figure')

    for name, ob in game_obs.items():
        print(f'[gen_figure] game {name}: {len(ob.data.vertices)} verts / {len(ob.data.polygons)} polys')


main()
