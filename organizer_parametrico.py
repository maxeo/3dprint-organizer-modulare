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
        divider_mode="lane", wall_mm=3.2, divider_thickness_mm=2.4,
        groove_pitch_mm=20.0, groove_width_mm=3.0, groove_depth_mm=1.0,
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
    if h + gap < 65:
        raise ValueError("Il passo deve essere almeno 65 mm per separare le sedi dei traversi")
    if not 1 <= c["levels"] <= 8:
        raise ValueError("levels deve essere fra 1 e 8")
    if not 0 <= c["drawer_open_fraction"] <= 0.7:
        raise ValueError("drawer_open_fraction deve essere fra 0 e 0.7")
    if c["divider_mode"] not in ("open", "lane", "grid"):
        raise ValueError("divider_mode: open, lane oppure grid")
    if c["groove_pitch_mm"] < 10 or c["groove_width_mm"] <= c["divider_thickness_mm"]:
        raise ValueError("Passo o larghezza delle scanalature non validi")
    if not 0.4 <= c["groove_depth_mm"] <= wall - 1.2:
        raise ValueError("La scanalatura lascerebbe una parete esterna troppo sottile")


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
    # Mortase cieche sui lati interni. I due assi sono sfalsati in quota,
    # cosi' le sedi dei longheroni laterali e posteriori non si intersecano.
    side_inner_y = -1 if y < 0 else 1
    for center_z in (z + 11, z + pitch - 11):
        cy = y - side_inner_y * (size / 2 - 4.15)
        cut = box("_sede_laterale", (x, cy, center_z),
                  (6.7, 8.5, 5.7), col, mat)
        apply_boolean(body, cut, "DIFFERENCE")
    if y > 0:
        side_inner_x = -1 if x < 0 else 1
        for center_z in (z + 22, z + pitch - 22):
            cx = x - side_inner_x * (size / 2 - 4.15)
            cut = box("_sede_posteriore", (cx, y, center_z),
                      (8.5, 6.7, 5.7), col, mat)
            apply_boolean(body, cut, "DIFFERENCE")
    body["parte"] = "montante"
    body["sede_mm"] = joint + 2 * clearance
    body["tenone_mm"] = joint
    return body


def rail(name, axis, center, span, z, c, col, mat, guide_side=0):
    """Trave con due tenoni 6 x 5 x 8 mm e sedi eventuali per la guida."""
    x, y = center
    post_size = c["post_mm"]
    full_span = span - 2 * post_size
    dims = (10, full_span, 8) if axis == "Y" else (full_span, 10, 8)
    body = box(name, (x, y, z), dims, col, mat)
    for sign in (-1, 1):
        if axis == "Y":
            tc = (x, y + sign * (full_span / 2 + 3.9), z)
            ts = (6, 8.2, 5)
        else:
            tc = (x + sign * (full_span / 2 + 3.9), y, z)
            ts = (8.2, 6, 5)
        apply_boolean(body, box("_tenone_trave", tc, ts, col, mat), "UNION")
    if guide_side:
        # Tre mortase cieche sul lato interno del longherone basso.
        gx = guide_side * (abs(x) - 2.85)
        offset = min(80, full_span / 2 - 15)
        for gy in (-offset, 0, offset):
            cut = box("_sede_guida", (gx, gy, z + 0.6),
                      (4.5, 10.7, 3.7), col, mat)
            apply_boolean(body, cut, "DIFFERENCE")
    body["giunto"] = "tenoni 6x5x8 mm, gioco 0.35 mm per lato"
    return body


def fixed_guide(name, sign, inner_face, rail_len, z, vertical, col, mat):
    """Guida a L monopezzo, con tre linguette verso il longherone."""
    gx = sign * (inner_face + 2)
    guide = box(name, (gx, 0, z + 15), (4, rail_len, 12), col, mat)
    lx = sign * (inner_face - 1)
    ledge = box("_appoggio_guida", (lx, 0, z + 11 - vertical - 1.5),
                (8, rail_len, 3), col, mat)
    apply_boolean(guide, ledge, "UNION")
    offset = min(80, rail_len / 2 - 15)
    for gy in (-offset, 0, offset):
        tab = box("_linguetta_guida", (sign * (inner_face + 6.9), gy, z + 11.6),
                  (6.2, 10, 3), col, mat)
        apply_boolean(guide, tab, "UNION")
    guide["fissaggio"] = "3 linguette nelle sedi del longherone basso"
    return guide


def add_tray_handle(tray, cy, z, h, td, wall, col, mat):
    """Presa incassata sul bordo alto del frontale, senza sporgenza."""
    front = cy - td / 2
    notch = box("_presa_integrata", (0, front + wall / 2, z + h - 4.9),
                (42, wall + 0.4, 10.2), col, mat)
    apply_boolean(tray, notch, "DIFFERENCE")
    lip = box("_labbro_presa", (0, front - 0.75, z + h - 11.3),
              (42, 3.5, 3.5), col, mat)
    apply_boolean(tray, lip, "UNION")
    tray["maniglia"] = "incavo 42 x 10 mm con labbro da 2.5 mm"


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


def slot_positions(span, pitch, margin=12):
    limit = span / 2 - margin
    return [i * pitch for i in range(-int(limit // pitch), int(limit // pitch) + 1)]


def multi_box_cutter(name, boxes, col):
    verts, faces = [], []
    for cx, cy, cz, sx, sy, sz in boxes:
        x0, x1 = cx - sx / 2, cx + sx / 2
        y0, y1 = cy - sy / 2, cy + sy / 2
        z0, z1 = cz - sz / 2, cz + sz / 2
        start = len(verts)
        verts.extend([(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),
                      (x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)])
        faces.extend([tuple(start+i for i in face) for face in
                      ((3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),
                       (2,3,7,6),(3,0,4,7))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v * MM for v in xyz) for xyz in verts], [], faces)
    mesh.update()
    cutter = bpy.data.objects.new(name, mesh)
    col.objects.link(cutter)
    return cutter


def cut_tray_grooves(tray, c, cx, cy, z, tw, td, col):
    wall = c["wall_mm"]
    pitch = c["groove_pitch_mm"]
    width = c["groove_width_mm"]
    depth = c["groove_depth_mm"]
    height = min(30, c["tray_height_mm"] - wall - 4)
    xs = slot_positions(tw - 2 * wall, pitch)
    ys = slot_positions(td - 2 * wall, pitch)
    floor = z + wall
    zz = floor + height / 2
    cut_span = depth + 0.2
    boxes = []
    for x in xs:
        boxes.append((cx+x, cy-td/2+wall-(depth-0.2)/2, zz,
                      width, cut_span, height))
        boxes.append((cx+x, cy+td/2-wall+(depth-0.2)/2, zz,
                      width, cut_span, height))
    for y in ys:
        boxes.append((cx-tw/2+wall-(depth-0.2)/2, cy+y, zz,
                      cut_span, width, height))
        boxes.append((cx+tw/2-wall+(depth-0.2)/2, cy+y, zz,
                      cut_span, width, height))
    cutter = multi_box_cutter("_scanalature_cassetto", boxes, col)
    apply_boolean(tray, cutter, "DIFFERENCE")
    tray["passo_scanalature_mm"] = pitch
    tray["sedi_per_lato_frontale"] = len(xs)
    tray["sedi_per_lato_laterale"] = len(ys)
    return xs, ys


def make_dividers(c, cx, cy, z, tw, td, col, mat):
    mode = c["divider_mode"]
    if mode == "open":
        return
    wall = c["wall_mm"]
    h = min(30, c["tray_height_mm"] - wall - 4)
    thick = c["divider_thickness_mm"]
    groove = c["groove_depth_mm"]
    slot_width = c["groove_width_mm"]
    pitch = c["groove_pitch_mm"]
    floor = z + wall
    longitudinal = box("Divisorio_longitudinale", (cx, cy, floor + h / 2),
                       (thick, td - 2 * wall + 2 * groove - 0.4, h), col, mat)
    yslots = slot_positions(td - 2 * wall, pitch)
    notches = [(cx, cy+y, floor + 3*h/4, thick+1, slot_width, h/2+0.1)
               for y in yslots]
    apply_boolean(longitudinal,
                  multi_box_cutter("_intagli_divisorio_lungo", notches, col),
                  "DIFFERENCE")
    longitudinal["intagli_trasversali"] = len(yslots)
    if mode == "grid":
        target = (td - 2 * wall) / 4
        selected = [min(yslots, key=lambda y: abs(y - wanted))
                    for wanted in (-target, 0, target)]
        for i, y in enumerate(dict.fromkeys(selected), 1):
            cross = box(f"Divisorio_trasversale_{i}",
                        (cx, cy+y, floor + h/2),
                        (tw - 2*wall + 2*groove - 0.4, thick, h), col, mat)
            notch = multi_box_cutter("_intaglio_divisorio_traverso",
                                     [(cx, cy+y, floor+h/4,
                                       slot_width, thick+1, h/2+0.1)], col)
            apply_boolean(cross, notch, "DIFFERENCE")
            cross["posizione_sede_mm"] = y


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
            sign = -1 if sx == "S" else 1
            for tag, rail_z in (("bassa", z + 11), ("alta", z + pitch - 11)):
                rail(f"Longherone_{sx}_{tag}", "Y", (xpos, 0), d, rail_z,
                     c, frame, frame_mat, guide_side=sign if tag == "bassa" else 0)
            inner_face = tw / 2 + side
            fixed_guide(f"Guida_{sx}", sign, inner_face, rail_len,
                        z, vertical, guides, guide_mat)

        for tag, rail_z in (("bassa", z + 22), ("alta", z + pitch - 22)):
            rail(f"Traversa_posteriore_{tag}", "X",
                 (0, d / 2 - post_size / 2), w, rail_z,
                 c, frame, frame_mat)

        tray_y = -3 + (drawer_shift if level == opening_level else 0)
        tray = tray_mesh(f"Cassetto_L{level + 1}", 0, tray_y, z + 11,
                         tw, td, h, wall, tray_col, tray_mat)
        cut_tray_grooves(tray, c, 0, tray_y, z + 11, tw, td, tray_col)
        add_tray_handle(tray, tray_y, z + 11, h, td, wall, tray_col, tray_mat)
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
    scene["Organizer | passo scanalature mm"] = c["groove_pitch_mm"]
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    bpy.context.view_layer.objects.active = None
    return root


def export_first_level_stls(output_dir, copies=3):
    """Esporta i pezzi del primo modulo come STL in mm, con manifest per la guida.

    Ogni STL ha il minimo degli assi in 0; assembled_bounds nel manifest
    permette di ricomporre le posizioni originali nella vista interattiva.
    """
    import json
    import pathlib
    import re
    import struct

    root = bpy.data.collections.get(ROOT_NAME)
    if not root or not root.children:
        raise RuntimeError("Eseguire build_organizer prima dell'esportazione")
    level = root.children.get("Livello_01")
    if level is None:
        raise RuntimeError("Livello_01 non trovato")
    out = pathlib.Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    records = []
    for index, obj in enumerate(sorted(level.all_objects, key=lambda o: o.name), 1):
        if obj.type != "MESH":
            continue
        ev = obj.evaluated_get(depsgraph)
        mesh = ev.to_mesh()
        try:
            mesh.calc_loop_triangles()
            world = [obj.matrix_world @ v.co for v in mesh.vertices]
            mins = [min(v[i] for v in world) for i in range(3)]
            maxs = [max(v[i] for v in world) for i in range(3)]
            slug = re.sub(r"[^A-Za-z0-9_]+", "_", obj.name)
            filename = f"P{index:02d}_{slug}.stl"
            triangles = []
            for tri in mesh.loop_triangles:
                points = [tuple((world[j][axis] - mins[axis]) * 1000
                                for axis in range(3)) for j in tri.vertices]
                a, b, c = [Vector(p) for p in points]
                normal = (b - a).cross(c - a)
                if normal.length < 1e-9:
                    continue
                normal.normalize()
                triangles.append((tuple(normal), *points))
            with (out / filename).open("wb") as file:
                file.write(("Organizer parametrico | " + obj.name).encode("ascii", "replace")[:80].ljust(80, b" "))
                file.write(struct.pack("<I", len(triangles)))
                for normal, a, b, c in triangles:
                    file.write(struct.pack("<12fH", *(normal + a + b + c), 0))
            records.append(dict(
                id=f"P{index:02d}", name=obj.name, file=f"stl/{filename}",
                assembled_bounds=[[round(mins[i] * 1000, 4), round(maxs[i] * 1000, 4)]
                                  for i in range(3)],
                dimensions_mm=[round((maxs[i] - mins[i]) * 1000, 4) for i in range(3)],
                triangles=len(triangles), copies=copies,
            ))
        finally:
            ev.to_mesh_clear()
    manifest = dict(
        note="Tenoni laterali e posteriori con sedi cieche; guide a linguette e maniglia integrata. Verificare giochi e carico con provini.",
        unit="mm", source_blend=bpy.data.filepath, parts=records,
    )
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print("Esportati", len(records), "STL in", out)
    return manifest


# Cambiare questa riga per creare nuove tipologie e misure.
CONFIG = make_config("standard", levels=3, divider_mode="lane", drawer_open_fraction=0.32)
build_organizer(CONFIG)
# Per aggiornare gli STL dopo una modifica a CONFIG, decommentare la riga seguente
# e usare Alt+P nel Text Editor. Gli STL esistenti con lo stesso nome saranno aggiornati.
# export_first_level_stls(r"D:\3D Print\Organizer Modulare\stl", copies=CONFIG["levels"])
print("Organizer rigenerato:", CONFIG)
