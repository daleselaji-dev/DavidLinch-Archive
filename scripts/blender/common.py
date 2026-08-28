# ============================================================
# common.py — Blender 4.1.1 headless 资产管线共享助手。
# 被 gen_*.py / render_views.py / export_glb.py 复用：
#   * 清场与单位设置
#   * 摄影棚（三点冷背光 + 地台 + 深黑世界，呼应展厅剪影光语言）
#   * Cycles CPU 渲染（headless 无 GPU/EEVEE 依赖）
#   * 压缩保存 .blend / 导出 GLB
# 仅依赖 Blender 自带 bpy / mathutils，无第三方包。
# ============================================================
import math
import os

import bpy


def reset_scene():
    """清空默认场景（立方体/灯/相机全清），米制单位。"""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    return scene


def make_material(name, base_color=(0.02, 0.02, 0.025, 1.0), roughness=0.85,
                  sheen=0.0, emission=None, emission_strength=0.0, specular=None):
    """Principled BSDF 单节点材质（黑绒/哑光布料用高粗糙+sheen）。
    specular=0 可做「照不亮的黑」（面部空洞/眼窝内芯）。"""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Roughness'].default_value = roughness
    if specular is not None and 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = specular
    if sheen and 'Sheen Weight' in bsdf.inputs:
        bsdf.inputs['Sheen Weight'].default_value = sheen
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = emission
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return mat


def studio_rig(scene, subject_height=2.35, key_color=(0.62, 0.72, 1.0)):
    """
    摄影棚：深黑世界 + 地台 + 三灯——
    冷背光（剪影主光，呼应厅内 0x9fb7ff 现身光）、
    侧补光（读出体积）、顶轮廓光（读出肩背轮廓）。
    """
    world = bpy.data.worlds.new('void')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.004, 0.004, 0.006, 1.0)
    bg.inputs['Strength'].default_value = 1.0
    scene.world = world

    floor_mesh = bpy.data.meshes.new('floor')
    floor_obj = bpy.data.objects.new('floor', floor_mesh)
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=8)
    bm.to_mesh(floor_mesh)
    bm.free()
    floor_obj.data.materials.append(
        make_material('floorMat', (0.012, 0.012, 0.015, 1.0), roughness=0.6))
    bpy.context.collection.objects.link(floor_obj)

    def add_light(name, kind, loc, rot, energy, color, size=1.0):
        light = bpy.data.lights.new(name, kind)
        light.energy = energy
        light.color = color
        if kind == 'AREA':
            light.size = size
        obj = bpy.data.objects.new(name, light)
        obj.location = loc
        obj.rotation_euler = rot
        bpy.context.collection.objects.link(obj)
        return obj

    h = subject_height
    # 冷背光：从后上方打——正面读到的是轮廓
    add_light('rim_back', 'AREA', (0, 3.2, h * 1.15),
              (math.radians(-118), 0, 0), 320, key_color, size=3.2)
    # 侧补光：很低的暖侧光，只把体积从黑里托出来一点
    add_light('fill_side', 'AREA', (-3.0, -1.4, h * 0.55),
              (math.radians(72), math.radians(-38), 0), 60, (1.0, 0.82, 0.7), size=2.4)
    # 顶轮廓光：窄条，读肩背驼峰
    add_light('top_edge', 'AREA', (1.6, 0.6, h * 1.9),
              (math.radians(-12), math.radians(18), 0), 90, (0.8, 0.85, 1.0), size=0.8)


def add_camera(scene, name, loc, look_at=(0.0, 0.0, 1.1), lens=52):
    """加一台相机对准 look_at，返回相机对象。"""
    from mathutils import Vector
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = lens
    cam = bpy.data.objects.new(name, cam_data)
    cam.location = loc
    direction = Vector(look_at) - Vector(loc)
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.collection.objects.link(cam)
    return cam


def setup_cycles(scene, samples=96, res=(960, 720)):
    """Cycles CPU + 去噪：headless Linux 无显示无 GPU 也能渲。"""
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x = res[0]
    scene.render.resolution_y = res[1]
    scene.render.film_transparent = False
    scene.view_settings.look = 'AgX - Punchy'


def render_still(scene, filepath):
    scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)
    print(f'[blender-pipeline] rendered {filepath}')


def save_blend(filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=filepath, compress=True)
    print(f'[blender-pipeline] saved {filepath}')


def export_glb(filepath, use_selection=False):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=filepath, export_format='GLB',
        use_selection=use_selection, export_apply=True,
        export_lights=False, export_cameras=False, export_yup=True)
    print(f'[blender-pipeline] exported {filepath}')


def args_after_dashes():
    """blender -b --python x.py -- a b c → 返回 ['a','b','c']。"""
    import sys
    argv = sys.argv
    return argv[argv.index('--') + 1:] if '--' in argv else []
