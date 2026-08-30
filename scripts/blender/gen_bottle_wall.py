# ============================================================
# gen_bottle_wall.py — 「酒瓶墙精修件」.blend 生成（Blender 4.1.1 headless）
#
# 第 6 件管线资产（v1.17，门禁 81）——GOAL_HANDOFF 第 5 轮首选候选：
# 蓝丝绒厅吧台背柜上的两排背光酒瓶（运行时 v2 是 3 条车削剖面 ×
# 10 段 lathe 的合并网格——剪影成立，近看瓶肩是折线、瓶口没有唇环、
# 24 支全部立正像药房货架）。本件把「THE BLUE ROOM 深夜两点的
# 吧台」重新排一遍：四种真瓶形（圆肩波尔多/溜肩高瓶/矮墩醒酒瓶/
# 细高笛形）、捻口环与堆唇、六支塞着软木、顶排一支«喝完了»的
# 横躺空瓶——瓶阵不齐（错位、深浅、高矮抖动），像被拿过又放回。
#
# 运行时接入约定（对齐 corner_wraith/governor「仅换网格保留程序化
# 动画」路线）：
#   · 网格按三色玻璃合并为 bottleGlass_blue / _green / _amber
#     三件 + bottleCorks 一件——「电压不稳」闪烁更新器直驱三件
#     玻璃材质的 emissiveIntensity（材质在落厅时由运行时整套重设，
#     GLB 只负责几何 + 命名 + COLOR_0）；
#   · 布局与运行时 v2 逐位对齐：12 位 × 0.46m 栅距 × 两排（排距
#     0.6m）——落厅锚点 (-W/2+0.74, 1.52, 0.63)，rotation.y=-π/2
#     （glTF +X → 世界 +Z）；
#   · 体积纪律 ≤300KB；瓶身逐瓶顶点色明暗（COLOR_0 BYTE_COLOR）。
#
# 精修 loop 三阶段（--stage 参数）：
#   block  占位比例架：两排 12 位粗瓶栅 + 前排一支基准瓶（3 mesh，
#          总高 ≈0.95m——第一件「宽>高」资产，渲染验证用 wide 机位）
#   mid    中模：四剖面 × 三色玻璃全数就位（含横躺瓶/软木塞）
#   fine   精修：捻口环/堆唇/跟部圆角 + 逐瓶明暗顶点色 + 肩灰
#
# 五拍精修实录（v1.17，每拍的病灶与修正——渲染样张在
# assets/blender/renders/bottle-wall-*）：
#   1 block：第一件「宽>高」资产——高度基准四机位全裁横边，
#     render_views +wide 横幅机位（5.6H/30mm）收 5m 全宽；上排第 7
#     位横躺占位在比例架先行立规（上排 11 站 + 1 躺）
#   2 mid 首渲：三色玻璃全读成奶瓷粉彩（emission 0.55 发光大于
#     透光，深夜吧台成了糖果铺）；K3 笛形低位肩台（0.335）读成
#     车削棱；0.46 栅距一支一位——均匀得像药房货架
#   3 修：玻璃 base 压暗 45% + emission 0.16 + 透射 0.35；K3 肩台
#     上移 0.36 收小成一口气的肩；阵形 +2 空缺位 +7 伴瓶位
#     （「拿走了没放回来」与「同槽两支挤着」——被拿过的吧台）
#   4 fine 首渲：捻口环 +3.2mm 读出、跟珠/逐瓶明暗成立；
#     但 16 段全阵 GLB 469KB 超线 56%
#   5 体积纪律两步收编：14 段 + 剖面点减（身 4→3 肩 6→5）= 371KB
#     仍超 → 12 段 + 捻口环两点法 + 跟珠并点 = 297KB 定稿
#     （mid 12 段实证：9cm 瓶径平滑着色无棱感，剪影零损失）
# ============================================================
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (reset_scene, make_material, attr_material, seeded,
                    MeshBuilder, save_blend, args_after_dashes)

# 布局（米）——与 bluevelvet.js 酒瓶墙 v2 逐位对齐
SPACING = 0.46            # 栅距（运行时 -1.9 + i*0.46）
COUNT = 12                # 每排 12 位
ROW_DZ = 0.60             # 排距（层板 1.5 / 2.1）
X0 = -(COUNT - 1) * SPACING / 2   # 居中：-2.53
LIE_SLOT = 7              # 顶排横躺瓶占的槽位（6/8 位让位）

# 三色玻璃（渲染近似运行时 tint；落厅时材质由运行时整套重设）
# 第 3 拍：base 压暗 45% + emission 0.55→0.16 + 透射 0.35——
# 第 2 拍首渲三色全读成奶瓷（发光大于透光，粉彩不是深夜玻璃）
TINTS = [
    ('blue', (0.030, 0.085, 0.170, 1.0), (0.10, 0.28, 0.52, 1.0)),
    ('green', (0.025, 0.095, 0.060, 1.0), (0.10, 0.42, 0.26, 1.0)),
    ('amber', (0.180, 0.085, 0.022, 1.0), (0.52, 0.30, 0.10, 1.0))
]


def bottle_profile(kind, fine, h=1.0):
    """四种瓶形剖面 [(r, z)]（z 自底向上，h 为高度抖动系数）。
    kind 0 圆肩波尔多 / 1 溜肩高瓶 / 2 矮墩醒酒瓶 / 3 细高笛形。"""
    pts = []

    def shoulder(r_body, r_neck, z0, z1, steps, bias=1.0):
        # 余弦收肩（bias>1 肩更方，<1 肩更溜）
        for i in range(1, steps + 1):
            t = (i / steps) ** bias
            r = r_neck + (r_body - r_neck) * (0.5 + 0.5 * math.cos(t * math.pi))
            pts.append((r, z0 + (z1 - z0) * (i / steps)))

    if kind == 0:    # 圆肩波尔多：短脖、肩圆、唇环厚
        rb, rn, zb, zs, zt = 0.045, 0.0145, 0.165, 0.235, 0.345
    elif kind == 1:  # 溜肩高瓶：长溜肩、细脖
        rb, rn, zb, zs, zt = 0.040, 0.0125, 0.130, 0.300, 0.435
    elif kind == 2:  # 矮墩醒酒瓶：宽体、快肩、短粗脖
        rb, rn, zb, zs, zt = 0.052, 0.0150, 0.105, 0.160, 0.265
    else:            # 细高笛形：通体缓收 + 高位小肩台（第 3 拍：低位肩台
        #             读成车削棱——上移到 0.36 且收小，只留一口气的肩）
        rb, rn, zb, zs, zt = 0.033, 0.0115, 0.330, 0.360, 0.470

    # 跟部（fine 收窄底缘再放出——瓶底不是刀切的）
    pts.append((0.001, 0.0))
    pts.append((rb - 0.004, 0.0))
    pts.append((rb + (0.0012 if fine else 0.0), 0.010))
    # 瓶身（微弧腰：直筒读成管件）
    body_steps = 3 if fine else 2
    for i in range(1, body_steps + 1):
        t = i / body_steps
        r = rb + math.sin(t * math.pi) * (0.0012 if kind != 3 else -0.0018)
        if kind == 3:
            r = rb - (rb - rn) * 0.28 * t  # 笛形通体缓收
        pts.append((r, 0.014 + (zb - 0.014) * t))
    # 收肩
    shoulder(pts[-1][0], rn, zb, zs, 5 if fine else 4,
             bias=(1.35 if kind == 2 else (0.85 if kind == 1 else 1.0)))
    # 脖（笛形只留很小的肩台唇：第 3 拍修正）
    if kind == 3:
        pts.append((rn + 0.002, zs + 0.006))
    pts.append((rn, zs + 0.014))
    pts.append((rn, zt - 0.030))
    # 捻口环（fine +3.2mm 两点法：贴脖 +2mm 读不出，三点法费账）
    if fine:
        pts.append((rn + 0.0032, zt - 0.023))
        pts.append((rn, zt - 0.015))
    # 堆唇 + 口
    lip = 0.0028 if fine else 0.0018
    pts.append((rn + lip, zt - 0.008))
    pts.append((rn + lip, zt - 0.002))
    pts.append((rn - 0.003, zt))
    return [(r, z * h) for r, z in pts]


def lathe_z(profile, segments):
    """绕 z 轴车削（governor 同工装）。"""
    bm = bmesh.new()
    prev = None
    for r, z in profile:
        v = bm.verts.new((max(r, 1e-4), 0, z))
        if prev is not None:
            bm.edges.new((prev, v))
        prev = v
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:],
                   cent=(0, 0, 0), axis=(0, 0, 1),
                   angle=math.pi * 2, steps=segments, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    return bm


def place(bm, loc, rot_y=0.0, rot_z=0.0):
    """先绕 y 再绕 z 旋转，然后平移（横躺瓶用）。"""
    from mathutils import Matrix
    m = Matrix.Rotation(rot_z, 4, 'Z') @ Matrix.Rotation(rot_y, 4, 'Y')
    for v in bm.verts:
        v.co = m @ v.co + Vector(loc)
    return bm


# 空缺位（「拿走了没放回来」）与伴瓶位（同槽两支挤着——被挪过的痕迹）
GAP_SLOTS = {(0, 4), (1, 2)}
PAIR_SLOTS = {(0, 0), (0, 3), (0, 8), (0, 11), (1, 0), (1, 5), (1, 10)}


def slots(shelf):
    """一排的槽位表 [(slot, kind, tint, 姿态)]——躺瓶占 LIE_SLOT，
    第 3 拍：+gap 空缺位 / +pair 伴瓶位（药房货架 → 被拿过的吧台）。"""
    out = []
    for i in range(COUNT):
        if shelf == 1 and i == LIE_SLOT:
            out.append((i, 1, (i * 7 + shelf * 5) % 3, 'lie'))
            continue
        if (shelf, i) in GAP_SLOTS:
            continue
        kind = (i * 3 + shelf) % 4
        pose = 'pair' if (shelf, i) in PAIR_SLOTS else 'stand'
        out.append((i, kind, (i * 7 + shelf * 5) % 3, pose))
    return out


def build_block():
    """占位比例架（3 mesh）：两排粗瓶栅 + 前排基准瓶。
    第 1 拍立规：上排第 7 位腾给横躺瓶（比例架就得少一支）。"""
    mat = make_material('blockMat', (0.05, 0.05, 0.055, 1), roughness=0.9)
    for shelf in (0, 1):
        mb = MeshBuilder()
        for i, kind, _tint, pose in slots(shelf):
            if pose == 'lie':
                # 躺瓶占位：一根横放的粗圆柱
                bm = bmesh.new()
                bmesh.ops.create_cone(bm, cap_ends=True, segments=10,
                                      radius1=0.042, radius2=0.042, depth=0.40)
                place(bm, (X0 + i * SPACING, 0.05, shelf * ROW_DZ + 0.045),
                      rot_y=math.pi / 2)
                mb.add(bm, (1.0, 1.0, 1.0))
                continue
            h = (0.30, 0.35, 0.24, 0.35)[kind]
            bm = bmesh.new()
            bmesh.ops.create_cone(bm, cap_ends=True, segments=10,
                                  radius1=0.042, radius2=0.030, depth=h)
            place(bm, (X0 + i * SPACING, 0, shelf * ROW_DZ + h / 2))
            mb.add(bm, (1.0, 1.0, 1.0))
        mb.object(f'rowBlock{shelf}', mat, smooth=False, with_colors=False)
    ref = MeshBuilder()
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=10,
                          radius1=0.040, radius2=0.0125, depth=0.44)
    place(bm, (0, 0.14, 0.22))
    ref.add(bm, (1.0, 1.0, 1.0))
    ref.object('refBottle', mat, smooth=False, with_colors=False)


def build_wall(fine=False):
    """中模/精修：四剖面 × 三色玻璃 + 软木塞 + 顶排横躺瓶。
    z 向上、宽沿 x 居中、正面 +y；导出 Y-up 后运行时 rotation.y=-π/2。"""
    rnd = seeded(81)
    seg = 12                       # 第 5 拍体积纪律：16 段全阵 GLB 469KB 超线
    #                                56% → 两步收编：14 段+剖面点减（371KB
    #                                仍超）→ 12 段+捻口环两点法+跟珠并点
    #                                （9cm 瓶径平滑着色 12 段无棱感，mid 实证）
    builders = [MeshBuilder() for _ in TINTS]
    corks = MeshBuilder()
    cork_slots = {(0, 1), (0, 6), (0, 10), (1, 2), (1, 5), (1, 9)}

    for shelf in (0, 1):
        for i, kind, tint, pose in slots(shelf):
            h = 0.97 + rnd() * 0.06                    # 高矮抖动
            bright = 0.90 + rnd() * 0.20               # 逐瓶明暗
            jx = (rnd() - 0.5) * 0.030                 # 沿排错位
            jy = (rnd() - 0.5) * 0.044                 # 深浅错位 ±22mm
            prof = bottle_profile(kind, fine, h)
            top_z = prof[-1][1]
            neck_r = 0.0115 if kind == 3 else (0.0125, 0.0125, 0.0150, 0.0115)[kind]

            def glass_shade(co, _b=bright, _top=top_z, _z0=shelf * ROW_DZ):
                # 肩灰：上排落灰更重，但只压 12%（第 5 拍：0.22 发闷收手）
                t = max(0.0, (co.z - _z0) / max(_top, 1e-4) - 0.55) / 0.45
                g = _b * (1.0 - 0.12 * min(1.0, t))
                return (g, g, g)

            if pose == 'lie':
                # 顶排那支«喝完了»的横躺空瓶（微 yaw 0.05 斜着搁；
                # 邻位 6/8 让位 ±14mm 在 stand 分支处理）
                bm = lathe_z(prof, seg)
                body_r = 0.040 * h
                place(bm, (X0 + i * SPACING - 0.16, 0.035,
                           shelf * ROW_DZ + body_r),
                      rot_y=math.pi / 2, rot_z=0.05)
                builders[tint].add(bm, glass_shade if fine else (bright,) * 3)
                continue
            if shelf == 1 and i in (LIE_SLOT - 1, LIE_SLOT + 1):
                jx += (0.014 if i > LIE_SLOT else -0.014)  # 给躺瓶让位
            bm = lathe_z(prof, seg)
            place(bm, (X0 + i * SPACING + jx, jy, shelf * ROW_DZ))
            builders[tint].add(bm, glass_shade if fine else (bright,) * 3)
            if pose == 'pair':
                # 伴瓶：同槽第二支挤在斜后（矮 15%、换色、换剖面）——
                # 第 3 拍：均匀栅距读成药房货架，被挪过的吧台不齐
                pk = (kind + 2) % 4
                pb = 0.86 + rnd() * 0.16
                pprof = [(r * 0.85, z * 0.85) for r, z in
                         bottle_profile(pk, fine, h)]
                ptop = pprof[-1][1]

                def pair_shade(co, _b=pb, _top=ptop, _z0=shelf * ROW_DZ):
                    t = max(0.0, (co.z - _z0) / max(_top, 1e-4) - 0.55) / 0.45
                    g = _b * (1.0 - 0.12 * min(1.0, t))
                    return (g, g, g)
                pbm = lathe_z(pprof, 10)
                place(pbm, (X0 + i * SPACING + jx + 0.085 + (rnd() - 0.5) * 0.02,
                            jy - 0.058, shelf * ROW_DZ))
                builders[(tint + 1) % 3].add(
                    pbm, pair_shade if fine else (pb,) * 3)
            if (shelf, i) in cork_slots:
                ck = bmesh.new()
                bmesh.ops.create_cone(ck, cap_ends=True, segments=8,
                                      radius1=neck_r * 0.86, radius2=neck_r * 0.98,
                                      depth=0.030)
                place(ck, (X0 + i * SPACING + jx, jy,
                           shelf * ROW_DZ + top_z + 0.001))
                corks.add(ck, (0.9 + rnd() * 0.2,) * 3)

    for b, (name, base, emis) in zip(builders, TINTS):
        if fine:
            mat = attr_material(f'glass_{name}', base, roughness=0.10,
                                specular=0.6, metallic=0.05)
        else:
            mat = make_material(f'glass_{name}', base, roughness=0.10)
        bsdf = mat.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Alpha'].default_value = 0.85
        if 'Transmission Weight' in bsdf.inputs:
            bsdf.inputs['Transmission Weight'].default_value = 0.35
        bsdf.inputs['Emission Color'].default_value = emis
        bsdf.inputs['Emission Strength'].default_value = 0.16
        mat.blend_method = 'BLEND'
        b.object(f'bottleGlass_{name}', mat, with_colors=fine,
                 color_type='BYTE_COLOR')
    corks.object('bottleCorks',
                 make_material('corkMat', (0.30, 0.20, 0.10, 1.0),
                               roughness=0.85),
                 with_colors=fine, color_type='BYTE_COLOR')


def main():
    args = args_after_dashes()
    stage = 'fine'
    out = 'assets/blender/bottle_wall.blend'
    for i, a in enumerate(args):
        if a == '--stage' and i + 1 < len(args):
            stage = args[i + 1]
        if a == '--out' and i + 1 < len(args):
            out = args[i + 1]

    reset_scene()
    if stage == 'block':
        build_block()
    elif stage == 'mid':
        build_wall(fine=False)
    elif stage == 'fine':
        build_wall(fine=True)
    else:
        raise SystemExit(f'unknown stage: {stage}')

    save_blend(os.path.abspath(out))
    polys = sum(len(o.data.polygons)
                for o in bpy.context.collection.objects if o.type == 'MESH')
    print(f'[blender-pipeline] stage={stage} objects='
          f'{len([o for o in bpy.context.collection.objects if o.type == "MESH"])} polys={polys}')


main()
