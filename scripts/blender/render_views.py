# ============================================================
# render_views.py — 精修 loop 的渲染验证步（CLI，无 MCP 无显示）。
# 打开资产 .blend → 运行时挂上摄影棚（三点冷背光）→ Cycles CPU
# 渲四机位静帧：front / side / back / closeup。棚与相机不写回资产。
#
# 用法：
#   blender -b assets/blender/corner_wraith.blend \
#     --python scripts/blender/render_views.py -- \
#     --outdir assets/blender/renders --prefix corner-wraith --samples 96
# ============================================================
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import studio_rig, add_camera, setup_cycles, render_still, args_after_dashes

# 名称: (机位, 视点, 焦距)——正面在 +Y（生成脚本约定）；坐标为
# **主体高度 H 的倍数**（v1.14：随包围盒等比取景——2.35m 人形与旧表
# 逐位一致，7m 松树/3m 图书梯不再裁帧）。
# 第 2 拍精修（v1.13 实录）：首拍 4.4m/52mm 裁掉头顶——拉远抬看点收全身
VIEWS = {
    'front':   ((0.0, 2.553, 0.553), (0.0, 0.0, 0.51), 58),
    'side':    ((2.468, 0.255, 0.553), (0.0, 0.0, 0.51), 58),
    'back':    ((0.255, -2.51, 0.596), (0.0, 0.0, 0.51), 58),
    'closeup': ((0.128, 0.894, 0.851), (0.0, 0.021, 0.817), 72)
}


def main():
    args = args_after_dashes()
    outdir = 'assets/blender/renders'
    prefix = 'asset'
    samples = 96
    views = list(VIEWS.keys())
    for i, a in enumerate(args):
        if a == '--outdir' and i + 1 < len(args):
            outdir = args[i + 1]
        if a == '--prefix' and i + 1 < len(args):
            prefix = args[i + 1]
        if a == '--samples' and i + 1 < len(args):
            samples = int(args[i + 1])
        if a == '--views' and i + 1 < len(args):
            views = args[i + 1].split(',')

    scene = bpy.context.scene
    # 资产包围盒决定拍摄高度基准（机位/棚灯全部随 H 等比取景）
    from mathutils import Vector
    hi_z = 0.0
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        for corner in obj.bound_box:
            hi_z = max(hi_z, (obj.matrix_world @ Vector(corner)).z)
    H = max(1.0, hi_z)
    studio_rig(scene, subject_height=H)
    setup_cycles(scene, samples=samples)

    outdir = os.path.abspath(outdir)
    os.makedirs(outdir, exist_ok=True)
    for name in views:
        loc, look, lens = VIEWS[name]
        cam = add_camera(scene, f'cam_{name}',
                         tuple(c * H for c in loc), tuple(c * H for c in look), lens)
        scene.camera = cam
        render_still(scene, os.path.join(outdir, f'{prefix}-{name}.png'))


main()
