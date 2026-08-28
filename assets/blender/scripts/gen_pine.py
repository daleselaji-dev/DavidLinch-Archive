# ============================================================
# gen_pine — 双峰黑松权威细模（Blender 4.1.1 headless）。
#
# 同一组确定性参数（seed 派生的层高/枝角/垂弧/参差）生成三档：
#   HI        细模：真实逐枝垂坠针叶簇（每层 8–12 枝，每枝主簇+两梢簇
#             + 逐顶点噪声位移），树皮竖棱/根盘裙脚/枯枝桩，≈5–8 万三角
#   GAME hero 游戏近景档：瓣裂裙锥（瓣位对齐 HI 的枝角）+ 垂缘 + 枝桩
#   GAME far  游戏远景档：低段数同族形体
# 顶点色：冠芯近黑 → 枝梢冷月光绿；树皮棕黑竖纹；冠底自遮蔽压暗。
#
# 运行：blender -b -P gen_pine.py
# 产物：blends/pine.blend / renders/pine-*.png / exports/pine.json
# ============================================================
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import svlib  # noqa: E402

TAU = math.tau
H = 4.8  # 总高（three.js 侧等比缩放）


# ---------- 共享参数：一棵树的「基因」 ----------
def pine_params(seed=41):
    rnd = random.Random(seed)
    tiers = []
    n_tiers = 7
    for ti in range(n_tiers):
        u = ti / (n_tiers - 1)
        y = H * (0.26 + 0.60 * u)
        radius = (1.52 - 1.18 * u) * (1 + (rnd.random() - 0.5) * 0.12)
        n_br = max(4, round(11 - 6.5 * u))
        base_a = rnd.random() * TAU
        branches = []
        for i in range(n_br):
            a = base_a + (i / n_br) * TAU + (rnd.random() - 0.5) * 0.5
            ln = radius * (0.86 + rnd.random() * 0.3)
            droop = 0.32 + rnd.random() * 0.26         # 垂弧（压着雪的松枝）
            tipup = 0.10 + rnd.random() * 0.12         # 梢端上翘
            fat = 0.30 + rnd.random() * 0.14           # 簇厚
            branches.append({'a': a, 'len': ln, 'droop': droop, 'tipup': tipup, 'fat': fat})
        tiers.append({'y': y, 'r': radius, 'branches': branches, 'u': u,
                      'phase': rnd.random() * TAU})
    stubs = []
    for _ in range(4):
        stubs.append({'a': rnd.random() * TAU, 'y': H * (0.22 + rnd.random() * 0.14),
                      'len': 0.3 + rnd.random() * 0.32, 'tilt': 0.5 + rnd.random() * 0.3})
    return {'tiers': tiers, 'stubs': stubs, 'flare_phase': rnd.random() * TAU,
            'bark_phase': rnd.random() * TAU}


# ---------- 颜色 ----------
def bark_col(x, y, z, ph):
    v = 0.8 + math.sin(y * 9.1 + x * 21 + ph) * 0.14 + math.sin(y * 31 + z * 17) * 0.05
    return (0.11 * v, 0.078 * v, 0.05 * v)


def needle_col(d, shade, under=1.0):
    """d = 0 冠芯 → 1 梢端；shade 层暗系数；under<1 冠底压暗。
    v1.8b 整体再压 0.62：游戏档平滑法线朝上比程序化多面锥受月光多，
    反照率补偿回「黑松要黑」的夜色基调（对照 v1.7 截屏像素校准）。"""
    k = 0.62 * shade * under
    return ((0.014 + d * 0.030) * k,
            (0.034 + d * 0.060) * k,
            (0.023 + d * 0.044) * k)


# ---------- 树干（HI / GAME 同函数，段数不同） ----------
def build_trunk(P, radial, rings, noise=0.0):
    rnd = random.Random(9001)
    verts = []
    faces = []
    cols = []
    trunk_h = H * 0.97
    for j in range(rings + 1):
        v = j / rings
        y = v * trunk_h
        r = 0.05 + (1 - v) * 0.125
        flare = max(0.0, (0.6 - y)) * 1.1 if y < 0.6 else 0.0
        for s in range(radial):
            a = s / radial * TAU
            bark = 1 + math.sin(a * 7 + y * 2.1 + P['bark_phase']) * 0.07 \
                     + math.sin(a * 17 + P['bark_phase'] * 2) * 0.03
            fl = 1 + flare * (1.0 + math.sin(a * 3 + P['flare_phase']) * 0.5)
            rr = r * bark * fl
            if noise:
                rr *= 1 + (rnd.random() - 0.5) * noise
            x = math.cos(a) * rr
            z = math.sin(a) * rr
            verts.append((x, y, z))
            cols.append(bark_col(x, y, z, P['bark_phase']))
    for j in range(rings):
        for s in range(radial):
            a = j * radial + s
            b = j * radial + (s + 1) % radial
            faces.append((a, b, b + radial, a + radial))
    # 顶封口
    top0 = rings * radial
    verts.append((0.0, trunk_h, 0.0))
    cols.append(bark_col(0, trunk_h, 0, P['bark_phase']))
    for s in range(radial):
        faces.append((len(verts) - 1, top0 + s, top0 + (s + 1) % radial))
    return verts, faces, cols


def build_stub(st, radial=7):
    """冠下枯枝桩。"""
    verts = []
    faces = []
    cols = []
    ca, sa = math.cos(st['a']), math.sin(st['a'])
    rings = 4
    for j in range(rings + 1):
        v = j / rings
        r = 0.032 * (1 - v * 0.72)
        along = st['len'] * v
        yy = st['y'] + along * st['tilt'] * -0.35 + 0.06
        for s in range(radial):
            b = s / radial * TAU
            # 局部圆截面，沿 (ca,sa) 方向伸出
            ox = math.cos(b) * r
            oy = math.sin(b) * r
            verts.append((ca * (0.09 + along) - sa * ox, yy + oy, sa * (0.09 + along) + ca * ox))
            cols.append((0.08, 0.058, 0.038))
    for j in range(rings):
        for s in range(radial):
            a = j * radial + s
            b = j * radial + (s + 1) % radial
            faces.append((a, b, b + radial, a + radial))
    return verts, faces, cols


# ---------- HI：逐枝针叶簇 ----------
def branch_clump(tier, br, sub=1.0, a_off=0.0, l_off=0.0, seed=7):
    """一根松枝的针叶簇：沿枝轴的扁椭圆管，逐环收细，
    垂弧 + 梢端上翘 + 逐顶点噪声「针毛」位移。sub<1 为梢部小簇。"""
    rnd = random.Random(seed)
    radial = 12
    rings = 12
    verts = []
    faces = []
    cols = []
    a = br['a'] + a_off
    ca, sa = math.cos(a), math.sin(a)
    ln = br['len'] * sub
    root_r = 0.035
    fat = br['fat'] * sub
    shade = 0.70 + tier['u'] * 0.30
    for j in range(rings + 1):
        v = j / rings
        # 簇厚剖面：根细 → 中腹最厚 → 梢尖
        thick = fat * (0.22 + math.sin(min(1.0, v * 1.12) * math.pi) * 0.82)
        along = 0.10 + l_off + ln * v
        droop = math.sin(v * math.pi * 0.62) * br['droop'] * ln
        tip = (v ** 2.2) * br['tipup'] * ln
        yy = tier['y'] - droop + tip
        for s in range(radial):
            b = s / radial * TAU
            ox = math.cos(b) * thick * 0.9
            oy = math.sin(b) * thick * 0.55  # 扁簇（松枝是横铺的）
            # 针毛噪声：越靠簇缘越乱
            jag = 1 + (rnd.random() - 0.5) * 0.5 * (0.3 + v * 0.7)
            px = ca * along - sa * ox * jag
            pz = sa * along + ca * ox * jag
            py = yy + oy * jag - abs(ox) * 0.22  # 簇缘往下披
            verts.append((px, py, pz))
            d = min(1.0, (along / (ln + 0.12)) * 0.72 + abs(math.sin(b)) * 0.16 + rnd.random() * 0.18)
            under = 0.34 if math.sin(b) < -0.45 else 1.0  # 簇底自遮蔽
            cols.append(needle_col(d, shade, under))
    for j in range(rings):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    # 梢尖封口（与末环同一轴线位置，再向外探出一点尖）
    tipc = len(verts)
    v_along = 0.10 + l_off + ln * 1.045
    tip_y = tier['y'] - math.sin(math.pi * 0.62) * br['droop'] * ln + br['tipup'] * ln
    verts.append((ca * v_along, tip_y, sa * v_along))
    cols.append(needle_col(1.0, shade))
    last0 = rings * radial
    for s in range(radial):
        faces.append((tipc, last0 + s, last0 + (s + 1) % radial))
    return verts, faces, cols


def crown_spire(P, radial=12, rings=8, seed=77, jag_amp=0.42):
    """树梢：绕干轴的立锥针叶收顶（HI 高段数；GAME 低段数同族——
    v1.9 起 GAME 档也收顶，游戏内近看树顶不再是一根秃杆）。"""
    rnd = random.Random(seed)
    verts = []
    faces = []
    cols = []
    y0 = H * 0.82
    y1 = H * 1.03
    for j in range(rings + 1):
        v = j / rings
        y = y0 + (y1 - y0) * v
        r = 0.30 * (1 - v) ** 1.15 + 0.012
        for s in range(radial):
            a = s / radial * TAU
            jag = 1 + (rnd.random() - 0.5) * jag_amp + math.sin(a * 5 + v * 9) * 0.12
            # 缘梢下披
            dy = -abs(math.sin(a * 3 + v * 7)) * 0.05 * (1 - v)
            verts.append((math.cos(a) * r * jag, y + dy, math.sin(a) * r * jag))
            cols.append(needle_col(min(1.0, (1 - v) * 0.5 + rnd.random() * 0.25), 1.0))
    for j in range(rings):
        for s in range(radial):
            p = j * radial + s
            q = j * radial + (s + 1) % radial
            faces.append((p, q, q + radial, p + radial))
    tipc = len(verts)
    verts.append((0.0, y1 + 0.05, 0.0))
    cols.append(needle_col(1.0, 1.0))
    last0 = rings * radial
    for s in range(radial):
        faces.append((tipc, last0 + s, last0 + (s + 1) % radial))
    return verts, faces, cols


def build_hi(P):
    items = [build_trunk(P, radial=28, rings=46, noise=0.05)]
    for st in P['stubs']:
        items.append(build_stub(st, radial=9))
    seed = 100
    for tier in P['tiers']:
        for br in tier['branches']:
            items.append(branch_clump(tier, br, seed=seed))
            seed += 1
            # 两梢小簇（细模层次：主簇之上错角补簇）
            items.append(branch_clump(tier, br, sub=0.55, a_off=0.16, l_off=br['len'] * 0.30, seed=seed))
            seed += 1
            items.append(branch_clump(tier, br, sub=0.42, a_off=-0.14, l_off=br['len'] * 0.52, seed=seed))
            seed += 1
    # 树梢冠尖：绕干立锥收顶
    items.append(crown_spire(P))
    return svlib.merge_pydata(items)


# ---------- GAME：瓣裂裙锥（瓣位对齐 HI 枝角） ----------
def build_game(P, radial=18, rims=3, with_stubs=True, with_caps=True):
    items = [build_trunk(P, radial=9 if with_stubs else 7, rings=5 if with_stubs else 3)]
    if with_stubs:
        for st in P['stubs'][:3]:
            items.append(build_stub(st, radial=5))
    for tier in P['tiers']:
        verts = []
        faces = []
        cols = []
        shade = 0.70 + tier['u'] * 0.30
        # v1.8c 层高收短（1.35→1.05 系）：层与层之间拉开黑缝——
        # v1.7 分层锥「亮层/暗层交替 + 层间露黑」的剪影是黑森林的签名，
        # 连续裙锥会把整树读成一片受月光的灰罩
        tier_h = 1.05 - tier['u'] * 0.4
        y_top = tier['y'] + tier_h * 0.55
        # 枝角 → 角向瓣包络（游戏档的裙缘参差不再是纯正弦，而是 HI 枝位投影：
        # 每根枝在对应角向顶出一瓣，瓣间深收——低模轮廓继承细模的枝相）
        def lobe(a):
            best = 0.0
            for br in tier['branches']:
                d = math.atan2(math.sin(a - br['a']), math.cos(a - br['a']))
                k = math.cos(min(abs(d) * (2.6 - br['fat'] * 1.2), math.pi / 2))
                best = max(best, (k ** 1.4) * (br['len'] / tier['r']))
            return 0.60 + best * 0.58
        rim_y = []      # 裙缘逐角向 y（唇带/盖片贴着缘走）
        rim_r = []
        for j in range(rims + 1):
            v = j / rims  # 0 顶 → 1 裙缘
            for s in range(radial):
                a = s / radial * TAU
                lb = lobe(a)
                r = tier['r'] * v * lb
                # 瓣缘各自垂坠（瓣大垂深），瓣间上收——裙缘读成一圈枝，不是一顶帽
                droop = (v ** 1.15) * (0.30 + 0.34 * lb) * tier_h
                jag = math.sin(a * 9 + tier['phase']) * 0.05 * v
                y = y_top - v * tier_h * 0.62 - droop + jag
                verts.append((math.cos(a) * r, y, math.sin(a) * r))
                d = min(1.0, v * lb)
                cols.append(needle_col(d, shade))
                if j == rims:
                    rim_y.append(y)
                    rim_r.append(r)
        for j in range(rims):
            for s in range(radial):
                p = j * radial + s
                q = j * radial + (s + 1) % radial
                faces.append((p, q, q + radial, p + radial))
        # 裙缘唇带（v1.8c）：缘环再向下内收一圈——法线朝外下、
        # 顶点色压到四成，月光照不进：每层裙底一圈暗带，
        # 复现 v1.7 分层锥「亮暗交替」的层积剪影
        rim0 = rims * radial
        lip0 = len(verts)
        for s in range(radial):
            a = s / radial * TAU
            verts.append((math.cos(a) * rim_r[s] * 0.90, rim_y[s] - 0.17 * tier_h,
                          math.sin(a) * rim_r[s] * 0.90))
            cols.append(needle_col(0.25, shade, under=0.4))
        for s in range(radial):
            faces.append((rim0 + s, rim0 + (s + 1) % radial,
                          lip0 + (s + 1) % radial, lip0 + s))
        # 裙底盖片（自遮蔽压暗色）：唇带 → 干芯回收。
        # 只给低层挂盖（u<0.45，玩家只会钻到低层树冠下），高层省三角
        if not (with_caps and tier['u'] < 0.45):
            items.append((verts, faces, cols))
            continue
        base = len(verts)
        for s in range(radial):
            a = s / radial * TAU
            verts.append((math.cos(a) * rim_r[s] * 0.86, rim_y[s] - 0.17 * tier_h - 0.02,
                          math.sin(a) * rim_r[s] * 0.86))
            cols.append(needle_col(0.2, shade, under=0.3))
        centre = len(verts)
        verts.append((0.0, y_top - tier_h * 0.60, 0.0))
        cols.append(needle_col(0.0, shade, under=0.3))
        for s in range(radial):
            faces.append((lip0 + s, lip0 + (s + 1) % radial, base + (s + 1) % radial, base + s))
            faces.append((centre, base + (s + 1) % radial, base + s))
        items.append((verts, faces, cols))
    # 树梢针叶收顶（低段数同族；远景档一环锥即可——预算 ≤450）
    items.append(crown_spire(P, radial=8 if with_caps else 5, rings=3 if with_caps else 1,
                             seed=77, jag_amp=0.3))
    return svlib.merge_pydata(items)


def main():
    svlib.reset_scene()
    P = pine_params(seed=41)

    # ---- HI 细模 ----
    hv, hf, hc = build_hi(P)
    hi = svlib.mesh_object('pine_hi', hv, hf, hc)
    hi.data.materials.append(svlib.vcol_material('pine', roughness=0.94))
    svlib.smooth(hi, angle=1.1)
    hi.rotation_euler = (math.pi / 2, 0, 0)  # Y-up 数据 → Blender Z-up 摆正渲染

    # ---- GAME hero / far ----
    gv, gf, gc = build_game(P, radial=14, rims=2, with_stubs=True)
    hero = svlib.mesh_object('pine_hero', gv, gf, gc)
    hero.data.materials.append(svlib.vcol_material('pineg', roughness=0.94))
    svlib.smooth(hero, angle=1.1)
    hero.rotation_euler = (math.pi / 2, 0, 0)
    hero.location = (7.5, 0, 0)

    fP = pine_params(seed=42)
    fv, ff, fc = build_game(fP, radial=9, rims=2, with_stubs=False, with_caps=False)
    far = svlib.mesh_object('pine_far', fv, ff, fc)
    far.data.materials.append(svlib.vcol_material('pinef', roughness=0.94))
    svlib.smooth(far, angle=1.1)
    far.rotation_euler = (math.pi / 2, 0, 0)
    far.location = (12.5, 0, 0)

    # ---- 夜景灯位：冷月背光 + 弱补光（贴近游戏内月夜） ----
    svlib.add_light('SUN', (6, -14, 16), 1.6, color=(0.62, 0.74, 0.9), target=(0, 0, 2.4))
    svlib.add_light('AREA', (-7, -7, 3.2), 260, color=(0.75, 0.82, 1.0), size=6, target=(0, 0, 2.2))

    # ---- 渲染自检：HI 全身 / HI 近景钻冠底 / 三棵同框对比 ----
    svlib.render_views('pine', [
        ((0.2, -10.5, 3.1), (0, 0, 2.6), 50),
        ((1.6, -3.4, 1.1), (0.3, 0, 2.0), 32),
        ((10.0, -13.5, 3.4), (7.2, 0, 2.5), 46)
    ], samples=40)

    svlib.export_parts('pine', {'hero': hero, 'far': far},
                       note='blends/pine.blend 为权威细模源；hero/far 为同参数游戏档')
    svlib.save_blend('pine')

    # 统计
    for ob in (hi, hero, far):
        me = ob.data
        print(f'[gen_pine] {ob.name}: {len(me.vertices)} verts / {len(me.polygons)} polys')


main()
