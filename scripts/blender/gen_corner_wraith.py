# ============================================================
# gen_corner_wraith.py — 「拐角魅影」.blend 生成（Blender 4.1.1 headless）
#
# 形体对照运行时 Three.js 版 kit.cornerWraith v3（src/halls/kit.js）：
# 车削主身（裙裾→收腰→驼峰背→缩颈→兜帽）、前倾埋头、错相位破披、
# 裙裾破布条 ×13、过长垂臂 + 三指、披垂发帘（前脸开口）+ 成绺长发、
# 面部空洞 + 眼窝空洞 ×2。抽象无面目：无鼻无嘴无瞳无脸皮。
#
# 精修 loop 三阶段（--stage 参数）：
#   block  占位比例架：五个 primitive 立出剪影比例（高 2.35m）
#   mid    中模：车削主身 + 布褶 + 驼峰/埋头非对称 + 垂臂 + 破披
#   fine   精修：+ 发帘/长发 ×13 + 破布条 ×13 + 眼窝 + 噪声布纹 + 材质
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

# 车削剖面（r, y）——与 kit.js cornerWraith prof 同表（r 已含 *0.5）
BODY_PROFILE = [
    (0.36, 0.0), (0.355, 0.02), (0.315, 0.09), (0.26, 0.22), (0.21, 0.36),
    (0.175, 0.5), (0.16, 0.58), (0.185, 0.68), (0.205, 0.76), (0.17, 0.8),
    (0.1, 0.83), (0.078, 0.85), (0.105, 0.885), (0.115, 0.93),
    (0.085, 0.972), (0.001, 1.0)
]

# 发帘剖面 + 前脸开口半角（kit.js v3 同源数据）
HAIR_PROFILE = [
    (0.035, 0.17), (0.115, 0.125), (0.16, 0.06), (0.19, -0.01),
    (0.205, -0.09), (0.225, -0.19), (0.24, -0.3)
]
OPEN_HALF = math.pi * 0.21

CAPE_PROFILE = [
    (0.235, 0.55), (0.26, 0.62), (0.27, 0.68), (0.255, 0.74),
    (0.21, 0.79), (0.13, 0.825), (0.09, 0.848)
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
    """布褶 + 驼峰/埋头非对称（与 kit.js 同一套位移场；fine 加噪声布纹）。"""
    for v in obj.data.vertices:
        x, y, z = v.co
        r = math.hypot(x, y)
        u = z / H
        if r > 1e-4:
            a = math.atan2(y, x)
            fall = max(0.0, 1 - u / 0.72)
            # 第 2 拍精修：渲染对照发现正面竖褶读不出来——主/副谐波
            # 幅度各加四成（kit.js 0.05/0.034 → 0.07/0.048）；
            # 第 4 拍：主谐波加相位 0.7——正面（a=π/2）不再落在波节上
            fold = 1 + math.sin(a * 8 + 0.7) * 0.07 * fall + math.sin(a * 3 + 2.1) * 0.048 * fall
            if fine:
                # 近景布纹：两倍频细褶 + 3D 噪声破除车削的机械感
                fold += math.sin(a * 19 + z * 4.0) * 0.012 * fall
                fold += (noise.noise(Vector((x * 6, y * 6, z * 3))) - 0.0) * 0.02 * fall
            x *= fold
            y *= fold
        hump_b = math.exp(-((u - 0.72) / 0.1) ** 2)
        head_f = math.exp(-((u - 0.95) / 0.07) ** 2)
        # 驼峰向背侧（-Y）隆起、兜帽头向正面（+Y）前倾、头微垂
        y = y - hump_b * H * 0.055 + head_f * H * 0.05
        z = z - head_f * H * 0.02
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
    """过长垂臂 ×2：两段微屈 + 三指收尖，指尖近地。"""
    arms = []
    for side in (-1, 1):
        up_len = H * 0.3
        lo_len = H * 0.32
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

        # 肩点为局部原点；上段外撇、下段回屈
        seg(0.03, 0.042, up_len, (0, 0, 0), (0.1, side * -0.16, 0))
        lo_root = (side * up_len * 0.15, up_len * 0.1, -up_len * 0.98)
        seg(0.022, 0.03, lo_len, lo_root, (-0.06, side * 0.1, 0))
        # 三指
        wx = side * up_len * 0.18
        wy = up_len * 0.06
        wz = -up_len * 0.98 - lo_len * 0.99
        for fi, fl in ((-1, 0.19), (0, 0.27), (1, 0.21)):
            b2 = bmesh.new()
            bmesh.ops.create_cone(b2, cap_ends=True, segments=5,
                                  radius1=0.015, radius2=0.001, depth=fl)
            import mathutils
            eul = mathutils.Euler((fi * 0.08, fi * 0.2, 0), 'XYZ')
            for v in b2.verts:
                v.co.z -= fl / 2
                v.co.rotate(eul)
                v.co += Vector((wx + fi * 0.03, wy + fi * 0.014, wz))
            tmp = bpy.data.meshes.new('_f_tmp')
            b2.to_mesh(tmp)
            b2.free()
            bm.from_mesh(tmp)
            bpy.data.meshes.remove(tmp)

        mesh = bpy.data.meshes.new(f'arm_{"L" if side < 0 else "R"}')
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(mesh.name, mesh)
        obj.location = (side * H * 0.115, -H * 0.01, H * 0.79)
        bpy.context.collection.objects.link(obj)
        for f in mesh.polygons:
            f.use_smooth = True
        obj.data.materials.append(mat)
        arms.append(obj)
    return arms


def build_mid(fine=False):
    """中模：车削主身 + 位移场 + 破披 + 垂臂。fine=True 时加密段数。"""
    body_mat = make_material(
        'wraithBody', (0.016, 0.010, 0.020, 1), roughness=0.92,
        sheen=0.55, emission=(0.08, 0.008, 0.03, 1), emission_strength=0.05)
    segs = 96 if fine else 48
    body = lathe('body', BODY_PROFILE, segments=segs, scale=H * 1.0)
    # 剖面 r 已是 kit.js 表值——那边乘 H*0.5，这里剖面直接乘 H*0.5：
    for v in body.data.vertices:
        v.co.x *= 0.5
        v.co.y *= 0.5
    displace_body(body, fine=fine)
    body.data.materials.append(body_mat)

    cape_mat = make_material(
        'wraithCape', (0.014, 0.009, 0.02, 1), roughness=0.95, sheen=0.4)
    cape = lathe('cape', [(r * 1.1, y) for r, y in CAPE_PROFILE],
                 segments=72 if fine else 36, scale=H)
    for v in cape.data.vertices:
        v.co.x *= 0.5
        v.co.y *= 0.5
    displace_hem(cape, seed=157, amp=0.12, below_z=H * 0.6,
                 harmonics=[(5, 0.06, 0.9), (11, 0.022, 2.6)])
    cape.data.materials.append(cape_mat)

    arms = build_arms(body_mat)
    return body, cape, arms, body_mat


def build_fine():
    """精修：中模 + 发帘/长发 + 破布条 + 面部空洞 + 眼窝。"""
    body, cape, arms, body_mat = build_mid(fine=True)

    hair_mat = make_material(
        'wraithHair', (0.010, 0.008, 0.016, 1), roughness=0.55,
        sheen=1.0, emission=(0.02, 0.015, 0.04, 1), emission_strength=0.04)
    # 发帘：局部车削留 76° 前脸开口，挂在头位（z = 0.84H 处的局部系）
    veil = lathe('hairVeil', HAIR_PROFILE, segments=80,
                 arc=math.pi * 2 - OPEN_HALF * 2, start=OPEN_HALF, scale=H)
    for v in veil.data.vertices:
        v.co.x *= 0.5
        v.co.y *= 0.5
    displace_hem(veil, seed=211, amp=0.08, below_z=-H * 0.1,
                 harmonics=[(9, 0.1, 1.3), (17, 0.05, 4.1)])
    veil.location = (0, 0, H * 0.84)
    veil.data.materials.append(hair_mat)

    # 成绺长发 ×13（前侧两绺垂过胸口，避开前脸开口）
    # 第 2 拍精修：渲染对照发现前侧长绺像「两根木条」拍在胸前——
    # 摆角减半贴身垂落、绺条加一段圆周（6→7）读出圆身。
    # 第 4 拍：绺束曾像一圈管风琴管——半径减半（0.02H→0.011H）、
    # 挂点从帘顶放低到帘身（+0.10~0.14H → +0.02~0.06H），宽头
    # 藏进发帘里、只留发梢从帘下垂出来
    rnd = seeded(223)
    strand_angles = [0.78, 1.16, 1.55, 1.95, 2.38, 2.8, 3.22, 3.66, 4.1, 4.52, 4.92, 5.28, 5.5]
    cones = []
    for si, sa0 in enumerate(strand_angles):
        sa = sa0 + (rnd() - 0.5) * 0.18
        long_s = si in (0, len(strand_angles) - 1)
        sl = (0.52 if long_s else 0.3) * H + rnd() * 0.12 * H
        sw = (0.011 + rnd() * 0.006) * H
        # 第 5 拍（定稿）：宽头嵌进帘身（rr×0.9）、发梢向外下摆
        # （倾角 0.06→0.16）——绺条贴帘面垂落，不再横排成管
        rr = H * (0.082 + rnd() * 0.014) * 0.9
        # kit.js phi=0 → +z（Three）→ 这里 +Y；sin→x, cos→y
        loc = (math.sin(sa) * rr, math.cos(sa) * rr, H * 0.84 + H * (0.02 + rnd() * 0.04))
        rot = (math.cos(sa) * 0.16 + (rnd() - 0.5) * 0.08,
               -math.sin(sa) * 0.16 + (rnd() - 0.5) * 0.08,
               (rnd() - 0.5) * 0.12)
        cones.append((sw, sl, loc, rot))
    strands = cones_object('hairStrands', cones, segments=7)
    strands.data.materials.append(hair_mat)

    # 裙裾破布条 ×13
    # INSPECT 第 1 拍修正：布条尖端曾垂到 z=-0.24（穿地）——布条长度
    # 按挂点高度收口，尖端离地 ≥2cm（黑绒里穿地读不出来，但账要平）
    rnd = seeded(83)
    fr_cones = []
    for i in range(13):
        a = (i / 13) * math.pi * 2 + rnd() * 0.3
        fr = H * 0.168 + rnd() * H * 0.02
        fl = 0.14 + rnd() * 0.2
        hang_z = 0.1 + rnd() * 0.05
        fl = min(fl, hang_z - 0.02)
        # 第 2 拍精修：摆角 ±0.25 让部分布条上翘如草叉——收到 ±0.15
        fr_cones.append((
            0.028 + rnd() * 0.014, fl,
            (math.cos(a) * fr, math.sin(a) * fr, hang_z),
            ((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3, 0)))
    fringe = cones_object('fringe', fr_cones, segments=5)
    fringe.data.materials.append(body_mat)

    # 面部空洞：开口里没有脸，只有一个凹陷的纯黑弧面。
    # 第 3 拍修正：默认 specular 0.5 让「洞」受光鼓出来——specular=0
    # 才是照不亮的黑（对应 Three MeshBasicMaterial 0x000000）
    void_mat = make_material('faceVoid', (0.0, 0.0, 0.0, 1), roughness=1.0, specular=0.0)
    bpy.ops.mesh.primitive_uv_sphere_add(
        location=(0, 0.052 * H, H * 0.84 + 0.045 * H),
        radius=0.052 * H, segments=18, ring_count=14)
    face_void = bpy.context.active_object
    face_void.name = 'faceVoidMesh'
    face_void.scale = (0.95, 0.55, 1.3)
    face_void.data.materials.append(void_mat)

    # 眼窝空洞 ×2：极暗红环 + 纯黑内芯（无瞳、无脸皮）
    # 第 2/3 拍精修：emission 2.2 是两粒卡通亮圈——压到 0.9；
    # 环径收小（0.016H→0.012H）环管收细、往面部空洞里缩 0.013H——
    # 「深陷的洞口」不是「贴脸的护目镜」
    eye_mat = make_material(
        'wraithEye', (0.04, 0.012, 0.016, 1), roughness=0.8,
        emission=(0.23, 0.024, 0.047, 1), emission_strength=0.9)
    # 第 4 拍：0.075H 后缩过头被帘缘半埋——回到 0.082H（洞口沿）
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(
            location=(sx * 0.027 * H, 0.082 * H, H * 0.84 + 0.042 * H),
            major_radius=0.012 * H, minor_radius=0.0035 * H,
            major_segments=18, minor_segments=8)
        ring = bpy.context.active_object
        ring.name = f'eyeRing_{"L" if sx < 0 else "R"}'
        ring.rotation_euler = (math.radians(90 - 6), 0, sx * 0.12)
        ring.scale = (1, 1, 1.3)
        ring.data.materials.append(eye_mat)
        bpy.ops.mesh.primitive_uv_sphere_add(
            location=(sx * 0.027 * H, 0.080 * H, H * 0.84 + 0.042 * H),
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
