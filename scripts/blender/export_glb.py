# ============================================================
# export_glb.py — .blend → GLB（Three.js 接入路径，导出步）。
# 只导几何 + 材质（灯/相机不导；Y-up 交给 glTF 出口自动转换）。
#
# 用法：
#   blender -b assets/blender/corner_wraith.blend \
#     --python scripts/blender/export_glb.py -- \
#     --out assets/blender/corner_wraith.glb
# ============================================================
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import export_glb, args_after_dashes


def main():
    args = args_after_dashes()
    out = 'assets/blender/asset.glb'
    for i, a in enumerate(args):
        if a == '--out' and i + 1 < len(args):
            out = args[i + 1]
    export_glb(os.path.abspath(out))


main()
