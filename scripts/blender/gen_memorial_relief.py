# ============================================================
# gen_memorial_relief.py — 「大厅纪念浮雕」.blend 生成（Blender 4.1.1 headless）
#
# 第 4 件管线资产（v1.15，门禁 71）——**厅里还没有的东西**：
# 一方立在大厅悼念角的石浮雕碑（总高 ≈2.0m）。母题即馆名：
# 下段是垂落的幕布竖褶（VELVET），褶顶之后一缕烟游走升起（SMOKE），
# 烟在上段分出第二缕。浮雕刻进凹陷的场内（框缘高于场面——是刻进去
# 的，不是贴上来的）；明暗全押在几何位移 + 顶点色（凹处沉、脊上亮），
# 无贴图。鎏金细线内缘呼应大厅柱环的鎏金束环语言。
#
# 精修 loop 三阶段（--stage 参数）：
#   block  占位比例架：基座 + 碑身 + 檐口三件立出剪影（高 ≈2.04m）
#   mid    中模：框缘/凹场/浮雕位移场（幕褶 + 下摆 + 单缕烟）
#   fine   精修：+ 烟分缕 + 凿痕噪声 + 褶脚碎褶 + 顶点色深度分层 +
#          框缘错缝线脚 + 鎏金内缘
#
# 用法（无显示环境）：
#   blender -b --factory-startup --python scripts/blender/gen_memorial_relief.py \
#     -- --stage fine --out assets/blender/memorial_relief.blend
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

# 总体尺寸（米）——大厅 8.4m 柱环下的一件人高石碑
PLINTH = (1.34, 0.46, 0.22)     # 基座 w×d×h（落地）
SLAB = (1.18, 0.16, 1.72)       # 碑身 w×d×h（z 0.22–1.94）
CROWN = (1.30, 0.30, 0.10)      # 檐口 w×d×h（z 1.94–2.04）
# 凹场（浮雕刻在这里）：框内缘开口
FIELD_W = 0.98
FIELD_Z0 = 0.30                 # 场底（世界 z）
FIELD_Z1 = 1.74                 # 场顶
# 深度约定（+Y 为正面）：场基面 y=0（凹进），框正脸 y=+0.045，
# 浮雕脊最高 ≈+0.036（永远低于框脸——刻进去的）。
# 第 4 拍：0.030 幅度在三点冷背光下读成磨砂玻璃——上探到 0.036
FRAME_FACE = 0.045
RELIEF_AMP = 0.036


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def relief_depth(u, h, fine, rnd_noise=True):
    """浮雕位移场：u∈[0,1] 横向、h∈[0,1] 纵向 → 出面深度（米，向 +Y）。
    下段幕布竖褶 + 底缘幕摆；h≈0.46 之后烟柱从褶顶升起游走；
    fine 加第二缕分烟、凿痕噪声、褶面碎褶。"""
    d = 0.0
    # 场边收口：四缘渐落回基面（浮雕不许顶着框缘）
    edge = (smoothstep(0.0, 0.07, u) * smoothstep(1.0, 0.93, u)
            * smoothstep(0.0, 0.045, h) * smoothstep(1.0, 0.955, h))
    # ---- 幕布竖褶（下段，褶到 h≈0.68 渐收进烟里）----
    # 第 3 拍病灶：正弦褶 0.016 幅度读成「磨砂柱」——第 4 拍双修：
    # 幅度 0.016→0.023，且波形 pow(0.62) 提脊压谷（石刻的褶是
    # 脊利谷缓，正弦是布料广告）
    foldk = smoothstep(0.68, 0.48, h)
    fold = (0.5 + 0.5 * math.sin(u * math.pi * 11 + 0.7)) ** 0.55
    fold2 = 0.5 + 0.5 * math.sin(u * math.pi * 23 + 2.1)
    if fine:
        # 碎褶只长在波峰上，相位随高度微漂（布是垂的，不是挤出来的）
        fold += 0.16 * math.sin(u * math.pi * 47 + h * 2.2) * fold
    d += (fold * 0.025 + fold2 * 0.005) * foldk * edge
    # ---- 底缘幕摆：一条起伏的下摆亮边 ----
    hem = math.exp(-(((h - 0.062 - 0.018 * math.sin(u * 8 + 1.3)) / 0.034) ** 2))
    d += hem * 0.009 * edge
    # ---- 烟：从褶顶后面升起的游走脊 ----
    # 第 4 拍：起点压低（0.40→0.36）+ 幅度 0.020→0.028——中段
    # 不再留一条「什么都没刻」的空白带
    if h > 0.36:
        k = (h - 0.36) / 0.64
        xs = 0.5 + 0.15 * math.sin(k * 3.4 + 0.55) + 0.07 * math.sin(k * 7.3 + 2.2)
        sig = 0.078 * (1 - k * 0.55) + 0.018
        ridge = math.exp(-(((u - xs) / sig) ** 2))
        rise = smoothstep(0.36, 0.52, h) * (0.8 + 0.2 * math.sin(k * 9.0 + 0.8))
        d += ridge * 0.028 * rise * edge
        if fine and h > 0.70:
            # 分缕：第二缕更细，向游走主脊的外侧撇开
            k2 = (h - 0.70) / 0.30
            xs2 = xs + 0.105 + 0.05 * math.sin(k2 * 5 + 1.1)
            d += math.exp(-(((u - xs2) / (sig * 0.55)) ** 2)) * 0.016 * k2 * edge
    if fine and rnd_noise:
        # 凿痕（第 4 拍重做）：第 3 拍全场均布噪声在平底区读成
        # 「污渍斑」——凿痕只留在已有刻痕的坡面上（干净的底是
        # 石匠打磨过的底），且拉成竖向短痕（方向性=手的方向）
        chisel = noise.noise(Vector((u * 34.0, h * 9.0, 3.7)))
        d += chisel * 0.0028 * edge * smoothstep(0.002, 0.008, d)
    return min(d, RELIEF_AMP)


def build_block():
    """占位比例架：基座 + 碑身 + 檐口三件（剪影与总高）。"""
    mat = make_material('blockMat', (0.03, 0.027, 0.025, 1), roughness=0.9)

    def prim(name, size, z_lo):
        bpy.ops.mesh.primitive_cube_add(location=(0, 0, z_lo + size[2] / 2))
        o = bpy.context.active_object
        o.name = name
        o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
        o.data.materials.append(mat)
        return o

    prim('plinthBlock', PLINTH, 0)
    prim('slabBlock', SLAB, PLINTH[2])
    prim('crownBlock', CROWN, PLINTH[2] + SLAB[2])


def box_part(w, d, h, cx, cy, cz):
    """一块盒体（中心 cx,cy,cz）写成 bmesh。"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co.x = v.co.x * w + cx
        v.co.y = v.co.y * d + cy
        v.co.z = v.co.z * h + cz
    return bm


def build_frame(fine):
    """碑身框缘 + 基座 + 檐口（单 mesh；fine 加叠级线脚与错缝）。"""
    fb = MeshBuilder()
    rnd = seeded(41)
    # 基座（fine：两级叠座——上级微缩、错缝 4mm，石件不是机加工件）
    if fine:
        fb.add(box_part(PLINTH[0], PLINTH[1], 0.13, 0, 0, 0.065), (0.92, 0.92, 0.92))
        fb.add(box_part(PLINTH[0] - 0.08, PLINTH[1] - 0.06, 0.09,
                        0.004, -0.003, 0.13 + 0.045), (1.0, 1.0, 1.0))
    else:
        fb.add(box_part(*PLINTH, 0, 0, PLINTH[2] / 2), (1.0, 1.0, 1.0))
    # 碑身背板（场后面那层石）
    z_mid = PLINTH[2] + SLAB[2] / 2
    fb.add(box_part(SLAB[0], 0.06, SLAB[2], 0, -0.031, z_mid), (0.9, 0.9, 0.9))
    # 框缘四条（正脸 y=FRAME_FACE）：左右 + 上下
    bw = (SLAB[0] - FIELD_W) / 2          # 左右框宽 0.10
    fy = (FRAME_FACE - 0.001) / 2         # 框条中心 y（0→FRAME_FACE）
    fd = FRAME_FACE + 0.001
    for sx in (-1, 1):
        fb.add(box_part(bw, fd, SLAB[2],
                        sx * (FIELD_W / 2 + bw / 2), fy, z_mid), (1.0, 1.0, 1.0))
    zb0, zb1 = PLINTH[2], FIELD_Z0        # 下框 0.22–0.30
    fb.add(box_part(FIELD_W, fd, zb1 - zb0, 0, fy, (zb0 + zb1) / 2), (1.0, 1.0, 1.0))
    zt0, zt1 = FIELD_Z1, PLINTH[2] + SLAB[2]   # 上框 1.74–1.94
    fb.add(box_part(FIELD_W, fd, zt1 - zt0, 0, fy, (zt0 + zt1) / 2), (1.0, 1.0, 1.0))
    # 檐口（fine：两级出挑）
    z_crown = PLINTH[2] + SLAB[2]
    if fine:
        fb.add(box_part(CROWN[0] - 0.06, CROWN[1] - 0.08, 0.05,
                        0, 0, z_crown + 0.025), (0.95, 0.95, 0.95))
        fb.add(box_part(CROWN[0], CROWN[1], 0.05, 0, 0, z_crown + 0.075), (1.0, 1.0, 1.0))
    else:
        fb.add(box_part(*CROWN, 0, 0, z_crown + CROWN[2] / 2), (1.0, 1.0, 1.0))
    frame_mat = make_material('reliefFrame', (0.052, 0.044, 0.041, 1),
                              roughness=0.88, specular=0.14)
    fb.object('reliefFrame', frame_mat, smooth=False, with_colors=fine)


def build_field(fine):
    """凹场浮雕面：位移网格 + 顶点色深度分层（凹处沉、脊上亮）。
    第 5 拍：56×80 网格下竖褶半波 0.089m 只摊到 5 个顶点——欠采样
    把石刻糊成绒布。横向加密（褶的方向要吃分辨率），纵向 64 够用
    （烟的游走是低频）。96×72 首测 GLB 349KB 超体积纪律——Blender
    导出器把 COLOR_0 强转 float VEC3（BYTE_COLOR 不省字节），
    只能靠网格账目收：84×64 → 实测 271KB ≤300KB，每波长仍 15 顶点。"""
    seg_u = 84 if fine else 28
    seg_h = 64 if fine else 40
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=seg_u, y_segments=seg_h, size=1)
    fh = FIELD_Z1 - FIELD_Z0
    for v in bm.verts:
        u = (v.co.x + 1) / 2
        h = (v.co.y + 1) / 2
        d = relief_depth(u, h, fine)
        v.co = Vector((v.co.x * FIELD_W / 2, d,
                       h * fh + FIELD_Z0))
    field = MeshBuilder()

    def shade(co):
        # 顶点色 = 刻痕深度的直读：基面 0.46、脊顶 1.0（第 4 拍：
        # 0.60–1.0 对比不足——凹处再沉一档，浮雕的暗影自己带在石头上）；
        # 底部幕摆再压一档（垂布的根总是更沉）
        k = min(1.0, max(0.0, co.y / RELIEF_AMP))
        base = 0.46 + 0.54 * (k ** 0.8)
        low = 1.0 - 0.10 * smoothstep(0.55, 0.30, co.z)
        return (base * low, base * low, base * low)

    field.add(bm, shade if fine else (1.0, 1.0, 1.0))
    stone = attr_material('reliefStone', (0.115, 0.100, 0.090, 1),
                          roughness=0.92, specular=0.10) if fine else \
        make_material('reliefStone', (0.115, 0.100, 0.090, 1),
                      roughness=0.92, specular=0.10)
    # BYTE_COLOR：7k 顶点的灰度分层走 u8 归一导出（GLB 体积纪律 ≤300KB）
    field.object('reliefField', stone, smooth=True, with_colors=fine,
                 color_type='BYTE_COLOR')


def build_gilt():
    """鎏金内缘（fine 专属）：框内口一圈细线——呼应大厅柱环鎏金束环。
    第 3 拍病灶：细线挂在框条盒体**内部**（x=FIELD_W/2+t/2 正好埋进
    框缘石里），正面一根都看不见——第 4 拍移到开口内沿、探出框脸
    3mm（贴着刻场转角，背光能扫到金属高光）。"""
    gb = MeshBuilder()
    t = 0.013                              # 线径
    fy = FRAME_FACE - t / 2 + 0.003        # 探出框脸 3mm
    gb.add(box_part(FIELD_W, t, t, 0, fy, FIELD_Z0 + t / 2), (1, 1, 1))
    gb.add(box_part(FIELD_W, t, t, 0, fy, FIELD_Z1 - t / 2), (1, 1, 1))
    for sx in (-1, 1):
        gb.add(box_part(t, t, FIELD_Z1 - FIELD_Z0, sx * (FIELD_W / 2 - t / 2),
                        fy, (FIELD_Z0 + FIELD_Z1) / 2), (1, 1, 1))
    gilt = make_material('reliefGilt', (0.45, 0.33, 0.15, 1),
                         roughness=0.34, metallic=0.85)
    gb.object('reliefGilt', gilt, smooth=False, with_colors=False)


def main():
    args = args_after_dashes()
    stage = 'fine'
    out = 'assets/blender/memorial_relief.blend'
    for i, a in enumerate(args):
        if a == '--stage' and i + 1 < len(args):
            stage = args[i + 1]
        if a == '--out' and i + 1 < len(args):
            out = args[i + 1]

    reset_scene()
    if stage == 'block':
        build_block()
    elif stage == 'mid':
        build_frame(fine=False)
        build_field(fine=False)
    elif stage == 'fine':
        build_frame(fine=True)
        build_field(fine=True)
        build_gilt()
    else:
        raise SystemExit(f'unknown stage: {stage}')

    save_blend(os.path.abspath(out))
    polys = sum(len(o.data.polygons)
                for o in bpy.context.collection.objects if o.type == 'MESH')
    print(f'[blender-pipeline] stage={stage} objects='
          f'{len([o for o in bpy.context.collection.objects if o.type == "MESH"])} polys={polys}')


main()
