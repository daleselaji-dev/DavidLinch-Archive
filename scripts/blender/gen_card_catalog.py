# ============================================================
# gen_card_catalog.py — 「卡片柜抽屉阵局部」.blend 生成（Blender 4.1.1 headless）
#
# 第 7 件管线资产（v1.18，门禁 86）——GOAL_HANDOFF 第 6 轮首选：
# 档案长廊卡片目录柜（212 mesh 全馆余量最大）。运行时 cardCatalog
# 的抽屉阵是三张合并网格（脸板阵 0.205×0.155 直角盒 / 拉手锥杆 /
# 标签框实心块）——剪影成立，近看脸板是刀切平板、标签框没有窗、
# 二十只抽屉严丝合缝像没人用过。本件把「归档五十年的柜子」重新
# 做一遍：起线门芯脸板、车削黄铜拉手（座盘/颈/杯口三段）、镂空
# 标签框 + 泛黄卡纸（两格空框、一张卡滑出一角）、三只惯用抽屉
# 拉手磨亮——以及顶排一只**卡死的抽屉**：斜着探出 14mm 再也推不
# 回去，拉手断得只剩座盘，标签框空着（没有名字的那格坏了）。
#
# 运行时接入约定（对齐 corner_wraith/governor/bottle_wall「仅换
# 网格保留程序化动画」路线）：
#   · 七张网格按材质合并：catFaces（暖木脸板阵）/ catBrass（拉手+
#     标签框）/ catBrassWorn（三只磨亮拉手）/ catCards（卡纸）/
#     catStuck（卡死抽屉木件）/ catStuckTrim（其断拉手座+空框，
#     随抖动动画一起动）/ catDark（抽屉后的黑槽口，照不亮的黑）；
#     材质在落厅时由运行时整套重设（GLB 只带几何+命名+COLOR_0）；
#   · 栅距与运行时 cardCatalog 逐位对齐：4 列 × 0.24m、5 排 ×
#     0.19m，(r=3,c=1) 留洞给运行时可拉抽屉（程序化动画原件不动）；
#   · 落厅变换：pivot rotation.y=π（GLB 正面经 Y-up 换算在局部
#     -z，π 转身回柜面 +z 但带 x 镜像）——本脚本生成侧 x 预镜像
#     （bx = -gx），落厅后逐格与程序化版对位；
#   · 体积纪律 ≤300KB；逐屉明暗 + 卡纸泛黄走顶点色（BYTE_COLOR）。
#
# 精修 loop 三阶段（--stage 参数）：
#   block  占位比例架：19 格粗脸板阵 + 卡死抽屉凸出占位 + 洞位
#          基准屉（3 mesh，总高 ≈1.03m）
#   mid    中模：脸板/车削拉手/实心标签框/卡纸/卡死抽屉全数就位
#   fine   精修：起线门芯 + 镂空框 + 滑出卡 + 顶点色 + 黑衬板
#
# 五拍精修实录（v1.18——渲染样张 assets/blender/renders/card-catalog-*）：
#   1 block：19 格阵 + 卡死抽屉凸出占位 + 洞位基准屉立规；柜阵
#     0.92×1.03m 近方形——标准机位不裁边（酒瓶墙 wide 机位不需要）
#   2 mid 首渲：木色读成浅灰褐刷漆 MDF（线性 0.155 在冷棚下不是
#     胡桃木）；实心标签框把卡纸嵌在铜块里打架——满格只剩一条
#     白条、空格反而读成一条下垂的长拉手；断拉手茬留 15mm 正面
#     读成完好旋钮；拉手杯口 10 段近景见棱
#   3 修：木色压 0.155→0.062 + 卡纸压半档；标签框改四条镂空棱、
#     卡纸退到棱后 1.5mm 独立成面；断茬 15→2mm 只剩座盘（「断了」
#     要在剪影上缺一块）；拉手/座盘 12 段
#   4 fine 首渲：镂空框/逐屉明暗/空框黑衬全数成立——但卡死抽屉
#     脸上横出一条 149mm 黑搁板：box(w,h,d) 参数序写反，黑衬板的
#     「深」变成了朝外的「高」（探针机位勘破——SV_SHOT_PRE 的
#     教训在 DCC 侧重演：先架专用机位再下结论）
#   5 参数序修正后定稿：黑衬归位（空框读黑、卡死抽屉槽口黑圈），
#     凸出 14mm/斜 0.03/断座盘三要素中景全读出；滑出卡 0.07 rad +
#     下坠 4mm；GLB 146KB 低于 300KB 红线——7 mesh / 5136 tris
# ============================================================
import math
import os
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (reset_scene, make_material, attr_material, seeded,
                    MeshBuilder, save_blend, args_after_dashes)

# 栅格（米）——与 props.js cardCatalog(cols=4, rows=5) 逐位对齐
COLS, ROWS = 4, 5
FACE_W, FACE_H = 0.205, 0.155
FRONT = 0.245                    # 脸板前平面（运行时 z=0.235 中心 + 0.01）
HOLE = (3, 1)                    # 运行时可拉抽屉的洞位（程序化原件不动）
WORN = {(1, 2), (2, 0), (3, 3)}  # 三只惯用抽屉（拉手磨亮；深浅零抖动对齐光晕贴花）
STUCK = (4, 0)                   # 顶排卡死的抽屉（运行时挂交互）
EMPTY_FRAMES = {(0, 1), (2, 2)}  # 卡片丢了的空框（连同 STUCK 共三格没有名字）
DOGEAR = (1, 1)                  # 滑出一角的卡


def gx(c):
    """运行时列坐标 → 生成侧 x 预镜像（落厅 pivot rotation.y=π）。"""
    return -(-0.36 + 0.24 * c)


def gz(r):
    return 0.19 + 0.19 * r


def slots():
    out = []
    for r in range(ROWS):
        for c in range(COLS):
            if (r, c) == HOLE:
                continue
            out.append((r, c))
    return out


def box(w, h, d, loc, yaw=0.0):
    """轴对齐盒（w 沿 x、h 沿 z、d 沿 y），可绕 z 轴偏摆。"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    m = Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Diagonal((w, d, h, 1.0))
    for v in bm.verts:
        v.co = m @ v.co + Vector(loc)
    return bm


def lathe_y(profile, segments, loc, yaw=0.0):
    """绕 y（出面轴）车削：profile 为 [(r, d)]，d 自脸板向外。"""
    bm = bmesh.new()
    prev = None
    for r, d in profile:
        v = bm.verts.new((max(r, 1e-4), 0, d))
        if prev is not None:
            bm.edges.new((prev, v))
        prev = v
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:],
                   cent=(0, 0, 0), axis=(0, 0, 1),
                   angle=math.pi * 2, steps=segments, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    m = Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(-math.pi / 2, 4, 'X')
    for v in bm.verts:
        v.co = m @ v.co + Vector(loc)
    return bm


# 车削拉手剖面（座盘/收颈/杯口三段，总长 0.053 比运行时锥杆多
# 3mm 换轮廓；第 3 拍：杯口 10 段近景见棱 → 12 段）
# 注：拉手车削自 mid 就位——mid 要验证的是「车削轮廓在中景是否
# 立得住」，锥杆版留在运行时兜底件里当对照
PULL_PROFILE = [
    (0.0115, 0.000), (0.0115, 0.0045), (0.0062, 0.009), (0.0052, 0.026),
    (0.0092, 0.037), (0.0136, 0.047), (0.0140, 0.051), (0.0095, 0.053),
    (0.001, 0.053)
]
PULL_SEG = 12


def frame_bars(mb, cx, cz, front, shade):
    """镂空标签框：四条棱（第 3 拍：实心块贴脸读不出「框」）。"""
    d0 = front + 0.003
    mb.add(box(0.09, 0.004, 0.006, (cx, d0, cz + 0.0155)), shade)
    mb.add(box(0.09, 0.004, 0.006, (cx, d0, cz - 0.0155)), shade)
    mb.add(box(0.004, 0.027, 0.006, (cx - 0.043, d0, cz)), shade)
    mb.add(box(0.004, 0.027, 0.006, (cx + 0.043, d0, cz)), shade)


def build_block():
    """占位比例架（3 mesh）：19 格粗脸板阵 + 卡死抽屉凸出占位 +
    洞位基准屉。第 1 拍立规：柜阵近方形，标准机位即可。"""
    mat = make_material('blockMat', (0.05, 0.05, 0.055, 1), roughness=0.9)
    arr = MeshBuilder()
    for r, c in slots():
        if (r, c) == STUCK:
            continue
        arr.add(box(FACE_W, FACE_H, 0.02, (gx(c), FRONT - 0.01, gz(r))))
    arr.object('arrayBlock', mat, smooth=False, with_colors=False)
    stuck = MeshBuilder()
    stuck.add(box(FACE_W, FACE_H, 0.02, (gx(STUCK[1]), FRONT + 0.004, gz(STUCK[0]))))
    stuck.object('stuckBlock', mat, smooth=False, with_colors=False)
    ref = MeshBuilder()
    ref.add(box(FACE_W, FACE_H, 0.02, (gx(HOLE[1]), FRONT - 0.01, gz(HOLE[0]))))
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=10,
                          radius1=0.008, radius2=0.014, depth=0.05)
    m = Matrix.Rotation(-math.pi / 2, 4, 'X')
    for v in bm.verts:
        v.co = m @ v.co + Vector((gx(HOLE[1]), FRONT + 0.025, gz(HOLE[0]) - 0.03))
    ref.add(bm)
    ref.object('refDrawer', mat, smooth=False, with_colors=False)


def build_array(fine=False):
    """中模/精修：z 向上、宽沿 x（生成侧预镜像）、正面 +y；
    导出 Y-up 后运行时 pivot rotation.y=π 逐格对位。"""
    rnd = seeded(86)
    faces = MeshBuilder()
    brass = MeshBuilder()
    worn = MeshBuilder()
    cards = MeshBuilder()

    for r, c in slots():
        if (r, c) == STUCK:
            continue
        x, z = gx(c), gz(r)
        # 第 3 拍：逐屉深浅 ±3.5mm + 微偏摆（严丝合缝 → 被拉过五十年）；
        # 惯用抽屉深浅零抖动——运行时磨亮光晕贴花仍贴在原平面上
        dy = 0.0 if (r, c) in WORN else (rnd() - 0.5) * 0.007
        yaw = (rnd() - 0.5) * 0.012
        tone = 0.86 + rnd() * 0.28
        if r == 0:
            tone *= 0.94          # 第 5 拍：底排踢灰
        front = FRONT + dy
        # 脸板：外板 + 起线门芯（第 4 拍：直角平板读成邮票）
        faces.add(box(FACE_W, FACE_H, 0.012, (x, front - 0.006, z), yaw), (tone,) * 3)
        faces.add(box(0.171, 0.121, 0.004, (x, front + 0.002, z), yaw),
                  (tone * 1.05,) * 3)
        # 拉手（车削三段；惯用屉进磨亮网格）
        pull_shade = 0.9 + rnd() * 0.15
        pbm = lathe_y([(pr, pd + front + 0.004) for pr, pd in PULL_PROFILE],
                      PULL_SEG, (x, 0, z - 0.03))
        (worn if (r, c) in WORN else brass).add(
            pbm, (1.0,) * 3 if (r, c) in WORN else (pull_shade,) * 3)
        # 标签框 + 卡纸（第 3 拍：mid 实心铜块把卡纸嵌在块里打架，
        # 满格只剩一条白条、空格读成下垂长拉手——fine 改四棱镂空框，
        # 卡纸退到棱后 1.5mm 处独立成面）
        if fine:
            frame_bars(brass, x, z + 0.035, front, (pull_shade,) * 3)
        else:
            brass.add(box(0.09, 0.006, 0.035, (x, front + 0.003, z + 0.035)),
                      (pull_shade,) * 3)
        if (r, c) not in EMPTY_FRAMES:
            ytone = 0.82 + rnd() * 0.23
            cfront = front + (0.0015 if fine else 0.0035)
            if fine and (r, c) == DOGEAR:
                # 滑出一角的卡：面内倾 0.07 rad + 下坠 4mm（透过框窗
                # 读出「上缘让出木色」——第 5 拍近景实证）
                cbm = box(0.080, 0.026, 0.0012, (x, cfront, z + 0.031))
                m = Matrix.Rotation(0.07, 4, 'Y')
                pivot = Vector((x, cfront, z + 0.031))
                for v in cbm.verts:
                    v.co = m @ (v.co - pivot) + pivot
                cards.add(cbm, (ytone,) * 3)
            else:
                cards.add(box(0.080, 0.026, 0.0012, (x, cfront, z + 0.035)),
                          (ytone,) * 3)

    # 第 3 拍：mid 首渲木色发浅像刷漆 MDF（线性 0.155 到冷棚下是
    # 浅灰褐）——压到 0.062 回深胡桃；卡纸同步压半档（白条病灶的
    # 另一半是纸太亮）
    wood = attr_material('catWood', (0.062, 0.034, 0.015, 1.0), roughness=0.62,
                         specular=0.3) if fine else \
        make_material('catWood', (0.062, 0.034, 0.015, 1.0), roughness=0.62)
    brass_mat = make_material('catBrass', (0.44, 0.32, 0.13, 1.0),
                              roughness=0.38, metallic=0.9)
    worn_mat = make_material('catBrassWorn', (0.63, 0.48, 0.23, 1.0),
                             roughness=0.16, metallic=0.95)
    paper = attr_material('catPaper', (0.40, 0.355, 0.25, 1.0), roughness=0.92,
                          specular=0.15) if fine else \
        make_material('catPaper', (0.40, 0.355, 0.25, 1.0), roughness=0.92)
    faces.object('catFaces', wood, smooth=False,
                 with_colors=fine, color_type='BYTE_COLOR')
    brass.object('catBrass', brass_mat, smooth=True,
                 with_colors=fine, color_type='BYTE_COLOR')
    worn.object('catBrassWorn', worn_mat, smooth=True,
                 with_colors=fine, color_type='BYTE_COLOR')
    cards.object('catCards', paper, smooth=False,
                 with_colors=fine, color_type='BYTE_COLOR')

    # ---------- 卡死的抽屉（运行时挂交互：catStuck + catStuckTrim 同抖）----------
    sx, sz = gx(STUCK[1]), gz(STUCK[0])
    sdy = 0.014                   # 探出 14mm（第 5 拍实证：中景可读）
    syaw = 0.03                   # 斜着卡住（它卡死正因为歪了）
    sfront = FRONT + sdy
    stuck = MeshBuilder()
    stuck.add(box(FACE_W, FACE_H, 0.012, (sx, sfront - 0.006, sz), syaw), (0.80,) * 3)
    stuck.add(box(0.171, 0.121, 0.004, (sx, sfront + 0.002, sz), syaw), (0.84,) * 3)
    # 探出槽口的屉体侧帮（脸板背后到柜体前脸之间露出的那一截）
    stuck.add(box(0.185, 0.135, 0.020, (sx, sfront - 0.022, sz), syaw), (0.62,) * 3)
    stuck.object('catStuck',
                 attr_material('catStuckWood', (0.105, 0.062, 0.030, 1.0),
                               roughness=0.7, specular=0.25) if fine else
                 make_material('catStuckWood', (0.105, 0.062, 0.030, 1.0),
                               roughness=0.7),
                 smooth=False, with_colors=fine, color_type='BYTE_COLOR')
    trim = MeshBuilder()
    # 断拉手：只剩座盘 + 2mm 斜茬（第 3 拍：茬留 15mm 正面读成
    # 完好旋钮——「断了」必须在剪影上缺一块）
    trim.add(lathe_y([(0.0115, sfront + 0.004), (0.0115, sfront + 0.0085),
                      (0.0070, sfront + 0.0105), (0.001, sfront + 0.011)],
                     PULL_SEG, (sx, 0, sz - 0.03), syaw),
             (0.85,) * 3)
    if fine:
        frame_bars(trim, sx, sz + 0.035, sfront, (0.9,) * 3)   # 空框（没有名字）
    else:
        trim.add(box(0.09, 0.006, 0.035, (sx, sfront + 0.003, sz + 0.035)),
                 (0.9,) * 3)
    trim.object('catStuckTrim',
                make_material('catStuckBrass', (0.40, 0.29, 0.12, 1.0),
                              roughness=0.45, metallic=0.9),
                smooth=True, with_colors=fine, color_type='BYTE_COLOR')

    if fine:
        # 黑衬板一张网格三处（两格空框衬 + 卡死抽屉槽口黑圈，照不亮
        # 的黑 specular=0）；第 4 拍实录：box(w,h,d) 参数序写反，衬板
        # 的「深」成了朝外的「高」——149mm 黑搁板横在卡死抽屉脸上，
        # 专用探针机位勘破后归位
        dark = MeshBuilder()
        for r, c in EMPTY_FRAMES:
            dark.add(box(0.084, 0.029, 0.0012,
                         (gx(c), FRONT + 0.0025, gz(r) + 0.035)))
        dark.add(box(0.199, 0.149, 0.0012, (sx, FRONT - 0.014, sz), syaw))
        dark.object('catDark',
                    make_material('catDarkVoid', (0.008, 0.008, 0.011, 1.0),
                                  roughness=0.95, specular=0.0),
                    smooth=False, with_colors=False)


def main():
    args = args_after_dashes()
    stage = 'fine'
    out = 'assets/blender/card_catalog.blend'
    for i, a in enumerate(args):
        if a == '--stage' and i + 1 < len(args):
            stage = args[i + 1]
        if a == '--out' and i + 1 < len(args):
            out = args[i + 1]

    reset_scene()
    if stage == 'block':
        build_block()
    elif stage == 'mid':
        build_array(fine=False)
    elif stage == 'fine':
        build_array(fine=True)
    else:
        raise SystemExit(f'unknown stage: {stage}')

    save_blend(os.path.abspath(out))
    polys = sum(len(o.data.polygons)
                for o in bpy.context.collection.objects if o.type == 'MESH')
    print(f'[blender-pipeline] stage={stage} objects='
          f'{len([o for o in bpy.context.collection.objects if o.type == "MESH"])} polys={polys}')


main()
