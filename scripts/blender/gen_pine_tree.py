# ============================================================
# gen_pine_tree.py — 「双峰松树」.blend 生成（Blender 4.1.1 headless）
#
# 形体对照运行时 Three.js 版 kit.pineGeometryMaterial v3
# （src/halls/kit.js）：八层枝轮开口锥（层间空隙 + 枝尖圈参差下垂）、
# 顶梢针尖、冠内暗褐内脊、杆根部角度噪声喇叭 + 全杆 S 形微弯 +
# 三根下垂断枝残桩、顶点色分层明暗（下层老枝背光 0.62 → 上层 1.0）。
# 运行时版靠 canvas 针叶贴图撑质感；GLB 版无贴图——质感全部押在
# 几何（枝尖圈谐波 + 噪声撕口 + 下层外探枝尖）与顶点色上。
#
# 精修 loop 三阶段（--stage 参数）：
#   block  占位比例架：冠锥 + 杆 + 顶梢三件立出剪影（高 ~7.9m）
#   mid    中模：八层枝轮（谐波参差/下垂）+ 内脊 + 喇叭根 S 弯杆
#   fine   精修：+ 枝尖圈噪声撕口 + 层错位 + 下层外探枝尖 +
#          断枝残桩 + 顶点色分层 + 树皮顶点色斑驳
#
# 用法（无显示环境）：
#   blender -b --factory-startup --python scripts/blender/gen_pine_tree.py \
#     -- --stage fine --out assets/blender/pine_tree.blend
# ============================================================
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector, Euler, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset_scene, make_material, save_blend, args_after_dashes

# 世界尺度：运行时中景常见实例 s≈1.6（冠心 2.1s+1.05=4.41m）——
# 英雄资产按这一档做实尺寸，总高（含顶梢）≈7.9m
S = 1.6
ZC = 2.1 * S + 1.05          # 冠系局部原点的世界高

# kit.js v3 同表：八层枝轮 [半径, 锥高, 冠局部 y]（锥体收短 ×0.8 留层间空隙）
TIERS = [
    (1.16, 1.0, -1.32), (1.03, 0.95, -0.86), (0.9, 0.92, -0.4),
    (0.78, 0.88, 0.05), (0.65, 0.84, 0.48), (0.51, 0.8, 0.9),
    (0.37, 0.74, 1.3), (0.2, 0.66, 1.66)
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


def attr_material(name, base_color, roughness=0.95, specular=0.12):
    """Principled + 顶点色相乘（Cycles 渲染与 GLB COLOR_0 同一份数据）。"""
    mat = make_material(name, base_color, roughness=roughness, specular=specular)
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    attr = nt.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'Col'
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    mix.inputs[6].default_value = base_color   # A：基色
    nt.links.new(attr.outputs['Color'], mix.inputs[7])  # B：顶点色
    nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
    return mat


class MeshBuilder:
    """bmesh 累加器：逐段并入几何并记录每段的顶点色。"""

    def __init__(self):
        self.bm = bmesh.new()
        self.shades = []  # [(vert_count, (r,g,b))]

    def add(self, bm_part, shade=(1.0, 1.0, 1.0)):
        tmp = bpy.data.meshes.new('_part_tmp')
        bm_part.to_mesh(tmp)
        bm_part.free()
        n = len(tmp.vertices)
        self.bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
        self.shades.append((n, shade))

    def object(self, name, mat, smooth=True, with_colors=True):
        mesh = bpy.data.meshes.new(name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        if with_colors:
            col = mesh.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
            i = 0
            for n, (r, g, b) in self.shades:
                for _ in range(n):
                    col.data[i].color = (r, g, b, 1.0)
                    i += 1
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        for f in mesh.polygons:
            f.use_smooth = smooth
        mesh.materials.append(mat)
        return obj


def open_cone(radius_bottom, radius_top, depth, segments):
    """无盖锥筒（枝轮/杆件基元），底缘在 -depth/2。"""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=segments,
                          radius1=radius_bottom, radius2=max(radius_top, 0.012),
                          depth=depth)
    return bm


def tier_part(ti, rad, h, y, segments, fine, rnd):
    """
    一层枝轮：开口锥 + 底缘（枝尖圈）三谐波参差伸缩 + 下垂。
    kit.js v3 同一套位移场。fine 追加（第 2 拍精修：首拍锥面读成
    「纸伞钣金」——谐波只碰了底缘一圈顶点）：
      · 锥体轴向切 3 环 + 全表面径向噪声（幅度向底缘渐强）——
        锥面本身长针叶，不再是直纹面；
      · 底缘奇偶顶点交替进出（真锯齿针梢裙边，谐波是波、锯齿是刺）；
      · 层错位（微倾/偏心）——完美同轴叠塔是机器的礼貌。
    """
    low = 1 - ti / (len(TIERS) - 1)          # 1=最下层
    depth = h * 0.8 * S
    bm = open_cone(rad * S, 0.02 * S, depth, segments)
    if fine:
        bmesh.ops.subdivide_edges(
            bm, edges=[e for e in bm.edges
                       if abs(e.verts[0].co.z - e.verts[1].co.z) > depth * 0.5],
            cuts=3, use_grid_fill=False)
    ph = rnd() * math.pi * 2
    ph2 = rnd() * math.pi * 2
    ph3 = rnd() * math.pi * 2
    half = depth * 0.49
    rad_max = rad * S
    for v in bm.verts:
        a = math.atan2(v.co.y, v.co.x)
        vr = math.hypot(v.co.x, v.co.y)
        if fine and vr > 1e-4:
            # 全表面针叶噪声（第 3 拍：0.09→0.17，第 2 拍锥面仍读折纸）
            # + 低频椭圆化：整层轻轻不圆——圆规画不出树。
            # 第 4 拍：幅度再乘 min(1, rad/0.65)——顶部小锥半径小、
            # 同幅噪声占比过大，被吹出圆鼓包（侧视「脸颊」病灶）
            k = (vr / rad_max) * min(1.0, rad / 0.65)
            surf = 1 + noise.noise(Vector((v.co.x * 2.4, v.co.y * 2.4, v.co.z * 2.0 + ti * 5.1)))\
                * 0.17 * k + 0.05 * math.sin(a * 2 + ph3) * k
            v.co.x *= surf
            v.co.y *= surf
            v.co.z -= (noise.noise(Vector((v.co.x * 1.7, v.co.y * 1.7, ti * 2.9))) + 0.5) \
                * 0.09 * S * k
        if v.co.z > -half:
            continue
        jag = 1 + 0.24 * math.sin(a * 5 + ph) + 0.12 * math.sin(a * 9 + ph2) + \
            0.07 * math.sin(a * 13 + ph * 1.3)
        if fine:
            # 锯齿针梢：底缘奇偶顶点交替进出——谐波是波，锯齿是刺
            sector = int(((a + math.pi) / (math.pi * 2)) * segments + 0.5)
            jag += 0.055 * (1 if sector % 2 == 0 else -1)
            jag += (noise.noise(Vector((math.cos(a) * 2.1, math.sin(a) * 2.1, ti * 3.7)))) * 0.10
        v.co.x *= jag
        v.co.y *= jag
        droop = (0.1 + 0.2 * low) + (0.09 + 0.1 * low) * (0.5 + 0.5 * math.sin(a * 7 + ph2 * 1.7))
        if fine:
            sector = int(((a + math.pi) / (math.pi * 2)) * segments + 0.5)
            droop += 0.04 * (1 if sector % 2 == 0 else 0)   # 锯齿谷比刺再垂一点
        v.co.z -= droop * S
    # 层错位（fine）
    tilt = Euler(((rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.05, 0), 'XYZ') if fine else None
    off = Vector(((rnd() - 0.5) * 0.06 * S, (rnd() - 0.5) * 0.06 * S, 0)) if fine else Vector((0, 0, 0))
    for v in bm.verts:
        if tilt:
            v.co.rotate(tilt)
        v.co += Vector((0, 0, y * S + ZC)) + off
    return bm


def branch_tips(rnd, count, tier_idx, segments=5):
    """
    下层外探枝尖：真松树最下几层能读出单根枝条——从枝尖圈再往外
    伸出的细长收尖锥（尖端下垂），打破「锥裙」剪影。
    第 2 拍精修：首拍枝尖挂在缘上 0.14S 处且倾角只有 0.32——横插在
    锥面上方读成「草叉」。挂点压到枝尖圈缘、倾角加深到 0.55–0.8
    （枝尖顺着裙摆向外下垂）、半径收细（0.05→0.032S）。
    """
    bm = bmesh.new()
    rad, h, y = TIERS[tier_idx]
    low = 1 - tier_idx / (len(TIERS) - 1)
    rim_z = y * S + ZC - (h * 0.8 * S) / 2 - (0.1 + 0.2 * low) * S
    # 第 3 拍精修：第 2 拍枝尖还是「亮棍横插」——受光面比裙面亮、
    # 根部露在裙外。改「垂须簇」：宽头缩进裙内（0.92→0.8）、挂点压到
    # 缘下（-0.06S）、倾角加深到 0.95–1.25（几乎顺裙下垂）、长度收短
    def add_tuft(a, ln, w):
        b2 = bmesh.new()
        bmesh.ops.create_cone(b2, cap_ends=False, segments=segments,
                              radius1=w, radius2=0.006, depth=ln)
        eul = Euler((math.pi / 2 + 0.95 + rnd() * 0.3, 0, -a + math.pi / 2), 'XYZ')
        root = Vector((math.cos(a) * rad * S * 0.8, math.sin(a) * rad * S * 0.8,
                       rim_z - 0.06 * S))
        for v in b2.verts:
            v.co.z += ln / 2          # 根端对齐挂点
            v.co.rotate(eul)
            v.co += root
        tmp = bpy.data.meshes.new('_tip_tmp')
        b2.to_mesh(tmp)
        b2.free()
        bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)

    for i in range(count):
        a = (i / count) * math.pi * 2 + rnd() * 0.5
        add_tuft(a, (0.3 + rnd() * 0.28) * S, 0.03 * S)
    return bm


def trunk_part(fine, rnd):
    """杆：根部角度噪声喇叭 + 全杆 S 形微弯（kit.js 同款位移场，实尺寸）。"""
    T = ZC - 1.9 * S + 0.45 * S      # 杆顶探进冠底 ~0.45S（不露空档）
    bm = open_cone(0.26, 0.115, T, 14 if fine else 10)
    # create_cone 只有一段轴向——手工切 4 环读出弯与喇叭
    bmesh.ops.subdivide_edges(
        bm, edges=[e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > T * 0.3],
        cuts=4, use_grid_fill=False)
    for v in bm.verts:
        u = (v.co.z + T / 2) / T     # 0=贴地 1=顶
        a = math.atan2(v.co.y, v.co.x)
        flare = 1 + max(0.0, (0.16 - u) / 0.16) ** 1.7 * \
            (0.55 + 0.2 * math.sin(a * 3 + 0.7) + 0.14 * math.sin(a * 7 + 2.1))
        if fine:
            flare *= 1 + 0.05 * math.sin(a * 6 + u * 9)   # 树皮竖向沟壑的几何暗示
        v.co.x = v.co.x * flare + math.sin(u * math.pi) * 0.09 + u * 0.06
        v.co.y *= flare
        v.co.z += T / 2              # 落地
    return bm, T


def stub_part(rnd, T):
    """断枝残桩 ×3：下垂的秃枝（kit.js 三桩同款，实尺寸）。
    第 3 拍精修：0.42–0.8T 的高位桩探进冠底缝里被打亮成一粒亮点——
    压回 0.3–0.58T（只住在裸杆段）。"""
    bm = bmesh.new()
    for i in range(3):
        ln = (0.22 + rnd() * 0.14) * 1.9
        b2 = bmesh.new()
        bmesh.ops.create_cone(b2, cap_ends=False, segments=5,
                              radius1=0.02 * 1.9, radius2=0.03 * 1.9, depth=ln)
        sa = rnd() * math.pi * 2
        sy = (0.3 + i * 0.11 + rnd() * 0.05) * T
        eul = Euler((math.pi * 0.62, 0, sa), 'XYZ')
        for v in b2.verts:
            v.co.z -= ln * 0.42
            v.co.rotate(eul)
            v.co += Vector((math.cos(sa) * 0.13, math.sin(sa) * 0.13, sy))
        tmp = bpy.data.meshes.new('_stub_tmp')
        b2.to_mesh(tmp)
        b2.free()
        bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
    return bm


def ridge_part():
    """冠内脊：层间空隙里露出来的一段暗褐树干（并进杆对象——同料）。
    第 3 拍精修：kit 表值 3.2S 探到顶梢根部（顶部两层锥体小、藏不住
    粗脊）——收短到 2.4S 且整体压低（只补下五层的层间空隙）。"""
    bm = open_cone(0.075 * S, 0.045 * S, 2.4 * S, 7)
    for v in bm.verts:
        v.co.z += -0.2 * S + ZC
    return bm


def build_block():
    """占位比例架：冠剪影锥 + 杆 + 顶梢三件。"""
    mat = make_material('blockMat', (0.02, 0.03, 0.022, 1), roughness=0.9)

    def prim(name, op, loc, **kw):
        op(location=loc, **kw)
        o = bpy.context.active_object
        o.name = name
        o.data.materials.append(mat)
        return o

    crown_h = (1.66 - (-1.32) + 0.8) * S
    prim('crownBlock', bpy.ops.mesh.primitive_cone_add, (0, 0, ZC + 0.15 * S),
         radius1=1.35 * S, radius2=0.05, depth=crown_h, vertices=20)
    prim('trunkBlock', bpy.ops.mesh.primitive_cylinder_add, (0, 0, (ZC - 1.6 * S) / 2),
         radius=0.2, depth=ZC - 1.6 * S, vertices=12)
    prim('spireBlock', bpy.ops.mesh.primitive_cone_add, (0, 0, ZC + 1.92 * S),
         radius1=0.055 * S, radius2=0.01, depth=0.5 * S, vertices=6)


def build_tree(fine=False):
    """中模/精修：八层枝轮 + 顶梢 + 内脊 + 喇叭根 S 弯杆 + 残桩。"""
    rnd = seeded(67)
    segments = 48 if fine else 16

    crown = MeshBuilder()
    for ti, (rad, h, y) in enumerate(TIERS):
        low = 1 - ti / (len(TIERS) - 1)
        shade = 0.62 + 0.38 * (1 - low)      # 下层老枝背光暗、向上渐亮
        crown.add(tier_part(ti, rad, h, y, segments, fine, rnd), (shade, shade, shade))
    # 顶梢针尖
    spire = open_cone(0.055 * S, 0.012, 0.5 * S, 6)
    for v in spire.verts:
        v.co.z += 1.92 * S + ZC
    crown.add(spire, (1.0, 1.0, 1.0))
    if fine:
        # 下层外探枝尖：最下三层各 7/6/5 根（越低越密越长）
        for tier_idx, count in ((0, 7), (1, 6), (2, 5)):
            shade = 0.62 + 0.38 * (tier_idx / (len(TIERS) - 1))
            crown.add(branch_tips(rnd, count, tier_idx), (shade * 1.04, shade * 1.04, shade * 1.04))
    needle = attr_material('pineNeedle', (0.052, 0.082, 0.056, 1),
                           roughness=0.95, specular=0.12) if fine else \
        make_material('pineNeedle', (0.052, 0.082, 0.056, 1), roughness=0.95, specular=0.12)
    crown.object('pineCrown', needle, with_colors=fine)

    wood = MeshBuilder()
    tr, T = trunk_part(fine, rnd)
    wood.add(tr, (1.0, 1.0, 1.0))
    if fine:
        wood.add(stub_part(rnd, T), (0.9, 0.88, 0.86))
    wood.add(ridge_part(), (0.75, 0.62, 0.5))   # 内脊压暗——阴影里的树干
    bark = attr_material('pineBark', (0.062, 0.04, 0.026, 1),
                         roughness=0.95, specular=0.08) if fine else \
        make_material('pineBark', (0.062, 0.04, 0.026, 1), roughness=0.95, specular=0.08)
    wood.object('pineTrunk', bark, with_colors=fine)


def main():
    args = args_after_dashes()
    stage = 'fine'
    out = 'assets/blender/pine_tree.blend'
    for i, a in enumerate(args):
        if a == '--stage' and i + 1 < len(args):
            stage = args[i + 1]
        if a == '--out' and i + 1 < len(args):
            out = args[i + 1]

    reset_scene()
    if stage == 'block':
        build_block()
    elif stage == 'mid':
        build_tree(fine=False)
    elif stage == 'fine':
        build_tree(fine=True)
    else:
        raise SystemExit(f'unknown stage: {stage}')

    save_blend(os.path.abspath(out))
    polys = sum(len(o.data.polygons)
                for o in bpy.context.collection.objects if o.type == 'MESH')
    print(f'[blender-pipeline] stage={stage} objects='
          f'{len([o for o in bpy.context.collection.objects if o.type == "MESH"])} polys={polys}')


main()
