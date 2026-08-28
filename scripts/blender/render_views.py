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

VIEWS = {
    # 名称: (机位, 视点, 焦距)——正面在 +Y（生成脚本约定）。
    # 第 2 拍精修：首拍 4.4m/52mm 裁掉头顶——拉远抬看点收全身
    'front':   ((0.0, 6.0, 1.3), (0.0, 0.0, 1.2), 58),
    'side':    ((5.8, 0.6, 1.3), (0.0, 0.0, 1.2), 58),
    'back':    ((0.6, -5.9, 1.4), (0.0, 0.0, 1.2), 58),
    'closeup': ((0.3, 2.1, 2.0), (0.0, 0.05, 1.92), 72)
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
    # 资产包围盒决定拍摄高度基准
    from mathutils import Vector
    hi_z = 0.0
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        for corner in obj.bound_box:
            hi_z = max(hi_z, (obj.matrix_world @ Vector(corner)).z)
    studio_rig(scene, subject_height=max(1.0, hi_z))
    setup_cycles(scene, samples=samples)

    outdir = os.path.abspath(outdir)
    os.makedirs(outdir, exist_ok=True)
    for name in views:
        loc, look, lens = VIEWS[name]
        cam = add_camera(scene, f'cam_{name}', loc, look, lens)
        scene.camera = cam
        render_still(scene, os.path.join(outdir, f'{prefix}-{name}.png'))


main()
