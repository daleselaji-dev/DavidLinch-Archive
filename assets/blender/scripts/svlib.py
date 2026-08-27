# ============================================================
# svlib — Blender 4.1.1 headless 细模管线共享库（零外部素材）。
#
# 管线角色：bpy 脚本是「权威细模源」——每个资产脚本都从同一组
# 确定性参数生成两档模型：
#   HI   高细节细模（渲染自检 / .blend 存档用）
#   GAME 游戏档（预算内低模，几何/顶点色由同一参数派生）
# GAME 档经 export_parts() 量化导出 JSON，再由 build_blendmeshes.py
# 汇编成 src/data/blendmeshes.js（运行时 kit.blendGeo() 解码为
# THREE.BufferGeometry）。仓库内不出现任何图像/音频媒体文件。
#
# 用法（headless）：
#   tools/blender-4.1.1-linux-x64/blender -b -P <asset>.py
# ============================================================
import base64
import json
import math
import os
import struct

import bpy
from mathutils import Vector

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
BLENDS = os.path.join(ROOT, 'blends')
RENDERS = os.path.join(ROOT, 'renders')
EXPORTS = os.path.join(ROOT, 'exports')
for d in (BLENDS, RENDERS, EXPORTS):
    os.makedirs(d, exist_ok=True)


# ---------- 场景 ----------
def reset_scene():
    """清空默认场景（相机/灯/立方体全部移除）。"""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = 48
    scn.cycles.use_denoising = True
    scn.render.resolution_x = 900
    scn.render.resolution_y = 900
    scn.render.film_transparent = False
    world = bpy.data.worlds.new('night')
    scn.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.004, 0.006, 0.012, 1.0)  # 夜空冷底
    bg.inputs[1].default_value = 1.0
    return scn


def mesh_object(name, verts, faces, colors=None, collection=None):
    """从 pydata 建 mesh 物体；colors 为逐顶点 (r,g,b) 0–1。"""
    me = bpy.data.meshes.new(name)
    me.from_pydata([Vector(v) for v in verts], [], faces)
    me.validate()
    me.update()
    if colors is not None:
        attr = me.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
        for i, c in enumerate(colors):
            attr.data[i].color = (c[0], c[1], c[2], 1.0)
    ob = bpy.data.objects.new(name, me)
    (collection or bpy.context.scene.collection).objects.link(ob)
    return ob


def vcol_material(name='vcol', roughness=0.9, metallic=0.0, base=None):
    """顶点色 → Principled 材质（渲染自检用；游戏端由 three.js 复刻）。
    base 非空时顶点色作为变化量与底色相乘（对应游戏内
    material.color × vertexColors 的语义）。"""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    attr = nt.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'Col'
    if base is None:
        nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        mix = nt.nodes.new('ShaderNodeMixRGB')
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Fac'].default_value = 1.0
        mix.inputs['Color2'].default_value = (base[0], base[1], base[2], 1.0)
        nt.links.new(attr.outputs['Color'], mix.inputs['Color1'])
        nt.links.new(mix.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def smooth(ob, angle=0.9):
    for p in ob.data.polygons:
        p.use_smooth = True
    # Blender 4.1: 按角度分割法线
    try:
        ob.data.set_sharp_from_angle(angle=angle)
    except AttributeError:
        pass


# ---------- 相机 / 灯光 / 渲染 ----------
def look_at(cam, target):
    d = (Vector(target) - cam.location).normalized()
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def add_camera(loc, target, lens=45):
    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens = lens
    cam = bpy.data.objects.new('cam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = Vector(loc)
    look_at(cam, target)
    bpy.context.scene.camera = cam
    return cam


def add_light(kind, loc, energy, color=(1.0, 1.0, 1.0), size=1.0, target=None):
    ld = bpy.data.lights.new('lt', kind)
    ld.energy = energy
    ld.color = color
    if kind == 'AREA':
        ld.size = size
    lt = bpy.data.objects.new('lt', ld)
    bpy.context.scene.collection.objects.link(lt)
    lt.location = Vector(loc)
    if target is not None:
        d = (Vector(target) - lt.location).normalized()
        lt.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return lt


def render_views(name, views, samples=None):
    """views: [(camloc, target, lens)]；输出 renders/<name>-<i>.png。"""
    scn = bpy.context.scene
    if samples:
        scn.cycles.samples = samples
    paths = []
    for i, (loc, tgt, lens) in enumerate(views):
        cam = scn.camera
        if cam is None:
            cam = add_camera(loc, tgt, lens)
        cam.location = Vector(loc)
        cam.data.lens = lens
        look_at(cam, tgt)
        out = os.path.join(RENDERS, f'{name}-{i}.png')
        scn.render.filepath = out
        bpy.ops.render.render(write_still=True)
        paths.append(out)
        print(f'[svlib] rendered {out}')
    return paths


def save_blend(name):
    path = os.path.join(BLENDS, f'{name}.blend')
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
    print(f'[svlib] saved {path}')
    return path


# ---------- GAME 档导出（量化 → base64 JSON） ----------
def _triangulated_copy(ob):
    deps = bpy.context.evaluated_depsgraph_get()
    me = ob.evaluated_get(deps).to_mesh()
    me = me.copy() if hasattr(me, 'copy') else me
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    out = bpy.data.meshes.new(ob.name + '_tri')
    bm.to_mesh(out)
    bm.free()
    return out


def _b64(fmt, values):
    return base64.b64encode(struct.pack(f'<{len(values)}{fmt}', *values)).decode('ascii')


def export_parts(asset, parts, note=''):
    """parts: {partName: bpy.Object}；写 exports/<asset>.json。
    量化：位置 uint16（bbox 归一）/ 法线 int8 / 顶点色 uint8 / 索引 uint16。"""
    data = {'asset': asset, 'note': note, 'parts': {}}
    for pname, ob in parts.items():
        me = _triangulated_copy(ob)
        me.calc_loop_triangles()
        n = len(me.vertices)
        assert n < 65535, f'{asset}.{pname} 顶点过多: {n}'
        mn = [min(v.co[i] for v in me.vertices) for i in range(3)]
        mx = [max(v.co[i] for v in me.vertices) for i in range(3)]
        span = [max(1e-6, mx[i] - mn[i]) for i in range(3)]
        pos = []
        nrm = []
        for v in me.vertices:
            for i in range(3):
                pos.append(min(65535, max(0, round((v.co[i] - mn[i]) / span[i] * 65535))))
            for i in range(3):
                nrm.append(min(127, max(-127, round(v.normal[i] * 127))))
        col = None
        attr = me.color_attributes.get('Col')
        if attr is not None and attr.domain == 'POINT':
            col = []
            for d in attr.data:
                col.extend([
                    min(255, max(0, round(d.color[0] * 255))),
                    min(255, max(0, round(d.color[1] * 255))),
                    min(255, max(0, round(d.color[2] * 255)))
                ])
        idx = []
        for tri in me.loop_triangles:
            idx.extend(tri.vertices)
        part = {
            'bbmin': [round(v, 5) for v in mn],
            'bbspan': [round(v, 5) for v in span],
            'nv': n,
            'nt': len(me.loop_triangles),
            'vp': _b64('H', pos),
            'vn': _b64('b', nrm),
            'ix': _b64('H', idx)
        }
        if col is not None:
            part['vc'] = _b64('B', col)
        data['parts'][pname] = part
        print(f'[svlib] export {asset}.{pname}: {n} verts / {len(me.loop_triangles)} tris')
    out = os.path.join(EXPORTS, f'{asset}.json')
    with open(out, 'w') as f:
        json.dump(data, f)
    print(f'[svlib] wrote {out}')
    return out


# ---------- 通用几何小工具（脚本侧的「车削/放样」） ----------
def lathe(profile, segments, cap_top=False, cap_bottom=False):
    """绕 Y 轴车削 profile=[(r, y), ...]（自下而上）→ (verts, faces)。"""
    verts = []
    faces = []
    rows = len(profile)
    for (r, y) in profile:
        for s in range(segments):
            a = s / segments * math.tau
            verts.append((math.cos(a) * r, y, math.sin(a) * r))
    for j in range(rows - 1):
        for s in range(segments):
            a = j * segments + s
            b = j * segments + (s + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    if cap_bottom:
        base = len(verts)
        verts.append((0.0, profile[0][1], 0.0))
        for s in range(segments):
            faces.append((base, (s + 1) % segments, s))
    if cap_top:
        top0 = (rows - 1) * segments
        base = len(verts)
        verts.append((0.0, profile[-1][1], 0.0))
        for s in range(segments):
            faces.append((base, top0 + s, top0 + (s + 1) % segments))
    return verts, faces


def merge_pydata(items):
    """items: [(verts, faces, colors)] → 合并为单份 pydata。"""
    verts = []
    faces = []
    colors = []
    for (v, f, c) in items:
        off = len(verts)
        verts.extend(v)
        faces.extend([tuple(i + off for i in face) for face in f])
        colors.extend(c)
    return verts, faces, colors
