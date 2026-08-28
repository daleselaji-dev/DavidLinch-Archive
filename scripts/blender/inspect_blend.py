# ============================================================
# inspect_blend.py — 精修 loop 的 INSPECT 步：打开 .blend 输出
# 对象/面数/包围盒/材质报告，人眼 + 断言双用。
#
# 用法：
#   blender -b assets/blender/corner_wraith.blend \
#     --python scripts/blender/inspect_blend.py
# 输出行均以 [inspect] 开头，便于脚本抓取。
# ============================================================
import bpy


def main():
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    total_polys = 0
    total_verts = 0
    lo = [1e9, 1e9, 1e9]
    hi = [-1e9, -1e9, -1e9]
    print(f'[inspect] file={bpy.data.filepath}')
    for obj in meshes:
        me = obj.data
        me.calc_loop_triangles()
        tris = len(me.loop_triangles)
        total_polys += tris
        total_verts += len(me.vertices)
        mats = ','.join(m.name for m in me.materials) or '-'
        print(f'[inspect] object={obj.name} verts={len(me.vertices)} tris={tris} mats={mats}')
        from mathutils import Vector
        for corner in obj.bound_box:
            w = obj.matrix_world @ Vector(corner)
            for i in range(3):
                lo[i] = min(lo[i], w[i])
                hi[i] = max(hi[i], w[i])
    dims = [hi[i] - lo[i] for i in range(3)]
    print(f'[inspect] meshes={len(meshes)} verts={total_verts} tris={total_polys}')
    print(f'[inspect] bbox_min=({lo[0]:.3f},{lo[1]:.3f},{lo[2]:.3f}) '
          f'bbox_max=({hi[0]:.3f},{hi[1]:.3f},{hi[2]:.3f})')
    print(f'[inspect] dims=({dims[0]:.3f},{dims[1]:.3f},{dims[2]:.3f}) height={dims[2]:.3f}')
    print(f'[inspect] materials={len(bpy.data.materials)}')


main()
