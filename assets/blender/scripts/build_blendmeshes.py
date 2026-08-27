# ============================================================
# build_blendmeshes — 把 exports/*.json（Blender GAME 档量化导出）
# 汇编为 src/data/blendmeshes.js（ES module，供 kit.blendGeo 解码）。
#
# 复现链：gen_*.py（Blender 4.1.1 headless）→ exports/*.json →
#         本脚本 → src/data/blendmeshes.js（入仓）。
# 数据为量化几何（位置 uint16 / 法线 int8 / 顶点色 uint8 / 索引
# uint16，base64），非媒体文件；权威细模源为 blends/*.blend。
#
# 运行：python3 build_blendmeshes.py
# ============================================================
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
EXPORTS = os.path.join(HERE, '..', 'exports')
OUT = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'src', 'data', 'blendmeshes.js'))

HEADER = '''// ============================================================
// blendmeshes —— Blender 4.1.1 权威细模的游戏档烘焙数据（生成文件，勿手改）。
// 复现：assets/blender/scripts/gen_*.py（bpy 确定性程序化建模，零外部素材）
//   → blender -b -P gen_<asset>.py（渲染自检 + 量化导出）
//   → python3 build_blendmeshes.py（本文件）
// 量化格式：位置 uint16（bbox 归一）/ 法线 int8 / 顶点色 uint8 / 索引 uint16，
// 全部 base64；kit.blendGeo() 解码为 THREE.BufferGeometry。
// ============================================================

export const BLEND_MESHES = {
'''


def main():
    entries = []
    total_tris = 0
    for fn in sorted(os.listdir(EXPORTS)):
        if not fn.endswith('.json'):
            continue
        with open(os.path.join(EXPORTS, fn)) as f:
            data = json.load(f)
        asset = data['asset']
        for pname, p in data['parts'].items():
            key = f'{asset}/{pname}'
            fields = [
                f"bbmin: {json.dumps(p['bbmin'])}",
                f"bbspan: {json.dumps(p['bbspan'])}",
                f"nv: {p['nv']}",
                f"nt: {p['nt']}",
                f"vp: '{p['vp']}'",
                f"vn: '{p['vn']}'",
                f"ix: '{p['ix']}'"
            ]
            if 'vc' in p:
                fields.append(f"vc: '{p['vc']}'")
            entries.append(f"  '{key}': {{\n    " + ',\n    '.join(fields) + '\n  }')
            total_tris += p['nt']
            print(f'[build] {key}: {p["nv"]} verts / {p["nt"]} tris')
    with open(OUT, 'w') as f:
        f.write(HEADER)
        f.write(',\n'.join(entries))
        f.write('\n};\n')
    print(f'[build] wrote {OUT} ({total_tris} tris total, {os.path.getsize(OUT)} bytes)')


main()
