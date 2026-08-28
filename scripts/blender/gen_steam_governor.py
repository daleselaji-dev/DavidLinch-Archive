# ============================================================
# gen_steam_governor.py — 「蒸汽调速器」.blend 生成（Blender 4.1.1 headless）
#
# 第 5 件管线资产（v1.16，门禁 76）——**厅里还没有的东西**：
# 一座落地式离心飞球调速器（总高 ≈1.62m），立在橡皮头厅大机器
# 旁的西墙下。GOAL_HANDOFF 第 4 轮候选「橡皮头大机器局部」的落点：
# 大机器 v2 有飞轮/连杆/天轴皮带，但没有「管转速的那件」——
# 两颗黄铜球张开合拢，整栋楼的转速从它指缝里过。
#
# 结构（自下而上）：阶梯铸铁基座 → 收分立柱（凹槽） → 柱头法兰
# + 轴承座 → 立轴（皮带轮/顶帽铰座随轴转） → 双飞球臂（铰在顶帽，
# 张角随转速） → 滑套（拉杆环槽） → 钟形曲拐杠杆 + 节流竖杆进柱身。
# 运行时动画约定（对齐 corner_wraith「仅换网格保留程序化动画」路线）：
#   · govSpindle / govArm_L / govArm_R / govSleeve 原点都在各自
#     关节上（立轴原点在轴底、臂原点在铰点、滑套原点在轴心）——
#     Three.js 侧 attach 进 spinPivot / armPivot 直驱；
#   · govBase / govLever 静置（杠杆只做小角度点头）。
#
# 精修 loop 三阶段（--stage 参数）：
#   block  占位比例架：基座 + 柱 + 轴 + 双球立出剪影（总高 ≈1.62m）
#   mid    中模：全部件成形（铰接原点就位）
#   fine   精修：+ 柱身凹槽 + 基座地脚螺栓 + 皮带轮双挡缘 + 滑套
#          环槽 + 顶点色（油渍脚/球冠磨亮/柱脚锈沉）
#
# 用法（无显示环境）：
#   blender -b --factory-startup --python scripts/blender/gen_steam_governor.py \
#     -- --stage fine --out assets/blender/steam_governor.blend
# ============================================================
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (reset_scene, make_material, attr_material, seeded,
                    MeshBuilder, save_blend, args_after_dashes)

# 总体尺寸（米）
# 第 2 拍病灶三条：柱粗如棋子/皮带轮与滑套同高打架/节流杆贴柱读成
# 黑片——柱瘦（0.150→0.108）、球大（0.088→0.100）、张角开
# （0.42→0.72，工作转速的姿态）、皮带轮压低滑套抬高（错层 12mm）、
# 支点与竖杆整体外移
PLINTH_R1, PLINTH_H1 = 0.260, 0.090   # 基座下阶
PLINTH_R2, PLINTH_H2 = 0.200, 0.065   # 基座上阶
COL_Z0, COL_Z1 = 0.155, 0.960         # 立柱（收分）
COL_R0, COL_R1 = 0.108, 0.078
CAP_R, CAP_H = 0.150, 0.042           # 柱头法兰
BOSS_R, BOSS_H = 0.075, 0.055         # 轴承座
SPIN_R = 0.018                        # 立轴半径
SPIN_Z1 = 1.660                       # 轴顶
PULLEY_Z, PULLEY_R, PULLEY_H = 1.105, 0.150, 0.050
HINGE_X, HINGE_Z = 0.042, 1.600       # 飞球臂铰点（±x）
ARM_L, ARM_R_ROD = 0.440, 0.0135      # 臂长/臂杆半径
BALL_R = 0.100                        # 飞球半径
THETA0 = 0.72                         # 常速张角（自铅垂线）
SLEEVE_Z, SLEEVE_H = 1.190, 0.095     # 滑套中心/高
FULCRUM = (0.130, 0.0, 1.020)         # 杠杆支点（柱头上，外移贴不住柱）


def lathe_z(profile, segments=24, z_off=0.0):
    """绕 z 轴车削：profile=[(r, z)]，返回 bmesh（z 整体平移 z_off）。"""
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
    for v in bm.verts:
        v.co.z += z_off
    return bm


def rod(p0, p1, r, segments=10):
    """两点间圆杆。"""
    bm = bmesh.new()
    d = Vector(p1) - Vector(p0)
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments,
                          radius1=r, radius2=r, depth=d.length)
    quat = d.to_track_quat('Z', 'Y')
    mid = (Vector(p0) + Vector(p1)) / 2
    for v in bm.verts:
        v.co.rotate(quat)
        v.co += mid
    return bm


def ball(center, r, segs=(20, 14)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs[0], v_segments=segs[1],
                              radius=r)
    for v in bm.verts:
        v.co += Vector(center)
    return bm


def build_block():
    """占位比例架：基座 + 柱 + 轴 + 双球（5 mesh，总高 ≈1.62m）。"""
    mat = make_material('blockMat', (0.05, 0.05, 0.055, 1), roughness=0.9)

    def prim(name, op, loc, **kw):
        op(location=loc, **kw)
        o = bpy.context.active_object
        o.name = name
        o.data.materials.append(mat)
        return o

    prim('plinthBlock', bpy.ops.mesh.primitive_cylinder_add,
         (0, 0, (PLINTH_H1 + PLINTH_H2) / 2), radius=PLINTH_R1,
         depth=PLINTH_H1 + PLINTH_H2, vertices=16)
    prim('columnBlock', bpy.ops.mesh.primitive_cone_add,
         (0, 0, (COL_Z0 + COL_Z1) / 2), radius1=COL_R0, radius2=COL_R1,
         depth=COL_Z1 - COL_Z0, vertices=14)
    prim('spindleBlock', bpy.ops.mesh.primitive_cylinder_add,
         (0, 0, (COL_Z1 + SPIN_Z1) / 2), radius=SPIN_R,
         depth=SPIN_Z1 - COL_Z1, vertices=10)
    bx = HINGE_X + math.sin(THETA0) * ARM_L
    bz = HINGE_Z - math.cos(THETA0) * ARM_L
    for i, sx in enumerate((-1, 1)):
        prim(f'ballBlock{i}', bpy.ops.mesh.primitive_uv_sphere_add,
             (sx * bx, 0, bz), radius=BALL_R, segments=12, ring_count=8)


def col_profile(fine):
    """立柱收分剖面（柱脚领 + 收分身 + 柱颈线脚）。"""
    pts = [(COL_R0 + 0.025, COL_Z0), (COL_R0 + 0.025, COL_Z0 + 0.045),
           (COL_R0, COL_Z0 + 0.060)]
    steps = 14 if fine else 6
    for i in range(steps + 1):
        t = i / steps
        z = COL_Z0 + 0.06 + t * (COL_Z1 - COL_Z0 - 0.11)
        # 收分带 entasis 微鼓（直锥读成塑料管，鼓 6mm 是铸件的肉）
        r = COL_R0 + (COL_R1 - COL_R0) * t + math.sin(t * math.pi) * 0.006
        pts.append((r, z))
    if fine:
        pts += [(COL_R1 + 0.010, COL_Z1 - 0.040), (COL_R1 + 0.010, COL_Z1 - 0.028)]
    pts.append((COL_R1, COL_Z1 - 0.015))
    pts.append((COL_R1, COL_Z1))
    return pts


def build_governor(fine=False):
    """中模/精修。z 向上；导出经 Y-up 换算后 Three.js 里 y 向上。"""
    rnd = seeded(76)
    seg = 28 if fine else 18

    # ---------- govBase：基座 + 立柱 + 柱头 + 轴承座 + 支点柱 ----------
    base = MeshBuilder()
    # 阶梯基座（fine 顶点色：柱脚油渍沉黑，外缘走浅——常年被擦过）
    plinth = lathe_z([(PLINTH_R1, 0), (PLINTH_R1, PLINTH_H1),
                      (PLINTH_R2, PLINTH_H1), (PLINTH_R2, PLINTH_H1 + PLINTH_H2),
                      (COL_R0 + 0.03, PLINTH_H1 + PLINTH_H2)], seg)

    def base_shade(co):
        # 油渍从柱脚往外淡出（半径 0.13→0.26），上阶棱线磨浅
        d = math.hypot(co.x, co.y)
        oil = max(0.0, 1.0 - max(0.0, d - 0.13) / 0.14) * (0.55 if co.z < 0.14 else 0.2)
        edge = 1.18 if abs(co.z - PLINTH_H1) < 0.012 else 1.0
        g = max(0.35, 1.0 - oil) * edge
        return (g, g, g)
    base.add(plinth, base_shade if fine else (1.0, 1.0, 1.0))
    # 立柱（fine：12 道浅凹槽——绕周正弦压入，铸柱的呼吸线）
    col = lathe_z(col_profile(fine), seg)
    if fine:
        for v in col.verts:
            d = math.hypot(v.co.x, v.co.y)
            if d > 0.02 and COL_Z0 + 0.07 < v.co.z < COL_Z1 - 0.05:
                a = math.atan2(v.co.y, v.co.x)
                k = 1.0 - max(0.0, math.sin(a * 12)) * 0.022
                v.co.x *= k
                v.co.y *= k

    def col_shade(co):
        # 柱脚一圈锈沉，越往上越干净
        t = min(1.0, max(0.0, (co.z - COL_Z0) / 0.5))
        g = 0.62 + 0.38 * t
        return (g, g * 0.98, g * 0.96)
    base.add(col, col_shade if fine else (1.0, 1.0, 1.0))
    # 柱头法兰 + 轴承座
    base.add(lathe_z([(CAP_R, COL_Z1), (CAP_R, COL_Z1 + CAP_H),
                      (BOSS_R + 0.012, COL_Z1 + CAP_H)], seg))
    base.add(lathe_z([(BOSS_R, COL_Z1 + CAP_H),
                      (BOSS_R, COL_Z1 + CAP_H + BOSS_H),
                      (SPIN_R + 0.012, COL_Z1 + CAP_H + BOSS_H)], seg))
    # 杠杆支点柱（斜撑出挑——支点悬在柱头外，杠杆不贴柱）
    base.add(rod((BOSS_R * 0.8, 0, COL_Z1 + CAP_H), FULCRUM, 0.013, 8))
    # 节流杆压盖（柱腰外挑的填料函小罐，竖杆从顶口进去）
    gland = bmesh.new()
    bmesh.ops.create_cone(gland, cap_ends=True, segments=12,
                          radius1=0.026, radius2=0.034, depth=0.075)
    for v in gland.verts:
        v.co += Vector((0.205, 0, 0.615))
    base.add(gland)
    base.add(rod((COL_R0 * 0.7, 0, 0.585), (0.205, 0, 0.6), 0.011, 8))
    if fine:
        # 基座地脚螺栓 ×6（六角头立在下阶缘）
        for k in range(6):
            a = k / 6 * math.pi * 2 + 0.26
            bolt = bmesh.new()
            bmesh.ops.create_cone(bolt, cap_ends=True, segments=6,
                                  radius1=0.020, radius2=0.020, depth=0.035)
            for v in bolt.verts:
                v.co += Vector((math.cos(a) * (PLINTH_R1 - 0.045),
                                math.sin(a) * (PLINTH_R1 - 0.045),
                                PLINTH_H1 + 0.012))
            base.add(bolt, (0.55, 0.55, 0.58))

    iron = attr_material('govIron', (0.055, 0.057, 0.064, 1),
                         roughness=0.58, specular=0.3, metallic=0.55) if fine \
        else make_material('govIron', (0.055, 0.057, 0.064, 1), roughness=0.58)
    base.object('govBase', iron, with_colors=fine, color_type='BYTE_COLOR')

    steel_mat = make_material('govSteel', (0.150, 0.155, 0.170, 1),
                              roughness=0.30, metallic=1.0, specular=0.5)
    brass_mat = attr_material('govBrass', (0.410, 0.295, 0.115, 1),
                              roughness=0.32, specular=0.5, metallic=0.9) if fine \
        else make_material('govBrass', (0.410, 0.295, 0.115, 1),
                           roughness=0.32, metallic=0.9)

    # ---------- govSpindle：立轴 + 皮带轮 + 顶帽铰座（原点在轴底轴心） ----------
    spin = MeshBuilder()
    spin_org = Vector((0, 0, COL_Z1 + CAP_H))
    spin.add(rod((0, 0, 0), (0, 0, SPIN_Z1 - spin_org.z), SPIN_R, 12))
    # 皮带轮：轮盘 + 双挡缘（fine）——天轴皮带从大机器那头传过来的接口
    pz = PULLEY_Z - spin_org.z
    spin.add(lathe_z([(SPIN_R + 0.004, pz - PULLEY_H / 2),
                      (PULLEY_R, pz - PULLEY_H / 2 + 0.008),
                      (PULLEY_R, pz + PULLEY_H / 2 - 0.008),
                      (SPIN_R + 0.004, pz + PULLEY_H / 2)], seg))
    if fine:
        for dz in (-PULLEY_H / 2, PULLEY_H / 2):
            spin.add(lathe_z([(PULLEY_R + 0.013, pz + dz - 0.004),
                              (PULLEY_R + 0.013, pz + dz + 0.004)], seg),
                     (1.12, 1.12, 1.12))
    # 顶帽：穹头 + 铰座横梁（铰点在 ±HINGE_X）
    hz = HINGE_Z - spin_org.z
    spin.add(lathe_z([(0.042, hz - 0.028), (0.046, hz + 0.008),
                      (0.020, hz + 0.038), (0.001, hz + 0.042)], 14))
    beam = bmesh.new()
    bmesh.ops.create_cube(beam, size=1.0)
    for v in beam.verts:
        v.co = Vector((v.co.x * 0.13, v.co.y * 0.036, v.co.z * 0.030))
        v.co.z += hz
    spin.add(beam)
    spin_obj = spin.object('govSpindle', steel_mat, with_colors=False)
    spin_obj.location = spin_org

    # ---------- govArm_L/R：飞球臂（原点在铰点；静姿即 THETA0 张角） ----------
    for name, sx in (('govArm_L', -1), ('govArm_R', 1)):
        armb = MeshBuilder()
        tip = Vector((sx * math.sin(THETA0) * ARM_L, 0,
                      -math.cos(THETA0) * ARM_L))
        # 臂杆（fine 微 S 弯：第 4 拍病灶——8mm 偏移在分段处折出死角，
        # 读成弯折的管；收到 4/2mm，锻杆的弯要连续到看不出接缝）
        if fine:
            mid1 = tip * 0.34 + Vector((sx * 0.004, 0, 0))
            mid2 = tip * 0.72 + Vector((sx * 0.002, 0, 0))
            armb.add(rod((0, 0, 0), mid1, ARM_R_ROD, 10))
            armb.add(rod(mid1, mid2, ARM_R_ROD * 0.96, 10))
            armb.add(rod(mid2, tip, ARM_R_ROD * 0.92, 10))
        else:
            armb.add(rod((0, 0, 0), tip, ARM_R_ROD, 10))
        # 铰耳（叉在顶帽横梁上）
        lug = bmesh.new()
        bmesh.ops.create_cone(lug, cap_ends=True, segments=10,
                              radius1=0.020, radius2=0.020, depth=0.052)
        for v in lug.verts:
            v.co = Vector((v.co.x, v.co.z, v.co.y))  # 轴向转 y（铰轴）
        armb.add(lug)

        def ball_shade(co, _tip=tip):
            # 球冠磨亮（常被布擦的那一面朝上外），球腹沉
            local = Vector(co) - _tip
            k = 0.86 + max(0.0, local.z / BALL_R) * 0.26
            return (k, k * 0.99, k * 0.94)
        armb.add(ball(tip, BALL_R, (20, 14) if fine else (14, 10)),
                 ball_shade if fine else (1.0, 1.0, 1.0))
        # 下拉杆：球上内腹 → 滑套顶（第 3 拍病灶：22° 近水平读成天线——
        # 挂点抬到球肩 0.5R，斜度回到 ~35°）
        link_a = tip + Vector((-sx * BALL_R * 0.78, 0, BALL_R * 0.50))
        link_b = Vector((sx * 0.055, 0, SLEEVE_Z + SLEEVE_H / 2 - HINGE_Z))
        armb.add(rod(link_a, link_b, 0.008, 8))
        obj = armb.object(name, brass_mat, with_colors=fine,
                          color_type='BYTE_COLOR')
        obj.location = Vector((sx * HINGE_X, 0, HINGE_Z))

    # ---------- govSleeve：滑套（原点在轴心滑套中点） ----------
    slv = MeshBuilder()
    prof = [(SPIN_R + 0.006, -SLEEVE_H / 2), (0.052, -SLEEVE_H / 2 + 0.012),
            (0.052, -0.010), (0.044, -0.004), (0.044, 0.004),
            (0.052, 0.010), (0.052, SLEEVE_H / 2 - 0.012),
            (SPIN_R + 0.006, SLEEVE_H / 2)]
    slv.add(lathe_z(prof, seg))
    # 下承推环（杠杆叉别在这道环槽里）
    slv.add(lathe_z([(0.075, -SLEEVE_H / 2 - 0.016),
                     (0.075, -SLEEVE_H / 2 - 0.004),
                     (SPIN_R + 0.006, -SLEEVE_H / 2 - 0.002)], seg))
    slv_obj = slv.object('govSleeve', brass_mat, with_colors=False)
    slv_obj.location = Vector((0, 0, SLEEVE_Z))

    # ---------- govLever：钟形曲拐 + 节流竖杆（原点在支点） ----------
    lev = MeshBuilder()
    # 叉臂止于承推环缘（第 3 拍病灶：穿到轴心——真叉别在环槽外缘）
    fork_tip = Vector((0.062 - FULCRUM[0], 0,
                       SLEEVE_Z - SLEEVE_H / 2 - 0.010 - FULCRUM[2]))
    lev.add(rod((0, 0, 0), fork_tip, 0.009, 8))
    out_tip = Vector((0.075, 0, -0.028))
    lev.add(rod((0, 0, 0), out_tip, 0.009, 8))
    # 节流竖杆落进柱腰外挑的填料函顶口（贴不住柱——侧影读得出三件套）
    lev.add(rod(out_tip, (0.075, 0, 0.652 - FULCRUM[2]), 0.007, 8))
    lev.add(ball((0, 0, 0), 0.018, (10, 8)))
    lev_obj = lev.object('govLever', steel_mat, with_colors=False)
    lev_obj.location = Vector(FULCRUM)


def main():
    args = args_after_dashes()
    stage = 'fine'
    out = 'assets/blender/steam_governor.blend'
    for i, a in enumerate(args):
        if a == '--stage' and i + 1 < len(args):
            stage = args[i + 1]
        if a == '--out' and i + 1 < len(args):
            out = args[i + 1]

    reset_scene()
    if stage == 'block':
        build_block()
    elif stage == 'mid':
        build_governor(fine=False)
    elif stage == 'fine':
        build_governor(fine=True)
    else:
        raise SystemExit(f'unknown stage: {stage}')

    save_blend(os.path.abspath(out))
    polys = sum(len(o.data.polygons)
                for o in bpy.context.collection.objects if o.type == 'MESH')
    print(f'[blender-pipeline] stage={stage} objects='
          f'{len([o for o in bpy.context.collection.objects if o.type == "MESH"])} polys={polys}')


main()
