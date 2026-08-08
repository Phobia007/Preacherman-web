import argparse
from pathlib import Path

import bpy


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--textures", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(__import__("sys").argv[__import__("sys").argv.index("--") + 1 :])


def load_image(path, color_space):
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = color_space
    return image


def add_texture(nodes, links, path, color_space, socket, x, y):
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = load_image(path, color_space)
    texture.location = (x, y)
    links.new(texture.outputs["Color"], socket)
    return texture


def make_material(name, texture_root, prefix, has_normal=True):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = False

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (640, 0)
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.location = (280, 0)
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["Emission Strength"].default_value = 1
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])

    add_texture(
        nodes,
        links,
        texture_root / f"{prefix}-basecolor.png",
        "sRGB",
        shader.inputs["Base Color"],
        -520,
        260,
    )
    add_texture(
        nodes,
        links,
        texture_root / f"{prefix}-emissive.png",
        "sRGB",
        shader.inputs["Emission Color"],
        -520,
        30,
    )
    add_texture(
        nodes,
        links,
        texture_root / f"{prefix}-roughness.png",
        "Non-Color",
        shader.inputs["Roughness"],
        -520,
        -200,
    )

    normal_path = texture_root / f"{prefix}-normal.png"
    if has_normal and normal_path.exists():
        normal_texture = nodes.new("ShaderNodeTexImage")
        normal_texture.image = load_image(normal_path, "Non-Color")
        normal_texture.location = (-520, -430)
        normal_map = nodes.new("ShaderNodeNormalMap")
        normal_map.location = (-100, -360)
        links.new(normal_texture.outputs["Color"], normal_map.inputs["Color"])
        links.new(normal_map.outputs["Normal"], shader.inputs["Normal"])

    return material


def main():
    args = parse_args()
    input_path = Path(args.input).resolve()
    texture_root = Path(args.textures).resolve()
    output_path = Path(args.output).resolve()

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(input_path))

    materials = {
        "face": make_material("CortanaWebFace", texture_root, "face", False),
        "body": make_material("CortanaWebBody", texture_root, "body"),
        "hair": make_material("CortanaWebHair", texture_root, "hair"),
        "eyes": make_material("CortanaWebEyes", texture_root, "eyes"),
    }

    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            source_name = slot.material.name.lower() if slot.material else ""
            for key, replacement in materials.items():
                if key in source_name:
                    slot.material = replacement
                    break

    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_frame_step=2,
        export_materials="EXPORT",
    )


if __name__ == "__main__":
    main()
