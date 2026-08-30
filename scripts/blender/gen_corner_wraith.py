# ============================================================
# gen_corner_wraith.py — 「拐角魅影」.blend 生成（Blender 4.1.1 headless）
#
# 形体语言：车削主身（裙裾→收腰→驼峰背→缩颈→垂首）、前倾佝偻、
# 错相位破披、裙裾破布条、过长垂臂 + 长指、披垂发帘（前脸开口）+
# 成绺长发、面部空洞 + 眼窝空洞 ×2。抽象无面目：无鼻无嘴无瞳无脸皮
# ——致敬林奇魅影的剪影语言，非任何角色的肖像复刻。
#
# 精修 loop 三阶段（--stage 参数）：
#   block  占位比例架：五个 primitive 立出剪影比例（高 2.35m）
#   mid    中模：车削主身 + 布褶 + 驼峰/佝偻非对称 + 垂臂 + 破披
#   fine   精修：+ 发帘/长发 + 破布条 + 眼窝 + 噪声布纹 + 材质
#
# v1.22 第二轮回炉（三档五拍，用户口径「眼睛很好，其他都要改」——
# 眼组参数一字不动，其余全部重塑）：
#   拍 1  基线诊断（v1.13 定稿四机位重读）：发帘读成蘑菇罩、绺束
#         从帘后戳出如管风琴（宽头高过帘背）、身形软钟毫无枯瘦、
#         头顶巫师帽尖、双臂外八如蜘蛛腿、体色偏亮偏蓝像绒毯
#   拍 2  剖面/材质大改：主身收瘦（胸腰颈全窄一档 + 冠顶降 0.015H
#         杀帽尖）、驼峰加深加双结 + 左右肩线歪斜、上身前佝偻场、
#         发帘从「罩」改「披」（垂到 -0.45H、竖绺沟槽加深）、绺束
#         宽头埋进帘身（挂点 ≤+0.03H）、垂臂收拢贴身加长（左臂
#         比右臂长——错拍不对称）、指骨加长带屈、体色压进黑里
#   拍 3  渲染对照修正（见各段行注）
#   拍 4  近景面部修正（见各段行注）
#   拍 5  定稿复核 + 导出（inspect 账目见 README）
#
# 用法（无显示环境）：
#   blender -b --factory-startup --python scripts/blender/gen_corner_wraith.py \
#     -- --stage fine --out assets/blender/corner_wraith.blend
# ============================================================
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset_scene, make_material, save_blend, args_after_dashes

H = 2.35  # 与运行时 cornerWraith(height=2.35) 一致

# 车削剖面（r, y）——v1.22 拍 2 收瘦：胸/腰/颈全窄一档（软钟形→
# 枯瘦），冠顶从 1.0 降到 0.985 且末段收急（巫师帽尖退役——头顶
# 是被发帘盖住的小圆冠，不是尖）
BODY_PROFILE = [
    (0.34, 0.0), (0.335, 0.02), (0.30, 0.09), (0.245, 0.22), (0.195, 0.36),
    (0.16, 0.5), (0.145, 0.58), (0.168, 0.68), (0.185, 0.76), (0.15, 0.80),
    (0.085, 0.83), (0.062, 0.85), (0.092, 0.885), (0.10, 0.93),
    (0.06, 0.968), (0.001, 0.985)
]

# 发帘剖面 + 前脸开口半角。v1.22 拍 2：从「罩」改「披」——去掉
# 蘑菇肩肚（0.16→0.14 收），下摆一路披到 -0.45H（盖过肩胛与胸口），
# 半径缓张（垂布，不是伞）
HAIR_PROFILE = [
    (0.028, 0.16), (0.09, 0.13), (0.14, 0.075), (0.175, 0.0),
    (0.19, -0.09), (0.20, -0.20), (0.215, -0.33), (0.225, -0.45)
]
OPEN_HALF = math.pi * 0.21

# v1.22 拍 2：破披随主身收瘦同步收窄一档，盖肩线略降
CAPE_PROFILE = [
    (0.215, 0.55), (0.24, 0.62), (0.25, 0.68), (0.235, 0.74),
    (0.19, 0.79), (0.115, 0.822), (0.08, 0.845)
]


def seeded(seed):
    """mulberry32 —— 与 kit.js rng 同族的确定性序列。"""
    state = [seed >> 0]

    def next_f():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = state[0]
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return next_f


def lathe(name, profile, segments=48, arc=math.pi * 2, start=0.0, scale=1.0):
    """
    车削：剖面 (r, y) 绕 Z 轴旋成面（Blender Z-up：y→z）。
    arc < 2π 时留开口（发帘前脸开口用），开口以 +Y（正面）为中线。
    """
    bm = bmesh.new()
    prev = None
    for r, y in profile:
        phi = start
        v = bm.verts.new((r * scale * math.sin(phi), r * scale * math.cos(phi), y * scale))
        if prev is not None:
            bm.edges.new((prev, v))
        prev = v
    full = arc >= math.pi * 2 - 1e-6
    bmesh.ops.spin(
        bm, geom=bm.verts[:] + bm.edges[:],
        cent=(0, 0, 0), axis=(0, 0, 1),
        angle=arc, steps=segments, use_merge=full)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for f in mesh.polygons:
        f.use_smooth = True
    return obj


def displace_body(obj, fine=False):
    """布褶 + 驼峰/佝偻非对称位移场。
    v1.22 拍 2：
      · 竖褶加深（0.07/0.048 → 0.09/0.06）——枯瘦的布贴着骨走；
      · 驼峰加深（0.055H → 0.075H）+ 峰上叠第二结（u≈0.78 小结，
        0.03H）——背不是一个光滑鼓包，是两节隆起；
      · 肩线歪斜：u≈0.77 高斯带内按 x 侧写高低（左肩抬右肩塌
        ±0.028H）——最不对劲的一度从「歪」升级成「斜」；
      · 上身前佝偻场：u>0.45 起向 +Y（正面）渐进推 0.055H——
        它不是站直了歪头，是整个上身塌向你。
    拍 4（近景渲染账）：佝偻场首版推到头顶——头冠向 +Y 出走
    0.13m，从发帘前脸开口里钻出来把面部空洞/眼组全部挡死（正面
    四机位一颗灰头，「眼睛很好」直接歼灭）。佝偻场加颈上淡出
    （u>0.80 线性归零）——塌的是胸肩，头留在帘内眼组对齐位。"""
    for v in obj.data.vertices:
        x, y, z = v.co
        r = math.hypot(x, y)
        u = z / H
        if r > 1e-4:
            a = math.atan2(y, x)
            fall = max(0.0, 1 - u / 0.72)
            fold = 1 + math.sin(a * 8 + 0.7) * 0.09 * fall + math.sin(a * 3 + 2.1) * 0.06 * fall
            if fine:
                # 近景布纹：两倍频细褶 + 3D 噪声破除车削的机械感
                fold += math.sin(a * 19 + z * 4.0) * 0.014 * fall
                fold += (noise.noise(Vector((x * 6, y * 6, z * 3))) - 0.0) * 0.022 * fall
            x *= fold
            y *= fold
        hump_b = math.exp(-((u - 0.70) / 0.09) ** 2)
        hump_2 = math.exp(-((u - 0.79) / 0.045) ** 2)
        head_f = math.exp(-((u - 0.94) / 0.07) ** 2)
        shoulder = math.exp(-((u - 0.77) / 0.06) ** 2)
        stoop = min(1.0, max(0.0, (u - 0.45) / 0.45))
        stoop *= 1.0 - min(1.0, max(0.0, (u - 0.80) / 0.10))
        y = y - hump_b * H * 0.075 - hump_2 * H * 0.03 \
            + head_f * H * 0.045 + stoop * stoop * H * 0.055
        z = z - head_f * H * 0.02 + shoulder * (x / (0.2 * H)) * H * 0.028
        v.co = (x, y, z)


def displace_hem(obj, seed, amp, below_z, harmonics):
    """下摆参差撕口 + 绺/褶条起伏（发帘与破披共用）。"""
    rnd = seeded(seed)
    tear = [rnd() * amp + (rnd() * amp * 0.9 if i % 4 == 0 else 0) for i in range(41)]
    for v in obj.data.vertices:
        x, y, z = v.co
        r = math.hypot(x, y)
        if r < 1e-4:
            continue
        a = math.atan2(x, y)
        k = 1.0
        for freq, amt, ph in harmonics:
            k += amt * math.sin((a + z * 0.17) * freq + ph)
        x *= k
        y *= k
        if z < below_z:
            idx = min(40, int(((a + math.pi) / (math.pi * 2)) * 40))
            z += tear[idx] * H
        v.co = (x, y, z)


def add_cone(bm_target, radius, length, loc, rot, segments=5):
    """收尖锥（尖朝下）写进目标 bmesh——破布条/发绺/手指共用。

    第 3 拍修正：Blender create_cone 的 radius1 在底面（-z）——
    首两拍所有绺条/布条「尖朝上」戳成王冠。翻转 z 恢复
    「宽头在上、发梢收尖朝下」（对应 Three 版 rotateX(π)）。
    """
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, segments=segments,
        radius1=radius, radius2=0.001, depth=length)
    import mathutils
    eul = mathutils.Euler(rot, 'XYZ')
    for v in bm.verts:
        v.co.z = -v.co.z          # 尖(+z)翻到下
        v.co.z -= length / 2      # 宽头对齐挂点
        v.co.rotate(eul)
        v.co += Vector(loc)
    mesh_tmp = bpy.data.meshes.new('_cone_tmp')
    bm.to_mesh(mesh_tmp)
    bm.free()
    bm_target.from_mesh(mesh_tmp)
    bpy.data.meshes.remove(mesh_tmp)


def cones_object(name, cones, segments=5):
    """一组锥合并为单 mesh 对象。cones: [(radius, length, loc, rot)]"""
    bm = bmesh.new()
    for radius, length, loc, rot in cones:
        add_cone(bm, radius, length, loc, rot, segments)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for f in mesh.polygons:
        f.use_smooth = True
    return obj


def build_block():
    """占位比例架：剪影三大块（裙锥/躯干/兜帽头）+ 双臂柱。"""
    mat = make_material('blockMat', (0.02, 0.018, 0.024, 1), roughness=0.9)
    objs = []

    def prim(name, op, loc, scale, **kw):
        op(location=loc, **kw)
        o = bpy.context.active_object
        o.name = name
        o.scale = scale
        o.data.materials.append(mat)
        objs.append(o)
        return o

    prim('skirt', bpy.ops.mesh.primitive_cone_add, (0, 0, H * 0.29),
         (1, 1, 1), radius1=H * 0.18, radius2=H * 0.08, depth=H * 0.58, vertices=24)
    prim('torso', bpy.ops.mesh.primitive_cylinder_add, (0, -0.02, H * 0.71),
         (1, 1.18, 1), radius=H * 0.095, depth=H * 0.26, vertices=20)
    prim('hood', bpy.ops.mesh.primitive_uv_sphere_add, (0, 0.04, H * 0.915),
         (0.9, 0.95, 1.15), radius=H * 0.062, segments=20, ring_count=14)
    for side in (-1, 1):
        prim(f'arm_{"L" if side < 0 else "R"}',
             bpy.ops.mesh.primitive_cylinder_add,
             (side * H * 0.125, 0.01, H * 0.47),
             (1, 1, 1), radius=0.032, depth=H * 0.62, vertices=10)
    return objs


def build_arms(mat):
    """过长垂臂 ×2。
    v1.22 拍 2：外八蜘蛛腿收拢——上段外撇从 0.16 收到 0.055（臂贴着
    身子挂下来，不是撑出去）；下段加长（0.32H → 0.335H）；左臂比
    右臂再长 0.02H（错拍不对称——两只手不一样长的剪影比对称更不
    对劲）；指骨加长带屈（0.19/0.27/0.21 → 0.22/0.30/0.24，指根向
    掌心微收）。拍 3（INSPECT 账）：首版 0.36H+0.03H+0.33 指让
    bbox_min z 掉到 -0.077（指尖穿地 7.7cm）——下段/指骨双收口，
    尖端离地回到 ≥2cm（v1.13 拍 1 立的老账，本轮差点再欠）。"""
    arms = []
    for side in (-1, 1):
        up_len = H * 0.3
        lo_len = H * (0.335 + (0.02 if side < 0 else 0.0))
        bm = bmesh.new()

        def seg(r_top, r_bot, length, loc, tilt):
            b2 = bmesh.new()
            bmesh.ops.create_cone(b2, cap_ends=True, segments=10,
                                  radius1=r_top, radius2=r_bot, depth=length)
            import mathutils
            eul = mathutils.Euler(tilt, 'XYZ')
            for v in b2.verts:
                v.co.z -= length / 2
                v.co.rotate(eul)
                v.co += Vector(loc)
            tmp = bpy.data.meshes.new('_seg_tmp')
            b2.to_mesh(tmp)
            b2.free()
            bm.from_mesh(tmp)
            bpy.data.meshes.remove(tmp)

        # 肩点为局部原点；上段微撇、下段直垂微屈
        seg(0.028, 0.04, up_len, (0, 0, 0), (0.12, side * -0.055, 0))
        lo_root = (side * up_len * 0.055, up_len * 0.12, -up_len * 0.98)
        seg(0.02, 0.028, lo_len, lo_root, (-0.04, side * 0.04, 0))
        # 三指（拍 3：指根扇距 0.03→0.024 收窄——爪要拢，不要叉）
        wx = side * up_len * 0.075
        wy = up_len * 0.1
        wz = -up_len * 0.98 - lo_len * 0.99
        for fi, fl in ((-1, 0.22), (0, 0.30), (1, 0.24)):
            b2 = bmesh.new()
            bmesh.ops.create_cone(b2, cap_ends=True, segments=5,
                                  radius1=0.013, radius2=0.001, depth=fl)
            import mathutils
            eul = mathutils.Euler((0.22 + fi * 0.05, fi * 0.12, 0), 'XYZ')
            for v in b2.verts:
                v.co.z -= fl / 2
                v.co.rotate(eul)
                v.co += Vector((wx + fi * 0.024, wy + fi * 0.012, wz))
            tmp = bpy.data.meshes.new('_f_tmp')
            b2.to_mesh(tmp)
            b2.free()
            bm.from_mesh(tmp)
            bpy.data.meshes.remove(tmp)

        mesh = bpy.data.meshes.new(f'arm_{"L" if side < 0 else "R"}')
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(mesh.name, mesh)
        obj.location = (side * H * 0.105, -H * 0.005, H * 0.785)
        bpy.context.collection.objects.link(obj)
        for f in mesh.polygons:
            f.use_smooth = True
        obj.data.materials.append(mat)
        arms.append(obj)
    return arms


def build_mid(fine=False):
    """中模：车削主身 + 位移场 + 破披 + 垂臂。fine=True 时加密段数。
    v1.22 拍 2 材质：体色从灰蓝绒毯（0.016,0.010,0.020 rough 0.92）
    压进黑里（0.009,0.006,0.013 rough 0.95）——巷里它是被剪影光切
    出来的黑，不是一块毛毯；暗红内衬 emission 保留（运行时呼吸）。"""
    # 拍 5：sheen 0.5→0.3——胸口褶脊在帘缝里吃顶光泛白边
    body_mat = make_material(
        'wraithBody', (0.009, 0.006, 0.013, 1), roughness=0.95,
        sheen=0.3, emission=(0.08, 0.008, 0.03, 1), emission_strength=0.05)
    segs = 96 if fine else 48
    body = lathe('body', BODY_PROFILE, segments=segs, scale=H * 1.0)
    # 剖面 r 已是 kit.js 表值——那边乘 H*0.5，这里剖面直接乘 H*0.5：
    for v in body.data.vertices:
        v.co.x *= 0.5
        v.co.y *= 0.5
    displace_body(body, fine=fine)
    body.data.materials.append(body_mat)

    cape_mat = make_material(
        'wraithCape', (0.007, 0.005, 0.011, 1), roughness=0.96, sheen=0.35)
    cape = lathe('cape', [(r * 1.1, y) for r, y in CAPE_PROFILE],
                 segments=72 if fine else 36, scale=H)
    for v in cape.data.vertices:
        v.co.x *= 0.5
        v.co.y *= 0.5
    # 拍 2：撕口加深（0.12 → 0.15）+ 谐波错相——破披要破得更狠
    displace_hem(cape, seed=157, amp=0.15, below_z=H * 0.6,
                 harmonics=[(5, 0.07, 0.9), (11, 0.028, 2.6)])
    # 拍 5（近景渲染账）：披领原是全 2π 车削——顶端细锥（zu
    # 0.79→0.845）卡在发帘脸窗正中吃顶光，读成一根「鼻梁亮柱」
    # （排查时藏 body/藏绺束都不消，真身是披领）。前侧领口向后
    # 折（y 平滑压到 -0.02），披风只搭肩背，脸窗里只剩黑
    for v in cape.data.vertices:
        x, y, z = v.co
        zu = z / H
        if y <= 0.0 or zu <= 0.78:
            continue
        t = min(1.0, (zu - 0.78) / 0.067)
        t = t * t * (3 - 2 * t)
        v.co = (x, y * (1.0 - t) + (-0.02) * t, z)
    cape.data.materials.append(cape_mat)

    arms = build_arms(body_mat)
    return body, cape, arms, body_mat


def build_fine():
    """精修：中模 + 发帘/长发 + 破布条 + 面部空洞 + 眼窝。"""
    body, cape, arms, body_mat = build_mid(fine=True)

    # 拍 2：发色再压一档（灰蓝 → 近黑带冷芯）——发帘的体积交给
    # 绺沟阴影读，不靠亮色。拍 4：rough 0.5+sheen 1.0 在棚光下
    # 绺条读成金属管——rough 提到 0.72、sheen 收半。拍 5 复渲
    # 再哑一档（0.72/0.5 → 0.82/0.3）：帘幕合拢后正面受光面积
    # 变大，湿发只留极窄的冷高光沿
    hair_mat = make_material(
        'wraithHair', (0.006, 0.005, 0.011, 1), roughness=0.82,
        sheen=0.3, emission=(0.015, 0.012, 0.032, 1), emission_strength=0.04)
    # 发帘：局部车削留 76° 前脸开口，挂在头位（z = 0.84H 处的局部系）。
    # 拍 2：竖绺沟槽加深加密（9/17 → 13/23，幅 0.1/0.05 → 0.13/0.06）
    # ——「披下来的湿发」是一条条沟，不是一顶光滑的罩
    veil = lathe('hairVeil', HAIR_PROFILE, segments=88,
                 arc=math.pi * 2 - OPEN_HALF * 2, start=OPEN_HALF, scale=H)
    for v in veil.data.vertices:
        v.co.x *= 0.5
        v.co.y *= 0.5
    displace_hem(veil, seed=211, amp=0.1, below_z=-H * 0.06,
                 harmonics=[(13, 0.13, 1.3), (23, 0.06, 4.1)])
    # 拍 5（近景渲染账三连修）：前脸开口原本纵贯全帘——脸以下
    # 能从缝里透视到帘内被棚灯照亮的躯干褶脊与后侧绺束（一条亮
    # 管贴在胸前穿帮）。下段角度重映射向前合拢，三个实渲教训：
    #   · 对称收 32% 留亮缝（双帘沿正对镜头吃顶光）→ 不对称合拢
    #     ——右帘收到 26%，左帘越过中线（-30%）补缝，湿发合拢
    #     从来不对称；
    #   · 坡度 0.11H 太陡 + 谐波在合拢后的新角度上算 → 帘缝压缩
    #     成锯齿碎片——displace_hem 先跑（褶纹钉在原始角度），
    #     合拢坡度放缓到 0.24H（脸窗 zu≥-0.01 全开 76°）；
    #   · 左帘首版 r×1.035 压外层 → 越线段成了法线正对镜头的
    #     亮板（射线排查坐实）——改 r×0.97 从内侧越线 + 右帘沿
    #     随合拢向内收 4.5%（帘缝是一道退进阴影里的褶，不是
    #     一块顶着光的板）
    for v in veil.data.vertices:
        x, y, z = v.co
        zu = z / H
        if zu >= -0.01:
            continue
        t = min(1.0, (-0.01 - zu) / 0.24)
        t = t * t * (3 - 2 * t)
        a = math.atan2(x, y)
        r = math.hypot(x, y)
        aa = abs(a)
        s = 1.0 if a >= 0 else -1.0
        ol = OPEN_HALF * (1.0 - (0.74 if s > 0 else 1.30) * t)
        aa2 = ol + (aa - OPEN_HALF) * (math.pi - ol) / (math.pi - OPEN_HALF)
        edge = max(0.0, 1.0 - (aa - OPEN_HALF) / 0.4) ** 2
        r2 = r * (1.0 - (0.03 * t if s < 0 else 0.0) - 0.045 * edge * t)
        v.co = (r2 * math.sin(s * aa2), r2 * math.cos(s * aa2), z)
    veil.location = (0, 0, H * 0.84)
    veil.data.materials.append(hair_mat)

    # 成绺长发 ×19（v1.13 定稿 13 绺仍读稀；加密 + 拉长）。
    # 拍 2 治「管风琴」病灶的根：v1.13 挂点 +0.02~0.06H 仍高——帘背
    # 剖面在 +0.13H 处半径只有 0.09H·0.5=0.045H·H…宽头从帘后露出来
    # 戳成管。本轮挂点压到 -0.02~+0.02H（帘身最宽段内侧），宽头
    # 彻底埋进帘壁；绺长拉到 0.34~0.6H（发梢垂过胸口的不止前侧两绺，
    # 背后也有两三绺长的——湿发不整齐）。
    rnd = seeded(223)
    strand_angles = [0.72, 0.98, 1.24, 1.52, 1.8, 2.08, 2.38, 2.68, 2.98,
                     3.28, 3.58, 3.88, 4.18, 4.5, 4.82, 5.1, 5.32, 5.5, 5.62]
    cones = []
    for si, sa0 in enumerate(strand_angles):
        # 拍 5：挂角钳制在开口沿外 0.08rad——首尾绺加抖动后曾荡进
        # 前脸开口（一绺横在眼前）
        sa = sa0 + (rnd() - 0.5) * 0.14
        sa = min(max(sa, OPEN_HALF + 0.08), math.pi * 2 - OPEN_HALF - 0.08)
        long_s = si in (0, 4, 9, 14, len(strand_angles) - 1)
        sl = (0.6 if long_s else 0.34) * H + rnd() * 0.1 * H
        sw = (0.010 + rnd() * 0.005) * H
        rr = H * (0.084 + rnd() * 0.012) * 0.92
        # kit.js phi=0 → +z（Three）→ 这里 +Y；sin→x, cos→y
        loc = (math.sin(sa) * rr, math.cos(sa) * rr,
               H * 0.84 + H * (-0.02 + rnd() * 0.04))
        rot = (math.cos(sa) * 0.13 + (rnd() - 0.5) * 0.07,
               -math.sin(sa) * 0.13 + (rnd() - 0.5) * 0.07,
               (rnd() - 0.5) * 0.1)
        cones.append((sw, sl, loc, rot))
    # 拍 5 复渲追加：前垂发绺 ×4——帘幕合拢沿吃顶光的最后残余
    # 用湿发盖：四绺从脸窗下沿（z≈0.785H）搭在合拢帘外侧垂下，
    # 把正面残留的受光面切成绺影（BOB 式发搭脸前，不进眼窗）
    for fa, fw, flen, fz in ((-0.30, 0.014, 0.46, -0.045), (-0.11, 0.017, 0.34, -0.065),
                             (0.07, 0.013, 0.52, -0.055), (0.27, 0.016, 0.30, -0.070)):
        rr = H * 0.104
        loc = (math.sin(fa) * rr, math.cos(fa) * rr, H * (0.84 + fz))
        rot = (math.cos(fa) * 0.07 + (rnd() - 0.5) * 0.05,
               -math.sin(fa) * 0.07 + (rnd() - 0.5) * 0.05, 0)
        cones.append((fw * H, flen * H, loc, rot))
    strands = cones_object('hairStrands', cones, segments=7)
    strands.data.materials.append(hair_mat)

    # 裙裾破布条 ×15。拍 2：party 帽刺退役——布条收细（0.028→0.019）
    # 拉长（fl 上限 0.34），摆角 ±0.15 再收到 ±0.09（破布往下挂，
    # 不往外支）；穿地收口纪律照旧（尖端离地 ≥2cm）
    rnd = seeded(83)
    fr_cones = []
    for i in range(15):
        a = (i / 15) * math.pi * 2 + rnd() * 0.3
        fr = H * 0.158 + rnd() * H * 0.02
        fl = 0.16 + rnd() * 0.18
        hang_z = 0.1 + rnd() * 0.05
        fl = min(fl, hang_z - 0.02)
        fr_cones.append((
            0.019 + rnd() * 0.009, fl,
            (math.cos(a) * fr, math.sin(a) * fr, hang_z),
            ((rnd() - 0.5) * 0.18, (rnd() - 0.5) * 0.18, 0)))
    fringe = cones_object('fringe', fr_cones, segments=5)
    fringe.data.materials.append(body_mat)

    # 面部空洞：开口里没有脸，只有一个凹陷的纯黑弧面（specular=0，
    # 照不亮的黑）。拍 2：加大加深（r 0.052H→0.058H、纵向 1.3→1.4）
    # ——v1.13 的洞太浅，正面光一打脸就「实」了；洞大一圈之后
    # 眼环是从黑里浮出来的，不是贴在灰罩上的。拍 5：纵向再拉
    # （1.4→1.78、心口下移 0.01H）——洞底原在 u≈0.805，颈段从
    # 帘缝里露出来吃光；拉深后黑洞直落到帘幕合拢线
    void_mat = make_material('faceVoid', (0.0, 0.0, 0.0, 1), roughness=1.0, specular=0.0)
    bpy.ops.mesh.primitive_uv_sphere_add(
        location=(0, 0.048 * H, H * 0.84 + 0.035 * H),
        radius=0.058 * H, segments=18, ring_count=14)
    face_void = bpy.context.active_object
    face_void.name = 'faceVoidMesh'
    face_void.scale = (0.95, 0.6, 1.78)
    face_void.data.materials.append(void_mat)

    # 眼窝空洞 ×2：极暗红环 + 纯黑内芯（无瞳、无脸皮）。
    # v1.22 用户口径「眼睛很好」——环径/环管/亮度/竖长/内芯参数
    # 一字不动（0.012H/0.0035H/0.9/1.3），只随面部空洞加深同步
    # 前移 0.002H 保持「洞口沿」相对位置
    eye_mat = make_material(
        'wraithEye', (0.04, 0.012, 0.016, 1), roughness=0.8,
        emission=(0.23, 0.024, 0.047, 1), emission_strength=0.9)
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(
            location=(sx * 0.027 * H, 0.084 * H, H * 0.84 + 0.042 * H),
            major_radius=0.012 * H, minor_radius=0.0035 * H,
            major_segments=18, minor_segments=8)
        ring = bpy.context.active_object
        ring.name = f'eyeRing_{"L" if sx < 0 else "R"}'
        ring.rotation_euler = (math.radians(90 - 6), 0, sx * 0.12)
        ring.scale = (1, 1, 1.3)
        ring.data.materials.append(eye_mat)
        bpy.ops.mesh.primitive_uv_sphere_add(
            location=(sx * 0.027 * H, 0.082 * H, H * 0.84 + 0.042 * H),
            radius=0.012 * H, segments=12, ring_count=8)
        core = bpy.context.active_object
        core.name = f'eyeVoid_{"L" if sx < 0 else "R"}'
        core.scale = (1, 0.5, 1.32)
        core.data.materials.append(void_mat)

    return body


def main():
    args = args_after_dashes()
    stage = 'fine'
    out = 'assets/blender/corner_wraith.blend'
    for i, a in enumerate(args):
        if a == '--stage' and i + 1 < len(args):
            stage = args[i + 1]
        if a == '--out' and i + 1 < len(args):
            out = args[i + 1]

    reset_scene()
    if stage == 'block':
        build_block()
    elif stage == 'mid':
        build_mid(fine=False)
    elif stage == 'fine':
        build_fine()
    else:
        raise SystemExit(f'unknown stage: {stage}')

    # 常态体态：全身微歪 + 前倾埋头（与运行时 pivot.rotation 一致）——
    # 绕基座原点整体旋转（空物枢轴），不改各件自身位形
    pivot = bpy.data.objects.new('wraithPivot', None)
    bpy.context.collection.objects.link(pivot)
    for obj in list(bpy.context.collection.objects):
        if obj.type == 'MESH':
            obj.parent = pivot
    pivot.rotation_euler = (0.12, 0.06, 0)

    save_blend(os.path.abspath(out))
    polys = sum(len(o.data.polygons)
                for o in bpy.context.collection.objects if o.type == 'MESH')
    print(f'[blender-pipeline] stage={stage} objects='
          f'{len([o for o in bpy.context.collection.objects if o.type == "MESH"])} polys={polys}')


main()
