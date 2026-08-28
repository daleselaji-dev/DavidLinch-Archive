# ============================================================
# gen_library_ladder.py — 「档案图书梯」.blend 生成（Blender 4.1.1 headless）
#
# 形体对照运行时 Three.js 版 archive.js 滚动图书梯（v1.4 首建 /
# v1.11 细节遍 / v1.12 结构遍）：双弦圆角梯身 + 11 级车削横档
# （贯穿榫 + 横楔）+ 顶端黄铜挂钩 ×2 + 底端轮叉胶轮 + 后倾 0.21 rad
# 挂轨姿态。DCC 版把运行时靠贴图撑的信息换成几何与顶点色：
#   · 横档真车削（葫芦腰 + 两端领圈），踏面磨浅走顶点色（中段五级
#     顶面一条越靠中间越宽的亮带——鞋底磨的，不是刷的）；
#   · 弦木四棱倒角 + 木纹级噪声微扰（直料不完美）；
#   · 挂钩用圆截面沿弧扫出（216°），钩腹贴轨位留平；
#   · 轮叉侧板对 + 贯穿轴销 + 胶轮胎面微鼓。
#
# 精修 loop 三阶段（--stage 参数）：
#   block  占位比例架：双弦 + 三档 + 钩/轮位立出剪影（总长 4.55m）
#   mid    中模：全 11 档 + 挂钩 + 胶轮
#   fine   精修：+ 贯穿榫楔 + 领圈 + 顶点色磨浅 + 弦木倒角 + 螺钉头
#
# 用法（无显示环境）：
#   blender -b --factory-startup --python scripts/blender/gen_library_ladder.py \
#     -- --stage fine --out assets/blender/library_ladder.blend
# ============================================================
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector, Euler, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (reset_scene, make_material, attr_material, seeded,
                    MeshBuilder, save_blend, args_after_dashes)

L = 4.55            # 梯身总长（沿梯轴）——与 archive.js stringerGeo 同
GAP = 0.26          # 双弦半距
RUNGS = 11          # 横档数（0.35 起步、0.39 步进——运行时同表）
LEAN = 0.21         # 挂轨后倾（运行时 rotation.z=-0.21 同角）


def boxed(w, d, h, bevel=0.0, segments=2):
    """圆角方料：中心在原点，w=x d=y h=z；bevel>0 时四棱倒角。"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= d
        v.co.z *= h
    if bevel > 0:
        edges = [e for e in bm.edges
                 if abs(abs(e.verts[0].co.z - e.verts[1].co.z) - h) < h * 0.02]
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=segments,
                        profile=0.7, affect='EDGES')
    return bm


def lathe_x(profile, segments=12):
    """车削（绕局部轴旋出）后卧倒沿 X——横档/榫头用。profile: [(r, t)]，
    t∈[0,1] 为沿档轴参数，成品跨 x∈[-len/2, len/2]（len 由 t 域缩放前注入）。"""
    bm = bmesh.new()
    prev = None
    for r, t in profile:
        v = bm.verts.new((r, 0, t))
        if prev is not None:
            bm.edges.new((prev, v))
        prev = v
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:],
                   cent=(0, 0, 0), axis=(0, 0, 1),
                   angle=math.pi * 2, steps=segments, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    # 卧倒：z→x
    for v in bm.verts:
        v.co = Vector((v.co.z, v.co.y, v.co.x))
    return bm


def rung_profile(length, fine):
    """车削横档剖面：葫芦腰（中段微鼓）+ 两端领圈（车刀留下的仪式）。"""
    pts = []
    steps = 24 if fine else 8
    for i in range(steps + 1):
        t = i / steps
        r = 0.016 + 0.004 * math.sin(t * math.pi)          # 葫芦腰
        if fine:
            for c in (0.07, 0.93):                          # 两端领圈
                r += 0.0035 * math.exp(-((t - c) / 0.025) ** 2)
        pts.append((r, (t - 0.5) * length))
    return pts


def hook_part(x_off):
    """顶端黄铜挂钩：primitive_torus 取 216° 弧段（同 corner wraith
    眼环做法），立进 YZ 平面、钩口朝墙（-y）。
    第 2 拍精修：首拍钩心齐弦顶（L-0.03）且弧口斜向上——整只钩藏在
    弦木剪影里读不出。钩心抬到弦顶之上（L+0.02）、主径 0.055→0.07、
    弧向翻到「口朝下-y」（真挂钩扣在轨上的姿态）。"""
    bpy.ops.mesh.primitive_torus_add(major_radius=0.07, minor_radius=0.015,
                                     major_segments=18, minor_segments=8)
    obj = bpy.context.active_object
    bm2 = bmesh.new()
    bm2.from_mesh(obj.data)
    # 只留 216° 弧：从 -y 侧（-π/2 附近）向上翻过顶到 +y 侧半腰
    doomed = []
    for v in bm2.verts:
        a = math.atan2(v.co.y, v.co.x)
        if not (-0.15 <= a <= math.pi * 1.2 - 0.05):
            doomed.append(v)
    bmesh.ops.delete(bm2, geom=doomed, context='VERTS')
    # 立起（扫掠面进 YZ 平面）：x→-y（钩背在 +y 弦侧、钩口探向 -y 墙）
    for v in bm2.verts:
        v.co = Vector((x_off, -v.co.x, v.co.y + L + 0.02))
    bpy.data.objects.remove(obj, do_unlink=True)
    return bm2


def wheel_parts(x_off, rubber, brassb):
    """底端轮组：胶轮（胎面微鼓）+ 轮毂 + 轮叉侧板对 + 贯穿轴销。
    第 2 拍精修：首拍轮径 0.10m 在 4.5m 梯身下读成两粒五金——
    轮径加大到 0.15m、整组外移（y+0.075）让「站在轮子上」可读。"""
    wy, wz = 0.075, 0.075
    bpy.ops.mesh.primitive_torus_add(major_radius=0.052, minor_radius=0.024,
                                     major_segments=16, minor_segments=9)
    tire_o = bpy.context.active_object
    bm = bmesh.new()
    bm.from_mesh(tire_o.data)
    for v in bm.verts:
        v.co = Vector((x_off + v.co.z * 0.6, v.co.y + wy, v.co.x + wz))
    bpy.data.objects.remove(tire_o, do_unlink=True)
    hub = bmesh.new()
    bmesh.ops.create_cone(hub, cap_ends=True, segments=10,
                          radius1=0.03, radius2=0.03, depth=0.02)
    for v in hub.verts:
        v.co = Vector((x_off + v.co.z, v.co.y + wy, v.co.x + wz))
    rubber.add(bm)
    rubber.add(hub, (0.6, 0.6, 0.6))
    # 轮叉侧板对 + 轴销（黄铜组）：从弦底跨下来夹住轮盘
    for sx in (-1, 1):
        plate = boxed(0.006, 0.11, 0.13)
        for v in plate.verts:
            v.co += Vector((x_off + sx * 0.024, 0.045, 0.1))
        brassb.add(plate)
    axle = bmesh.new()
    bmesh.ops.create_cone(axle, cap_ends=True, segments=8,
                          radius1=0.007, radius2=0.007, depth=0.07)
    for v in axle.verts:
        v.co = Vector((x_off + v.co.z, v.co.y + wy, v.co.x + wz))
    brassb.add(axle)


def build_block():
    """占位比例架：双弦 + 三档 + 钩/轮位。"""
    mat = make_material('blockMat', (0.05, 0.035, 0.02, 1), roughness=0.9)

    def prim(name, op, loc, **kw):
        op(location=loc, **kw)
        o = bpy.context.active_object
        o.name = name
        o.data.materials.append(mat)
        return o

    for i, sx in enumerate((-GAP, GAP)):
        prim(f'stringerBlock{i}', bpy.ops.mesh.primitive_cube_add, (sx, 0, L / 2),
             scale=(0.02, 0.0475, L / 2))
    for i in range(3):
        prim(f'rungBlock{i}', bpy.ops.mesh.primitive_cylinder_add,
             (0, 0, 0.35 + i * 1.95), radius=0.016, depth=0.52,
             rotation=(0, math.pi / 2, 0), vertices=8)
    prim('hookBlock', bpy.ops.mesh.primitive_uv_sphere_add, (0, 0, L - 0.03),
         radius=0.07, segments=10, ring_count=8)
    prim('wheelBlock', bpy.ops.mesh.primitive_cylinder_add, (0, 0.045, 0.05),
         radius=0.05, depth=0.55, rotation=(0, math.pi / 2, 0), vertices=10)


def build_ladder(fine=False):
    """中模/精修。梯轴沿 +z，梯面在 XZ（双弦沿 x 分开），墙在 -y。"""
    rnd = seeded(44)
    wood = MeshBuilder()
    brassb = MeshBuilder()
    rubber = MeshBuilder()

    # 双弦圆角方料（fine 倒角 + 直料噪声微扰）
    for sx in (-GAP, GAP):
        st = boxed(0.04, 0.095, L, bevel=0.012 if fine else 0.0)
        for v in st.verts:
            if fine:
                v.co.y += noise.noise(Vector((v.co.z * 0.7, sx * 3, 0))) * 0.003
            v.co += Vector((sx, 0, L / 2))
        wood.add(st)

    # 11 级车削横档 + 贯穿榫 + 横楔；踏面磨浅走顶点色
    for i in range(RUNGS):
        z = 0.35 + i * 0.39
        rung = lathe_x(rung_profile(0.52, fine), segments=12 if fine else 8)
        mid5 = 3 <= i <= 7          # 用得最多的中段五级
        wear_w = 0.24 - abs(i - 5) * 0.045

        def rung_shade(co, _z=z, _mid=mid5, _w=wear_w):
            # 顶面窄亮带：越靠中间越宽（多年鞋底），只给中段五级
            if _mid and co.z > 0.011 and abs(co.x) < _w:
                return (1.55, 1.42, 1.25)
            return (1.0, 1.0, 1.0)
        for v in rung.verts:
            v.co += Vector((0, 0, z))
        wood.add(rung, rung_shade if fine else (1.0, 1.0, 1.0))
        if fine:
            for sx in (-1, 1):
                # 贯穿榫头端面（露在弦木外侧）+ 榫面横楔
                tenon = lathe_x([(0.019, -0.004), (0.019, 0.004)], segments=8)
                for v in tenon.verts:
                    v.co += Vector((sx * (GAP + 0.024), 0, z))
                wood.add(tenon, (0.82, 0.76, 0.68))
                wedge = boxed(0.004, 0.03, 0.012)
                eul = Euler((0, 0, 0.35), 'XYZ')
                for v in wedge.verts:
                    v.co.rotate(eul)
                    v.co += Vector((sx * (GAP + 0.027), 0, z))
                wood.add(wedge, (0.55, 0.48, 0.4))

    # 弦木外侧黄铜螺钉头 ×8（fine）
    if fine:
        for k in range(8):
            sx = -1 if k % 2 == 0 else 1
            zz = 0.6 + (k // 2) * 1.1 + rnd() * 0.12
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0075, segments=8, ring_count=6)
            s_o = bpy.context.active_object
            bms = bmesh.new()
            bms.from_mesh(s_o.data)
            for v in bms.verts:
                v.co += Vector((sx * (GAP + 0.02), 0, zz))
            bpy.data.objects.remove(s_o, do_unlink=True)
            brassb.add(bms)

    # 顶端黄铜挂钩 ×2 + 底端轮组 ×2
    for sx in (-GAP, GAP):
        brassb.add(hook_part(sx))
        wheel_parts(sx, rubber, brassb)

    wood_mat = attr_material('ladderWood', (0.13, 0.085, 0.05, 1),
                             roughness=0.62, specular=0.3) if fine else \
        make_material('ladderWood', (0.13, 0.085, 0.05, 1), roughness=0.62)
    wood.object('ladderWood', wood_mat, with_colors=fine)
    brassb.object('ladderBrass', make_material(
        'ladderBrass', (0.42, 0.3, 0.12, 1), roughness=0.38, metallic=0.9,
        specular=0.5), with_colors=False)
    rubber.object('ladderRubber', make_material(
        'ladderRubber', (0.02, 0.02, 0.022, 1), roughness=0.9),
        with_colors=False)

    # 挂轨姿态：绕 x 后倾（顶端朝墙 -y、轮脚探进房间 +y）。
    # 第 2 拍精修：首拍符号反了——梯子朝房间里倒
    pivot = bpy.data.objects.new('ladderPivot', None)
    bpy.context.collection.objects.link(pivot)
    for obj in list(bpy.context.collection.objects):
        if obj.type == 'MESH':
            obj.parent = pivot
    pivot.rotation_euler = (LEAN, 0, 0)


def main():
    args = args_after_dashes()
    stage = 'fine'
    out = 'assets/blender/library_ladder.blend'
    for i, a in enumerate(args):
        if a == '--stage' and i + 1 < len(args):
            stage = args[i + 1]
        if a == '--out' and i + 1 < len(args):
            out = args[i + 1]

    reset_scene()
    if stage == 'block':
        build_block()
    elif stage == 'mid':
        build_ladder(fine=False)
    elif stage == 'fine':
        build_ladder(fine=True)
    else:
        raise SystemExit(f'unknown stage: {stage}')

    save_blend(os.path.abspath(out))
    polys = sum(len(o.data.polygons)
                for o in bpy.context.collection.objects if o.type == 'MESH')
    print(f'[blender-pipeline] stage={stage} objects='
          f'{len([o for o in bpy.context.collection.objects if o.type == "MESH"])} polys={polys}')


main()
