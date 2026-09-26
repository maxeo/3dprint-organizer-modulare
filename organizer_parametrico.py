"""Base parametrica per organizer modulare in Blender.

Unita' di input: millimetri. Modificare CONFIG in fondo e premere Alt+P
nel Text Editor di Blender per rigenerare la collezione Organizer_Generato.
Il modello e' una base di progetto; calibrare e provare gli incastri prima
della stampa e scomporre i componenti se superano il piatto della stampante.
"""

import bpy
from mathutils import Vector

MM = 0.001
ROOT_NAME = "Organizer_Generato"

PRESETS = {
    "standard": dict(width_mm=320, depth_mm=340, tray_height_mm=48, clearance_above_mm=58),
    "mezzo": dict(width_mm=160, depth_mm=340, tray_height_mm=48, clearance_above_mm=58),
    "basso": dict(width_mm=320, depth_mm=340, tray_height_mm=30, clearance_above_mm=40),
    "alto": dict(width_mm=320, depth_mm=340, tray_height_mm=80, clearance_above_mm=70),
    "profondo": dict(width_mm=320, depth_mm=450, tray_height_mm=48, clearance_above_mm=58),
}


def make_config(preset="standard", **overrides):
    if preset not in PRESETS:
        raise ValueError(f"Preset sconosciuto: {preset}")
    cfg = dict(PRESETS[preset])
    cfg.update(dict(
        preset=preset, levels=3, drawer_open_fraction=0.0,
        divider_mode="lane", wall_mm=3.2,
        side_clearance_mm=0.5, vertical_clearance_mm=0.4,
        post_mm=22.0, joint_mm=8.0, joint_clearance_mm=0.35,
    ))
    cfg.update(overrides)
    return cfg


def validate(c):
    w, d = c["width_mm"], c["depth_mm"]
    h, gap = c["tray_height_mm"], c["clearance_above_mm"]
    post, wall = c["post_mm"], c["wall_mm"]
    if w <= 2 * post + 60 or d <= 2 * post + 80:
        raise ValueError("Larghezza/profondita' insufficiente per montanti e cassetto")
    if h < 20 or gap < 15 or wall < 2.0 or wall >= h / 3:
        raise ValueError("Altezza, luce o spessore parete non validi")
    if not 1 <= c["levels"] <= 8:
        raise ValueError("levels deve essere fra 1 e 8")
    if not 0 <= c["drawer_open_fraction"] <= 0.7:
        raise ValueError("drawer_open_fraction deve essere fra 0 e 0.7")
    if c["divider_mode"] not in ("open", "lane", "grid"):
        raise ValueError("divider_mode: open, lane oppure grid")


def material(name, rgba, metallic=0.0, roughness=0.45):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = rgba
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return m


def collection(name, parent):
    col = bpy.data.collections.new(name)
    parent.children.link(col)
    return col


def remove_collection_tree(col):
    """Rimuove anche i discendenti, evitando collezioni orfane a ogni rebuild."""
    for child in list(col.children):
        remove_collection_tree(child)
    bpy.data.collections.remove(col)


def move_to_collection(obj, col):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    col.objects.link(obj)
    return obj


def box(name, center_mm, size_mm, col, mat, bevel_mm=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=tuple(v * MM for v in center_mm))
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = tuple(v * MM for v in size_mm)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to_collection(ob, col)
    ob.data.materials.append(mat)
    if bevel_mm:
        mod = ob.modifiers.new("Raccordo estetico", "BEVEL")
        mod.width = bevel_mm * MM
        mod.segments = 2
        mod.affect = "EDGES"
        ob.modifiers.new("Normali pesate", "WEIGHTED_NORMAL")
    return ob


def apply_boolean(target, cutter, operation):
    bpy.context.view_layer.objects.active = target
    target.select_set(True)
    cutter.select_set(False)
    mod = target.modifiers.new("Incastro", "BOOLEAN")
    mod.operation = operation
    mod.solver = "EXACT"
    mod.object = cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    target.select_set(False)


def post(name, x, y, z, c, col, mat):
    size = c["post_mm"]
    pitch = c["tray_height_mm"] + c["clearance_above_mm"]
    joint = c["joint_mm"]
    clearance = c["joint_clearance_mm"]
    body = box(name, (x, y, z + pitch / 2), (size, size, pitch), col, mat)
    peg = box("_tenone_operazione", (x, y, z + pitch + 2.9),
              (joint, joint, 6.2), col, mat)
    apply_boolean(body, peg, "UNION")
    socket = box("_sede_operazione", (x, y, z + 3.75),
                 (joint + 2 * clearance, joint + 2 * clearance, 7.7), col, mat)
    apply_boolean(body, socket, "DIFFERENCE")
    body["parte"] = "montante"
    body["sede_mm"] = joint + 2 * clearance
    body["tenone_mm"] = joint
    return body


def tray_mesh(name, cx, cy, z, width, depth, height, wall, col, mat):
    ow, od = width / 2, depth / 2
    iw, idp = ow - wall, od - wall
    rings = [
        (ow, od, z), (ow, od, z + height),
        (iw, idp, z + height), (iw, idp, z + wall),
    ]
    vertices = []
    for hx, hy, zz in rings:
        vertices.extend([(cx - hx, cy - hy, zz), (cx + hx, cy - hy, zz),
                         (cx + hx, cy + hy, zz), (cx - hx, cy + hy, zz)])
    faces = [(3, 2, 1, 0), (12, 13, 14, 15)]
    for i in range(4):
        j = (i + 1) % 4
        faces.extend([(i, j, 4 + j, 4 + i),
                      (4 + i, 4 + j, 8 + j, 8 + i),
                      (8 + i, 8 + j, 12 + j, 12 + i)])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v * MM for v in xyz) for xyz in vertices], [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    col.objects.link(obj)
    mesh.materials.append(mat)
    obj["parte"] = "cassetto"
    obj["larghezza_esterna_mm"] = width
    obj["profondita_esterna_mm"] = depth
    obj["altezza_mm"] = height
    return obj


def make_dividers(c, cx, cy, z, tw, td, col, mat):
    mode = c["divider_mode"]
    if mode == "open":
        return
    wall = c["wall_mm"]
    h = min(30, c["tray_height_mm"] - wall - 4)
    thick = 2.4
    floor = z + wall
    box("Divisorio_longitudinale", (cx, cy, floor + h / 2),
        (thick, td - 2 * wall - 1, h), col, mat, 0.25)
    if mode == "grid":
        for i in (1, 2, 3):
            yy = cy - td / 2 + wall + (td - 2 * wall) * i / 4
            box(f"Divisorio_trasversale_{i}", (cx, yy, floor + h / 2),
                (tw - 2 * wall - 1, thick, h), col, mat, 0.25)


def build_organizer(c):
    validate(c)
    prior = bpy.data.collections.get(ROOT_NAME)
    if prior:
        for ob in list(prior.all_objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        remove_collection_tree(prior)

    root = collection(ROOT_NAME, bpy.context.scene.collection)
    root["configurazione"] = str(c)
    frame_mat = material("01 | Avorio telaio", (0.78, 0.73, 0.63, 1))
    guide_mat = material("02 | Grafite guide", (0.15, 0.17, 0.19, 1), 0.25)
    tray_mat = material("03 | Salvia cassetto", (0.30, 0.52, 0.43, 1))
    detail_mat = material("04 | Terracotta dettagli", (0.65, 0.32, 0.23, 1))

    w, d = c["width_mm"], c["depth_mm"]
    post_size, wall = c["post_mm"], c["wall_mm"]
    h = c["tray_height_mm"]
    pitch = h + c["clearance_above_mm"]
    side = c["side_clearance_mm"]
    vertical = c["vertical_clearance_mm"]
    tw = w - 2 * post_size - 2 * side
    td = d - post_size - 8
    drawer_shift = -td * c["drawer_open_fraction"]
    opening_level = 1 if c["levels"] > 1 else 0
    rail_len = d - 2 * post_size

    for level in range(c["levels"]):
        z = level * pitch
        group = collection(f"Livello_{level + 1:02d}", root)
        frame = collection("01_Telaio_portante", group)
        guides = collection("02_Guide_fisse", group)
        tray_col = collection("03_Cassetto", group)
        divider_col = collection("04_Divisori_rimovibili", group)

        for sx, xpos in (("S", -w / 2 + post_size / 2),
                         ("D", w / 2 - post_size / 2)):
            for sy, ypos in (("F", -d / 2 + post_size / 2),
                             ("R", d / 2 - post_size / 2)):
                post(f"Montante_{sx}{sy}_L{level + 1}", xpos, ypos, z,
                     c, frame, frame_mat)

        for sx, xpos in (("S", -w / 2 + post_size / 2),
                         ("D", w / 2 - post_size / 2)):
            for tag, rail_z in (("bassa", z + 4), ("alta", z + pitch - 4)):
                box(f"Longherone_{sx}_{tag}", (xpos, 0, rail_z),
                    (10, d - post_size, 8), frame, frame_mat, 0.7)
            inner_face = tw / 2 + side
            sign = -1 if sx == "S" else 1
            guide_x = sign * (inner_face + 2)
            box(f"Guida_{sx}_verticale", (guide_x, 0, z + 15),
                (4, rail_len, 12), guides, guide_mat, 0.35)
            ledge_x = sign * (inner_face - 1)
            ledge_top = z + 11 - vertical
            box(f"Guida_{sx}_appoggio", (ledge_x, 0, ledge_top - 1.5),
                (8, rail_len, 3), guides, guide_mat, 0.35)

        for tag, rail_z in (("bassa", z + 4), ("alta", z + pitch - 4)):
            box(f"Traversa_posteriore_{tag}",
                (0, d / 2 - post_size / 2, rail_z),
                (w - post_size, 10, 8), frame, frame_mat, 0.7)

        tray_y = -3 + (drawer_shift if level == opening_level else 0)
        tray = tray_mesh(f"Cassetto_L{level + 1}", 0, tray_y, z + 11,
                         tw, td, h, wall, tray_col, tray_mat)
        tray["estrazione_frazione"] = c["drawer_open_fraction"] if level == opening_level else 0.0
        make_dividers(c, 0, tray_y, z + 11, tw, td, divider_col, detail_mat)
        # I fermi sono separati e possono essere ricalibrati o rimossi.
        for sx in (-1, 1):
            box(f"Fermo_{'S' if sx < 0 else 'D'}", 
                (sx * (tw / 2 + side + 1), d / 2 - post_size - 8, z + 9),
                (3, 7, 5), guides, detail_mat, 0.35)

    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "MILLIMETERS"
    scene["Organizer | preset"] = c["preset"]
    scene["Organizer | L x P x telaio mm"] = f"{w} x {d} x {c['levels'] * pitch}"
    scene["Organizer | altezza con tenoni mm"] = c["levels"] * pitch + 6
    scene["Organizer | passo mm"] = pitch
    scene["Organizer | gioco laterale mm"] = side
    scene["Organizer | gioco verticale mm"] = vertical
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    bpy.context.view_layer.objects.active = None
    return root


# Cambiare questa riga per creare nuove tipologie e misure.
CONFIG = make_config("standard", levels=3, divider_mode="lane", drawer_open_fraction=0.32)
build_organizer(CONFIG)
print("Organizer rigenerato:", CONFIG)
