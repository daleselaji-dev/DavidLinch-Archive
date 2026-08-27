# ============================================================
# gen_cabinet — 档案长廊通高卡片柜塔权威细模（Blender 4.1.1 headless）。
#
# 替换 archive.js v1.6 的盒子拼柜（120 只 BoxGeometry 抽屉面板）。
# 局部坐标：Y-up，宽沿 X（±1.6）、高 0→4.05、正面朝 +Z。
# 游戏内摆位：rotation.y = -PI/2 贴东墙（正面朝 -X 进厅方向）。
#
# 部件：
#   wood         柜体（侧板/背板/前脸板/分件柱）+ 三边合围线脚
#                （台座/顶檐成型剖面 sweep）+ 119 只倒角抽屉面板
#                （手工进出微差 + 指痕磨损顶点色 + 标签卡）
#   brass        119 组黄铜件：标签框（四边梃）+ 弓形杯拉手（弧管
#                双足 + 背板）；三只微开屉沿用面板错位
#   drawer       可动抽屉（archive.js 滑出动画用）：局部原点在
#                关合位面板中心，屉体开口盒 + 一叠索引卡
#   drawerBrass  可动抽屉的黄铜件（拉手 + 标签框），与 drawer 同挂点
#
# 网格槽位：row 7 / col 5（编号 61）留空给可动抽屉。
# HI：高段数 + 木面噪声；GAME：同参数低段数（预算内）。
# 运行：blender -b -P gen_cabinet.py
# 产物：blends/cabinet.blend / renders/cabinet-*.png / exports/cabinet.json
# ============================================================
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import svlib  # noqa: E402

TAU = math.tau

# ---------- 网格规格（与 archive.js v1.6 布局一致） ----------
W = 3.2            # 宽（X）
ROWS = 15
COLS = 8
ROW_Y0 = 0.32
ROW_DY = 0.245
COL_X0 = -W / 2 + 0.22
COL_DX = 0.395
FRONT_W = 0.355
FRONT_H = 0.215
FRONT_Z = 0.126    # 前脸板外皮
AJAR = {23, 104}   # 微开屉（61 留给可动抽屉）
LIVE = 61          # 可动抽屉槽位（wood/brass 跳过）


def wood_col(rnd, wear=0.0, tone=1.0):
    """围绕 1.0 的变化量（游戏内与 woodMat 程序木纹相乘）。"""
    v = (0.96 + (rnd.random() - 0.5) * 0.2 + wear * 0.4) * tone
    return (v, v * 0.97, v * 0.92)


def brass_col(rnd, tarnish=0.0):
    v = (1.0 + (rnd.random() - 0.5) * 0.2) * (1 - tarnish * 0.35)
    return (v, v * 0.99, v * 0.95)


# ---------- 通用小工具 ----------
def box(cx, cy, cz, sx, sy, sz, col_fn):
    """轴对齐盒（8 顶点 12 三角），col_fn(x,y,z) 给顶点色。"""
    verts = []
    cols = []
    for dx in (-1, 1):
        for dy in (-1, 1):
            for dz in (-1, 1):
                x, y, z = cx + dx * sx / 2, cy + dy * sy / 2, cz + dz * sz / 2
                verts.append((x, y, z))
                cols.append(col_fn(x, y, z))
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return verts, faces, cols


def beveled_front(cx, cy, cz, w, h, d, bev, col_fn):
    """带前缘倒角的面板：背环 → 前外环 → 前内环（倒角面）。"""
    verts = []
    cols = []
    ring = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    for (ex, ey) in ring:                       # 背环
        verts.append((cx + ex * w / 2, cy + ey * h / 2, cz - d))
    for (ex, ey) in ring:                       # 前外环
        verts.append((cx + ex * w / 2, cy + ey * h / 2, cz - bev))
    for (ex, ey) in ring:                       # 前内环（收 bev）
        verts.append((cx + ex * (w / 2 - bev), cy + ey * (h / 2 - bev), cz))
    for (x, y, z) in verts:
        cols.append(col_fn(x, y, z))
    faces = []
    for i in range(4):
        j = (i + 1) % 4
        faces.append((i, j, j + 4, i + 4))          # 侧壁
        faces.append((i + 4, j + 4, j + 8, i + 8))  # 倒角面
    faces.append((8, 9, 10, 11))                    # 前平面
    faces.append((3, 2, 1, 0))                      # 背面
    return verts, faces, cols


def sweep_molding(y0, profile, seed=5):
    """三边合围线脚：路径 后左角→前左角→前右角→后右角，
    profile=[(out, dy)] 剖面沿外法线 out、竖向 dy 放样（斜接角）。"""
    rnd = random.Random(seed)
    base = 0.16
    path = [(-W / 2 - base + 0.1, -0.15), (-W / 2, FRONT_Z), (W / 2, FRONT_Z), (W / 2 + base - 0.1, -0.15)]
    # 每个路径点的外法线（斜接：段法线平均）
    normals = []
    segs = []
    for i in range(len(path) - 1):
        dx = path[i + 1][0] - path[i][0]
        dz = path[i + 1][1] - path[i][1]
        ln = math.hypot(dx, dz) or 1
        segs.append((dz / ln, -dx / ln))  # 左手外法线（路径逆时针 → 朝外）
    for i in range(len(path)):
        if i == 0:
            n = segs[0]
        elif i == len(path) - 1:
            n = segs[-1]
        else:
            nx = segs[i - 1][0] + segs[i][0]
            nz = segs[i - 1][1] + segs[i][1]
            ln = math.hypot(nx, nz) or 1
            n = (nx / ln, nz / ln)
        normals.append(n)
    verts = []
    faces = []
    cols = []
    np_ = len(profile)
    for pi, ((px, pz), (nx, nz)) in enumerate(zip(path, normals)):
        for (out, dy) in profile:
            verts.append((px + nx * out, y0 + dy, pz + nz * out))
            cols.append(wood_col(rnd, tone=0.92))
    for pi in range(len(path) - 1):
        for k in range(np_ - 1):
            a = pi * np_ + k
            b = a + 1
            faces.append((a, b, b + np_, a + np_))
    return verts, faces, cols


def label_frame(cx, cy, z, seed=7):
    """黄铜标签框：四边梃（斜接读感靠重叠盒即可）。"""
    rnd = random.Random(seed)
    t = 0.008
    d = 0.008
    w = 0.092
    h = 0.052
    items = [
        box(cx, cy + h / 2 - t / 2, z, w, t, d, lambda *a: brass_col(rnd)),
        box(cx, cy - h / 2 + t / 2, z, w, t, d, lambda *a: brass_col(rnd)),
        box(cx - w / 2 + t / 2, cy, z, t, h - 2 * t, d, lambda *a: brass_col(rnd)),
        box(cx + w / 2 - t / 2, cy, z, t, h - 2 * t, d, lambda *a: brass_col(rnd))
    ]
    return svlib.merge_pydata(items)


def bin_pull(cx, cy, z, radial=6, segs=7, seed=9):
    """弓形杯拉手：背板 + 弧管（双足落板、中腹外弓下垂）。"""
    rnd = random.Random(seed)
    items = [box(cx, cy, z - 0.004, 0.064, 0.026, 0.006,
                 lambda *a: brass_col(rnd, tarnish=0.3))]
    R = 0.026
    verts = []
    faces = []
    cols = []
    for j in range(segs + 1):
        t = j / segs
        ang = t * math.pi
        px = cx - math.cos(ang) * R
        py = cy - math.sin(ang) * R * 0.55
        pz = z + math.sin(ang) * 0.017
        r = 0.0052 * (1 + math.sin(ang) * 0.25)  # 中腹略粗
        for s in range(radial):
            b = s / radial * TAU
            verts.append((px + math.cos(b) * r * 0.8, py + math.sin(b) * r, pz + math.sin(b) * r * 0.4))
            cols.append(brass_col(rnd, tarnish=0.15 * (1 - math.sin(ang))))
    for j in range(segs):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    items.append((verts, faces, cols))
    return svlib.merge_pydata(items)


def slot_pos(idx):
    row, col = divmod(idx, COLS)
    return (COL_X0 + col * COL_DX, ROW_Y0 + row * ROW_DY)


# ---------- 柜体（wood） ----------
def build_wood(hi):
    rnd = random.Random(17)
    items = []
    # 侧板 / 背板 / 前脸板 / 顶底板
    for sx in (-1, 1):
        items.append(box(sx * (W / 2 + 0.02), 2.04, -0.012, 0.04, 3.76, 0.276,
                         lambda x, y, z: wood_col(rnd, tone=0.9)))
    items.append(box(0, 2.04, -0.146, W + 0.08, 3.76, 0.02, lambda *a: wood_col(rnd, tone=0.8)))
    items.append(box(0, 2.04, FRONT_Z - 0.012, W, 3.76, 0.024, lambda *a: wood_col(rnd, tone=0.72)))
    # 分件柱 ×3（把 8 列分成四组，柱面凸出前脸）
    for cx in (-0.7875, 0.0, 0.7875):
        items.append(box(cx, 2.04, FRONT_Z + 0.008, 0.05, 3.76, 0.028,
                         lambda x, y, z: wood_col(rnd, tone=0.95)))
        # 柱头/柱脚小方块（HI 细节：柱子有起止，不是通条）
        items.append(box(cx, 3.86, FRONT_Z + 0.014, 0.066, 0.07, 0.034, lambda *a: wood_col(rnd)))
        items.append(box(cx, 0.24, FRONT_Z + 0.014, 0.066, 0.07, 0.034, lambda *a: wood_col(rnd)))
    # 台座 / 顶檐线脚（三边合围成型剖面）
    plinth = [(0.055, 0.0), (0.055, 0.10), (0.032, 0.13), (0.028, 0.16)]
    cornice = [(0.024, 0.0), (0.030, 0.03), (0.052, 0.075), (0.058, 0.10), (0.058, 0.13)]
    if hi:  # HI：剖面加密（cove 曲线）
        plinth = [(0.055, 0.0), (0.055, 0.10), (0.048, 0.115), (0.038, 0.124), (0.032, 0.13), (0.028, 0.16)]
        cornice = [(0.024, 0.0), (0.026, 0.015), (0.030, 0.03), (0.038, 0.052),
                   (0.052, 0.075), (0.058, 0.10), (0.058, 0.13)]
    items.append(sweep_molding(0.0, plinth, seed=5))
    items.append(sweep_molding(3.92, cornice, seed=6))
    # 抽屉面板阵（119 只；LIVE 槽留空）+ 标签卡
    for idx in range(ROWS * COLS):
        if idx == LIVE:
            continue
        cx, cy = slot_pos(idx)
        r2 = random.Random(200 + idx)
        jout = r2.random() * 0.004 + (0.07 if idx in AJAR else 0.0)
        z = FRONT_Z + 0.012 + jout

        def front_col(x, y, z2, _cx=cx, _cy=cy, _r=r2):
            # 指痕磨损：拉手周围一圈略深，边缘微亮
            d2 = ((x - _cx) ** 2 + (y - (_cy - 0.052)) ** 2) / 0.004
            grime_ = math.exp(-d2) * 0.22
            edge = 0.06 if abs(x - _cx) > FRONT_W * 0.42 or abs(y - _cy) > FRONT_H * 0.42 else 0.0
            v = 0.98 + (_r.random() - 0.5) * 0.16 - grime_ + edge
            return (v, v * 0.96, v * 0.9)

        items.append(beveled_front(cx, cy, z, FRONT_W, FRONT_H, 0.024, 0.006, front_col))
        # 标签卡（黄铜框内的米色卡——顶点色只能压不能提，取米调上限）
        items.append(box(cx, cy + 0.038, z + 0.0015, 0.078, 0.038, 0.002,
                         lambda *a, _r=r2: (1.0, 0.97, 0.88 + (_r.random() - 0.5) * 0.06)))
    return svlib.merge_pydata(items)


# ---------- 黄铜件（brass） ----------
def build_brass(hi):
    items = []
    for idx in range(ROWS * COLS):
        if idx == LIVE:
            continue
        cx, cy = slot_pos(idx)
        jout = random.Random(200 + idx).random() * 0.004 + (0.07 if idx in AJAR else 0.0)
        z = FRONT_Z + 0.026 + jout
        items.append(label_frame(cx, cy + 0.038, z, seed=300 + idx))
        items.append(bin_pull(cx, cy - 0.052, z, radial=8 if hi else 5,
                              segs=10 if hi else 6, seed=400 + idx))
    return svlib.merge_pydata(items)


# ---------- 可动抽屉（drawer / drawerBrass）：局部原点 = 关合位面板中心 ----------
def build_drawer(hi):
    rnd = random.Random(88)
    D = 0.24  # 屉深
    items = [beveled_front(0, 0, 0.012, FRONT_W, FRONT_H, 0.024, 0.006,
                           lambda x, y, z: wood_col(rnd, wear=0.1))]
    wall = 0.012
    iw = FRONT_W - 0.03
    ih = FRONT_H - 0.05
    items.append(box(0, -ih / 2 + wall / 2, -D / 2, iw, wall, D, lambda *a: wood_col(rnd, tone=0.95)))       # 底
    items.append(box(-iw / 2 + wall / 2, 0, -D / 2, wall, ih, D, lambda *a: wood_col(rnd, tone=0.95)))       # 左壁
    items.append(box(iw / 2 - wall / 2, 0, -D / 2, wall, ih, D, lambda *a: wood_col(rnd, tone=0.95)))        # 右壁
    items.append(box(0, 0, -D + wall / 2, iw, ih, wall, lambda *a: wood_col(rnd, tone=0.95)))                # 屉尾
    # 一叠索引卡：立插、明显高出屉沿、前后错斜（卡片目录的正确读感）
    n_cards = 26 if hi else 14
    for i in range(n_cards):
        zc = -0.035 - (i / n_cards) * (D - 0.07)
        lean = (rnd.random() - 0.5) * 0.3           # 前后倾（贴着排堆）
        ch = 0.155 + rnd.random() * 0.02            # 高出屉沿 ~0.05
        v = 1.0 - rnd.random() * 0.12
        cv, cf, cc = box(0, -ih / 2 + wall + ch / 2, zc, iw - 0.05, ch, 0.0035,
                         lambda *a, _v=v: (_v, _v * 0.97, _v * 0.88))
        cv = [(x, y, z + (y + ih / 2 - wall) * lean * 0.22) for (x, y, z) in cv]
        items.append((cv, cf, cc))
    # 中间一张翘起的卡：斜倚在排堆上（谁翻到一半没插回去）
    pv, pf, pc = box(0.02, -ih / 2 + wall + 0.095, -0.1, iw - 0.08, 0.19, 0.003,
                     lambda *a: (1.0, 0.98, 0.9))
    pv = [(x, y, z + (y + ih / 2 - wall) * 0.42) for (x, y, z) in pv]
    items.append((pv, pf, pc))
    return svlib.merge_pydata(items)


def build_drawer_brass(hi):
    items = [label_frame(0, 0.038, 0.026, seed=500),
             bin_pull(0, -0.052, 0.026, radial=8 if hi else 5, segs=10 if hi else 6, seed=501)]
    return svlib.merge_pydata(items)


def build_all(detail):
    hi = detail == 'hi'
    return {
        'wood': build_wood(hi),
        'brass': build_brass(hi),
        'drawer': build_drawer(hi),
        'drawerBrass': build_drawer_brass(hi)
    }


def main():
    svlib.reset_scene()
    woodm = svlib.vcol_material('wood', roughness=0.6, base=(0.16, 0.104, 0.056))
    brassm = svlib.vcol_material('brass', roughness=0.32, metallic=0.9, base=(0.55, 0.4, 0.16))
    mat_of = {'wood': woodm, 'brass': brassm, 'drawer': woodm, 'drawerBrass': brassm}

    # ---- HI 细模（可动抽屉摆到 LIVE 槽位、拉开 0.24 展示） ----
    hi_parts = build_all('hi')
    lx, ly = slot_pos(LIVE)
    for name, (v, f, c) in hi_parts.items():
        ob = svlib.mesh_object(f'hi_{name}', v, f, c)
        ob.data.materials.append(mat_of[name])
        svlib.smooth(ob, angle=0.7)
        ob.rotation_euler = (math.pi / 2, 0, 0)
        if name in ('drawer', 'drawerBrass'):
            ob.location = (lx, -(FRONT_Z + 0.012 + 0.24), ly)  # Y-up z → Blender -y
        else:
            ob.location = (0, 0, 0)

    # ---- GAME 档（右侧同框对比 + 导出） ----
    game_parts = build_all('game')
    game_obs = {}
    for name, (v, f, c) in game_parts.items():
        ob = svlib.mesh_object(f'game_{name}', v, f, c)
        ob.data.materials.append(mat_of[name])
        svlib.smooth(ob, angle=0.7)
        ob.rotation_euler = (math.pi / 2, 0, 0)
        if name in ('drawer', 'drawerBrass'):
            ob.location = (lx + W + 0.6, -(FRONT_Z + 0.012 + 0.24), ly)
        else:
            ob.location = (W + 0.6, 0, 0)
        game_obs[name] = ob

    # ---- 档案廊式灯位：冷荧光顶洗 + 暖点光（黄铜捡高光） ----
    svlib.add_light('AREA', (-1.2, -3.2, 4.6), 420, color=(0.85, 0.9, 1.0), size=5, target=(0.8, 0, 2.0))
    svlib.add_light('POINT', (1.2, -2.0, 1.2), 50, color=(1.0, 0.75, 0.4))

    svlib.render_views('cabinet', [
        ((0.2, -5.6, 1.9), (0.6, 0, 2.0), 38),        # 双柜同框全景
        ((lx + 0.5, -1.15, ly + 0.42), (lx, -0.18, ly + 0.05), 40),  # 拉开抽屉特写（索引卡）
        ((-0.9, -0.85, 1.06), (-1.18, 0.05, 1.28), 50)  # 拉手/标签框近景
    ], samples=40)

    svlib.export_parts('cabinet', game_obs,
                       note='局部坐标 Y-up 正面朝 +Z；drawer/drawerBrass 原点在关合位面板中心，'
                           f'LIVE 槽位 row{LIVE // COLS}/col{LIVE % COLS} 局部 ({lx:.3f},{ly:.3f})')
    svlib.save_blend('cabinet')
    for name, ob in game_obs.items():
        print(f'[gen_cabinet] game {name}: {len(ob.data.vertices)} verts / {len(ob.data.polygons)} polys')


main()
