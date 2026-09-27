"""Base parametrica per organizer modulare in Blender.

Unita' di input: millimetri. Modificare CONFIG in fondo e premere Alt+P
nel Text Editor di Blender per rigenerare la collezione Organizer_Generato.
Il modello e' una base di progetto; calibrare e provare gli incastri prima
della stampa e scomporre i componenti se superano il piatto della stampante.
"""

import bpy
import math
import bmesh
from mathutils import Vector

MM = 0.001
ROOT_NAME = "Organizer_Generato"
PRINT_BED_MM = 230

PRESETS = {
    # Tutti i pezzi entrano in un piatto 230 x 230 mm (PRINT_BED_MM).
    "standard": dict(width_mm=250, depth_mm=240, tray_height_mm=48, clearance_above_mm=58),
    "mezzo": dict(width_mm=140, depth_mm=240, tray_height_mm=48, clearance_above_mm=58),
    "basso": dict(width_mm=250, depth_mm=240, tray_height_mm=30, clearance_above_mm=40),
    "alto": dict(width_mm=250, depth_mm=240, tray_height_mm=80, clearance_above_mm=70),
    "compatto": dict(width_mm=200, depth_mm=200, tray_height_mm=48, clearance_above_mm=58),
}


def make_config(preset="standard", **overrides):
    if preset not in PRESETS:
        raise ValueError(f"Preset sconosciuto: {preset}")
    cfg = dict(PRESETS[preset])
    cfg.update(dict(
        preset=preset, levels=3, drawer_open_fraction=0.0,
        divider_mode="modulare", dividers_long=1, dividers_cross=0,
        divider_layout=None, wall_mm=3.2, divider_thickness_mm=2.4,
        groove_pitch_mm=20.0, groove_width_mm=3.0, groove_depth_mm=1.0,
        side_clearance_mm=0.5, vertical_clearance_mm=0.4,
        post_mm=22.0, joint_mm=8.0, joint_clearance_mm=0.35,
        wheels=4,
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
    if wheel_count(c) not in WHEEL_COUNTS:
        raise ValueError("Ruote: 0, 4, 6, 8 oppure 10")
    if wheel_count(c):
        wheel_ys(c)
    if c["divider_mode"] not in ("modulare", "disegno", "open", "lane", "grid"):
        raise ValueError("divider_mode: modulare, disegno (oppure i vecchi open, lane, grid)")
    if c["groove_pitch_mm"] < 10 or c["groove_width_mm"] <= c["divider_thickness_mm"]:
        raise ValueError("Passo o larghezza delle scanalature non validi")
    if not 0.4 <= c["groove_depth_mm"] <= wall - 1.2:
        raise ValueError("La scanalatura lascerebbe una parete esterna troppo sottile")
    divider_runs(c, *tray_size(c))


# Ruote (0, 4, 6, 8 o 10; standard 4) sotto il cassetto, su perno 3,42 (accoppiamento tarato con i perni
# Sakura in sedi da 3,4). La ruota sporge WHEEL["drop"] sotto il fondo e corre sulla mensola della
# guida, abbassata di conseguenza: il cassetto resta alla stessa quota. Sedi del perno quadrate.
WHEEL = dict(d=10.0, w=3.0, bore=3.8, pin=3.42, hole=3.4, drop=2.0, slot=3.6, gap=0.8, seg=48, pin_seg=24)
WHEEL_BOSS = WHEEL["d"] + 2 * WHEEL["gap"] + 4


WHEEL_COUNTS = (0, 4, 6, 8, 10)


def wheel_count(c):
    """Ruote totali; True/False valgono 4/0."""
    w = c.get("wheels", 0)
    return 4 if w is True else 0 if not w else int(round(w))


def wheel_ys(c):
    """Posizioni delle ruote lungo Y (dal centro del cassetto), uguali sui due lati, fuori dalle sedi.

    Le estreme fra l'ultima sede e la parete di fondo (o fra le ultime due sedi), le intermedie a
    meta' fra due sedi, distribuite il piu' possibile uniformi. Come wheelYs() in geometria.js.
    """
    td = c["depth_mm"] - c["post_mm"] - 8
    ys = slot_positions(td - 2 * c["wall_mm"], c["groove_pitch_mm"])
    gw, pitch = c["groove_width_mm"], c["groove_pitch_mm"]
    end, last, need = td / 2 - c["wall_mm"], ys[-1] + gw / 2, WHEEL_BOSS + 1
    k = wheel_count(c) // 2
    if end - last >= need:
        yo = (end + last) / 2
    elif len(ys) > 1 and pitch - gw >= need:
        yo = ys[-1] - pitch / 2
    else:
        raise ValueError("Con le ruote servono almeno 17,6 mm liberi fra l'ultima sede e il fondo del cassetto")
    out = [-yo, yo]
    free = [(a + b) / 2 for a, b in zip(ys, ys[1:])] if pitch - gw >= need else []
    free = [y for y in free if abs(y) < yo - WHEEL_BOSS - 0.5]
    for j in range(1, k - 1):
        t = -yo + 2 * yo * j / (k - 1)
        left = sorted((y for y in free if y not in out), key=lambda y: abs(y - t))
        if not left:
            raise ValueError(f"Non c'e' posto per {2 * k} ruote fra le sedi dei divisori")
        out.append(left[0])
    return sorted(out)


def tube_x(name, ro, ri, length, seg, center, col, mat):
    """Cilindro (cavo se ri > 0) con asse X: stessi vertici del tube() di geometria.js."""
    cx, cy, cz = center
    rings = [(ro, 0), (ro, length)] + ([(ri, length), (ri, 0)] if ri > 0 else [])
    verts = [(cx - length / 2 + w, cy + r * math.cos(2 * math.pi * i / seg), cz + r * math.sin(2 * math.pi * i / seg))
             for r, w in rings for i in range(seg)]
    n = len(rings)
    faces = [(k * seg + i, k * seg + (i + 1) % seg, ((k + 1) % n) * seg + (i + 1) % seg, ((k + 1) % n) * seg + i)
             for k in range(n if ri > 0 else 1) for i in range(seg)]
    if ri <= 0:
        faces += [tuple(reversed(range(seg))), tuple(range(seg, 2 * seg))]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v * MM for v in p) for p in verts], [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    col.objects.link(ob)
    mesh.materials.append(mat)
    return ob


def add_wheels(tray, c, cy, tw, col, mat):
    """Supporti e sedi nel cassetto, 4 ruote e 4 perni. Solo il primo di ogni tipo va esportato."""
    wall, wy = c["wall_mm"], wheel_ys(c)
    wall_in = tw / 2 - wall
    wz = 11 - WHEEL["drop"] + WHEEL["d"] / 2
    pin_len = WHEEL["slot"] + 2.2 + wall - 0.3
    bosses, slots, holes = [], [], []
    for sg in (-1, 1):
        for yw in (cy + y for y in wy):
            def span(a, b):
                return min(sg * a, sg * b), max(sg * a, sg * b)
            b0, b1 = span(wall_in - WHEEL["slot"] - 2.2, wall_in + 0.5)
            s0, s1 = span(wall_in - WHEEL["slot"], wall_in)
            h0, h1 = span(wall_in - WHEEL["slot"] - 2.3, tw / 2 + 0.1)
            top = wz + WHEEL["d"] / 2 + WHEEL["gap"] + 2
            bosses.append(((b0 + b1) / 2, yw, (11.5 + top) / 2, b1 - b0, WHEEL_BOSS, top - 11.5))
            slot_top = wz + WHEEL["d"] / 2 + WHEEL["gap"]
            slots.append(((s0 + s1) / 2, yw, (10.9 + slot_top) / 2, s1 - s0, WHEEL["d"] + 2 * WHEEL["gap"], slot_top - 10.9))
            holes.append(((h0 + h1) / 2, yw, wz, h1 - h0, WHEEL["hole"], WHEEL["hole"]))
            k = len(bosses)
            wheel = tube_x("Ruota_cassetto" if k == 1 else f"Ruota_cassetto_{k}", WHEEL["d"] / 2, WHEEL["bore"] / 2, WHEEL["w"],
                           WHEEL["seg"], (sg * (wall_in - WHEEL["slot"] / 2), yw, wz), col, mat)
            pin = tube_x("Perno_ruota" if k == 1 else f"Perno_ruota_{k}", WHEEL["pin"] / 2, 0, pin_len,
                         WHEEL["pin_seg"], (sg * (tw / 2 - 0.3 - pin_len / 2), yw, wz), col, mat)
            for ob in (wheel, pin):
                ob["quantita"] = 2 * len(wy)
                if k > 1:
                    ob["copia"] = True
    apply_boolean(tray, multi_box_cutter("_supporti_ruote", bosses, col), "UNION")
    # sedi e fori si incrociano: si tolgono in due passate, ognuna con box separati
    apply_boolean(tray, multi_box_cutter("_sedi_ruote", slots, col), "DIFFERENCE")
    apply_boolean(tray, multi_box_cutter("_fori_perni", holes, col), "DIFFERENCE")
    tray["ruote"] = f"{2 * len(wy)} ruote Ø{WHEEL['d']:g} x {WHEEL['w']:g} su perno Ø{WHEEL['pin']} x {pin_len:.1f}"


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


# Gancio a L in punta ai tenoni dei traversi: il traverso entra sollevato,
# poi scende di HOOK_MM e resta agganciato al montante. Sopra il tenone
# montato resta una luce di HOOK_MM nella sede.
HOOK_MM = 1.5
HOOK_LEN_MM = 3.0
# Longherone basso alzato di HOOK_MM (era 11) per non avvicinare la tasca
# del gancio alla sede verticale di impilamento.
LOW_SIDE_RAIL_Z = 12.5


def mortise_l(body, name, axis, cx, cy, inward, center_z, col):
    """Sede 6,7 x 8,5 alta 5,7 + HOOK_MM, con tasca del gancio sul fondo.

    inward: verso (+1/-1) lungo axis dalla faccia del montante al fondo sede.
    """
    depth, width, height = 8.5, 6.7, 5.7
    main_z = center_z + HOOK_MM / 2
    pocket_len = HOOK_LEN_MM + 0.7
    pocket_off = inward * (depth / 2 - pocket_len / 2)
    pocket_z = center_z - height / 2 - HOOK_MM / 2 + 0.05
    if axis == "Y":
        boxes = [(cx, cy, main_z, width, depth, height + HOOK_MM),
                 (cx, cy + pocket_off, pocket_z, width, pocket_len, HOOK_MM + 0.1)]
    else:
        boxes = [(cx, cy, main_z, depth, width, height + HOOK_MM),
                 (cx + pocket_off, cy, pocket_z, pocket_len, width, HOOK_MM + 0.1)]
    # I due box si sovrappongono: fonderli prima evita gusci interni spuri.
    main, pocket = [multi_box_cutter(name, [b], col) for b in boxes]
    apply_boolean(main, pocket, "UNION")
    apply_boolean(body, main, "DIFFERENCE")


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
    # Mortase cieche a L sui lati interni. I due assi sono sfalsati in quota,
    # cosi' le sedi dei longheroni laterali e posteriori non si intersecano.
    side_inner_y = -1 if y < 0 else 1
    for center_z in (z + LOW_SIDE_RAIL_Z, z + pitch - 11):
        cy = y - side_inner_y * (size / 2 - 4.15)
        mortise_l(body, "_sede_laterale", "Y", x, cy, side_inner_y,
                  center_z, col)
    if y > 0:
        side_inner_x = -1 if x < 0 else 1
        for center_z in (z + 22, z + pitch - 22):
            cx = x - side_inner_x * (size / 2 - 4.15)
            mortise_l(body, "_sede_posteriore", "X", cx, y, side_inner_x,
                      center_z, col)
    body["parte"] = "montante"
    body["sede_mm"] = joint + 2 * clearance
    body["tenone_mm"] = joint
    return body


def rail(name, axis, center, span, z, c, col, mat):
    """Trave con due tenoni 6 x 5 x 8 mm con gancio a L."""
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
        # Dente del gancio: ultimi HOOK_LEN_MM del tenone, verso il basso.
        tip = full_span / 2 + 7.9 - HOOK_LEN_MM / 2
        hz = z - 2.5 - HOOK_MM / 2 + 0.1
        if axis == "Y":
            hc, hs = (x, y + sign * tip, hz), (6, HOOK_LEN_MM, HOOK_MM + 0.2)
        else:
            hc, hs = (x + sign * tip, y, hz), (HOOK_LEN_MM, 6, HOOK_MM + 0.2)
        apply_boolean(body, box("_gancio_tenone", hc, hs, col, mat), "UNION")
    body["giunto"] = "tenoni 6x5x8 mm con gancio a L 1,5 mm, gioco 0.35 mm per lato"
    return body


def side_guide_rail(name, sign, xpos, inner_face, stop_y, z, c, col, mat):
    """Longherone basso, guida a L e fermo posteriore in un unico pezzo.

    Una nervatura continua unisce guida e longherone per tutta la luce.
    """
    d = c["depth_mm"]
    rail_len = d - 2 * c["post_mm"]
    body = rail(name, "Y", (xpos, 0), d, z + LOW_SIDE_RAIL_Z, c, col, mat)
    if wheel_count(c):
        # con le ruote la mensola scende di WHEEL["drop"] e si allarga verso l'interno fino sotto le ruote
        tw = c["width_mm"] - 2 * c["post_mm"] - 2 * c["side_clearance_mm"]
        ledge_in, ledge_top = tw / 2 - c["wall_mm"] - 4.5, 11 - WHEEL["drop"]
        guide = box("_guida", (sign * (inner_face + 2), 0, z + (ledge_top - 3 + 21) / 2),
                    (4, rail_len, 21 - ledge_top + 3), col, mat)
        ledge = box("_appoggio_guida", (sign * (ledge_in + inner_face + 3) / 2, 0, z + ledge_top - 1.5),
                    (inner_face + 3 - ledge_in, rail_len, 3), col, mat)
    else:
        guide = box("_guida", (sign * (inner_face + 2), 0, z + 15),
                    (4, rail_len, 12), col, mat)
        ledge = box("_appoggio_guida",
                    (sign * (inner_face - 1), 0, z + 11 - c["vertical_clearance_mm"] - 1.5),
                    (8, rail_len, 3), col, mat)
    apply_boolean(body, guide, "UNION")
    apply_boolean(body, ledge, "UNION")
    rail_inner = abs(xpos) - 5
    web_x0, web_x1 = inner_face + 3, rail_inner + 1
    web = box("_nervatura_guida", (sign * (web_x0 + web_x1) / 2, 0, z + 12.5),
              (web_x1 - web_x0, rail_len, 5), col, mat)
    apply_boolean(body, web, "UNION")
    stop = box("_fermo", (sign * (inner_face + 1), stop_y, z + 9),
               (3, 7, 5), col, mat)
    apply_boolean(body, stop, "UNION")
    body["parte"] = "longherone basso + guida + fermo"
    return body


def add_tray_handle(tray, cy, z, h, td, tw, wall, col, mat):
    """Presa a tasca: retro diritto e guscio esterno curvo, aperto sopra."""
    front, top = cy - td / 2, z + h
    sections, profile_steps = 32, 12
    half_width = min(30, (tw - 2 * wall) / 2 - 8)
    max_drop = min(22, h - 5)

    def depth_at(taper, s):
        return 0.5 + taper * (14 * (1 - s * s) + 1.5 * math.sin(math.pi * s))

    def volume(name, half_width, hollow):
        verts = []
        for i in range(sections + 1):
            x = -half_width + 2 * half_width * i / sections
            taper = max(0, 1 - (x / half_width) ** 2) ** 1.2
            drop = 5 + (max_drop - 5) * taper
            for j in range(profile_steps + 1):
                v = j / profile_steps
                if hollow:
                    zz = top + 2 - (drop - 0.2) * v
                    s = min(1, max(0, (top - zz) / drop))
                    depth = max(0.3, depth_at(taper, s) - 1.8)
                    back = front + wall + 2.0
                else:
                    zz = top + 0.2 - (drop + 0.2) * v
                    depth = depth_at(taper, v)
                    back = front + 1.5
                verts.append(Vector((x, front - depth, zz)))
            verts.append(Vector((x, back, zz)))
            verts.append(Vector((x, back, top + 2 if hollow else top + 0.2)))
        ring = profile_steps + 3
        faces = [tuple(reversed(range(ring))),
                 tuple(range(sections * ring, (sections + 1) * ring))]
        for i in range(sections):
            for j in range(ring):
                k = (j + 1) % ring
                faces.append((i * ring + j, i * ring + k,
                              (i + 1) * ring + k, (i + 1) * ring + j))
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata([tuple(v * MM for v in p) for p in verts], [], faces)
        mesh.update()
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
        ob = bpy.data.objects.new(name, mesh)
        col.objects.link(ob)
        mesh.materials.append(mat)
        return ob

    apply_boolean(tray, volume("_guscio_presa", half_width, False), "UNION")
    apply_boolean(tray, volume("_vuoto_presa", half_width - 4, True), "DIFFERENCE")
    tray["maniglia"] = "presa cava a mezza C, aperta sopra, sporgenza 15 mm"


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


# Divisori. 'modulare': dividers_long longitudinali (fronte-fondo) e dividers_cross trasversali (sponda-sponda),
# distribuiti sulle sedi; ogni pezzo ha un intaglio a ogni sede, quindi si sposta e si incrocia liberamente.
# 'disegno': divider_layout = {"v": ["i:k", ...], "h": ["j:k", ...]}, tratti fra sedi vicine (lo schema del modale della
# guida): v "i:k" e' il longitudinale sulla sede xs[i] fra i nodi yn[k] e yn[k+1], h "j:k" il trasversale sulla sede
# ys[j] fra xn[k] e xn[k+1]; pezzi su misura, intaglio a ogni sede attraversata e giunto a T dove un pezzo
# finisce contro un altro. Intagli a mezzo legno da un lato solo:
# longitudinali da sopra, trasversali da sotto. Vecchie modalita': open = 0+0, lane = 1+0, grid = 1+3.
DIVIDER_TEE = 4.0  # sporgenza a tutta altezza oltre il pezzo attraversato, nei giunti a T
# Pezzi gemelli: stessa forma per semplice traslazione (i longheroni guida no: il fermo posteriore li rende speculari).
TWINS = (("Longherone_D_alta", "Longherone_S_alta", "Longherone_alta"),
         ("Montante_DF_L1", "Montante_SF_L1", "Montante_anteriore_L1"),
         ("Traversa_posteriore_alta", "Traversa_posteriore_bassa", "Traversa_posteriore"))


def same_shape(a, b, depsgraph, tol=1e-5):
    """Vertici uguali a meno di una traslazione (coordinate in metri, arrotondate a 10 micron)."""
    def key(ob):
        ev = ob.evaluated_get(depsgraph)
        me = ev.to_mesh()
        try:
            pts = [ob.matrix_world @ v.co for v in me.vertices]
            lo = [min(p[i] for p in pts) for i in range(3)]
            return sorted(tuple(round((p[i] - lo[i]) / tol) for i in range(3)) for p in pts), len(me.polygons)
        finally:
            ev.to_mesh_clear()
    return key(a) == key(b)


def part_letter(name):
    """Lettera della sigla: stessa regola dei gruppi della guida e di geometria.js."""
    for prefix, letter in (("Cassetto", "C"), ("Divisorio", "D"), ("Longherone_guida", "G"),
                           ("Ruota", "R"), ("Perno", "R")):
        if name.startswith(prefix):
            return letter
    return "T"


LEGACY_DIVIDERS = {"open": (0, 0), "lane": (1, 0), "grid": (1, 3)}


def tray_size(c):
    return (c["width_mm"] - 2 * c["post_mm"] - 2 * c["side_clearance_mm"],
            c["depth_mm"] - c["post_mm"] - 8)


def spread_on(slots, n, span, what):
    out = []
    for i in range(1, n + 1):
        target = -span / 2 + span * i / (n + 1)
        free = sorted((v for v in slots if v not in out), key=lambda v: abs(v - target))
        if not free:
            raise ValueError(f"Ci sono solo {len(slots)} sedi per i divisori {what}")
        out.append(free[0])
    return sorted(out)


def divider_runs(c, tw, td):
    wall, gd, t = c["wall_mm"], c["groove_depth_mm"], c["divider_thickness_mm"] / 2
    gw = c["groove_width_mm"]
    xs = slot_positions(tw - 2 * wall, c["groove_pitch_mm"])
    ys = slot_positions(td - 2 * wall, c["groove_pitch_mm"])
    xn = [-(tw / 2 - wall)] + xs + [tw / 2 - wall]
    yn = [-(td / 2 - wall)] + ys + [td / 2 - wall]
    mode = c["divider_mode"]
    v, h = set(), set()
    if mode == "disegno":
        layout = c.get("divider_layout") or {}
        for e in layout.get("v", []):
            i, k = map(int, e.split(":"))
            if 0 <= i < len(xs) and 0 <= k < len(yn) - 1:
                v.add((i, k))
        for e in layout.get("h", []):
            j, k = map(int, e.split(":"))
            if 0 <= j < len(ys) and 0 <= k < len(xn) - 1:
                h.add((j, k))
    else:
        n_long, n_cross = LEGACY_DIVIDERS.get(mode, (int(round(c.get("dividers_long", 0))),
                                                     int(round(c.get("dividers_cross", 0)))))
        for x in spread_on(xs, max(0, n_long), tw - 2 * wall, "longitudinali"):
            v.update((xs.index(x), k) for k in range(len(yn) - 1))
        for y in spread_on(ys, max(0, n_cross), td - 2 * wall, "trasversali"):
            h.update((ys.index(y), k) for k in range(len(xn) - 1))

    def v_at(a, b):
        return (a - 1, b - 1) in v or (a - 1, b) in v

    def h_at(a, b):
        return (b - 1, a - 1) in h or (b - 1, a) in h

    runs = []
    for axis, edges, lines, nodes in (("v", v, xs, yn), ("h", h, ys, xn)):
        for i in range(len(lines)):
            for k in range(len(nodes) - 1):
                if (i, k) not in edges or (k > 0 and (i, k - 1) in edges):
                    continue
                e = k + 1
                while e < len(nodes) - 1 and (i, e) in edges:
                    e += 1

                def wall_at(n):
                    return n in (0, len(nodes) - 1)

                def other(n):
                    return h_at(i + 1, n) if axis == "v" else v_at(n, i + 1)

                def end(n, sg):
                    # parete: dentro la sua sede; contro un perpendicolare (T o angolo): lo attraversa a mezzo legno e
                    # sporge di DIVIDER_TEE a tutta altezza (testa a T); nel vuoto: bordo del nodo
                    if wall_at(n):
                        return nodes[n] + sg * (gd - 0.2)
                    if other(n):
                        return nodes[n] + sg * (gw / 2 + DIVIDER_TEE)
                    return nodes[n] + sg * t

                # intaglio a ogni sede interna attraversata e sugli estremi con un perpendicolare
                cuts = [nodes[n] for n in range(k, e + 1)
                        if not wall_at(n) and (k < n < e or other(n))]
                runs.append(dict(axis=axis, line=lines[i], u0=end(k, -1), u1=end(e, 1), cuts=cuts))
    return runs


def make_dividers(c, cx, cy, z, tw, td, col, mat):
    wall = c["wall_mm"]
    h = min(30, c["tray_height_mm"] - wall - 4)
    thick = c["divider_thickness_mm"]
    slot_width = c["groove_width_mm"]
    floor = z + wall
    # un pezzo per forma: le copie uguali hanno "copia" (fuori dall'export) e tutte portano la quantita'
    types = {}
    for r in divider_runs(c, tw, td):
        key = (r["axis"], round(r["u1"] - r["u0"], 3), tuple(round(u - r["u0"], 3) for u in r["cuts"]))
        types.setdefault(key, []).append(r)
    for axis, base in (("v", "Divisorio_longitudinale"), ("h", "Divisorio_trasversale")):
        kinds = [runs for key, runs in types.items() if key[0] == axis]
        for n, runs in enumerate(kinds, 1):
            name = f"{base}_{n}" if len(kinds) > 1 else base
            for k, r in enumerate(runs, 1):
                u0, u1, L, mid = r["u0"], r["u1"], r["line"], (r["u0"] + r["u1"]) / 2
                if axis == "v":
                    ob = box(name if k == 1 else f"{name}_copia", (cx + L, cy + mid, floor + h / 2),
                             (thick, u1 - u0, h), col, mat)
                    notches = [(cx + L, cy + u, floor + 3 * h / 4, thick + 1, slot_width, h / 2 + 0.1) for u in r["cuts"]]
                else:
                    ob = box(name if k == 1 else f"{name}_copia", (cx + mid, cy + L, floor + h / 2),
                             (u1 - u0, thick, h), col, mat)
                    notches = [(cx + u, cy + L, floor + h / 4, slot_width, thick + 1, h / 2 + 0.1) for u in r["cuts"]]
                if notches:
                    apply_boolean(ob, multi_box_cutter("_intagli_divisorio", notches, col), "DIFFERENCE")
                ob["intagli"] = len(notches)
                ob["posizione_sede_mm"] = L
                ob["quantita"] = len(runs)
                if k > 1:
                    ob["copia"] = True


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
    wheel_mat = material("05 | Ocra ruote", (0.85, 0.64, 0.25, 1))

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
            rail(f"Longherone_{sx}_alta", "Y", (xpos, 0), d, z + pitch - 11,
                 c, frame, frame_mat)
            side_guide_rail(f"Longherone_guida_{sx}", sign, xpos, tw / 2 + side,
                            d / 2 - post_size - 8, z, c, guides, guide_mat)

        for tag, rail_z in (("bassa", z + 22), ("alta", z + pitch - 22)):
            rail(f"Traversa_posteriore_{tag}", "X",
                 (0, d / 2 - post_size / 2), w, rail_z,
                 c, frame, frame_mat)

        tray_y = -3 + (drawer_shift if level == opening_level else 0)
        tray = tray_mesh(f"Cassetto_L{level + 1}", 0, tray_y, z + 11,
                         tw, td, h, wall, tray_col, tray_mat)
        cut_tray_grooves(tray, c, 0, tray_y, z + 11, tw, td, tray_col)
        # ruote prima della presa: le booleane dopo la presa ne sporcano la mesh (bordi aperti)
        if wheel_count(c):
            add_wheels(tray, c, tray_y, tw, collection("05_Ruote", group), wheel_mat)
        add_tray_handle(tray, tray_y, z + 11, h, td, tw, wall, tray_col, tray_mat)
        tray["estrazione_frazione"] = c["drawer_open_fraction"] if level == opening_level else 0.0
        make_dividers(c, 0, tray_y, z + 11, tw, td, divider_col, detail_mat)

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
    records = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    parts = [o for o in sorted(level.all_objects, key=lambda o: o.name) if o.type == "MESH" and not o.get("copia")]
    # gemelli: stessa forma in due posizioni -> un solo STL con il nome comune e quantita' doppia
    names, twin_of = {o.name: o.name for o in parts}, {}
    for a, b, common in TWINS:
        oa, ob = level.all_objects.get(a), level.all_objects.get(b)
        if oa in parts and ob in parts and same_shape(oa, ob, depsgraph):
            parts.remove(ob)
            names[a] = common
            twin_of[a] = 2
        elif oa in parts and ob in parts:
            print(f"ATTENZIONE: {a} e {b} non sono piu' uguali, restano due STL")
    # sigla con la lettera del gruppo (C cassetto, D divisori, G guide, R ruote, T telaio), numerata dentro il gruppo
    ids, seen = {}, {}
    for obj in parts:
        letter = part_letter(names[obj.name])
        seen[letter] = seen.get(letter, 0) + 1
        ids[obj.name] = f"{letter}{seen[letter]:02d}"
    parts.sort(key=lambda o: ids[o.name])
    for obj in parts:
        part_id = ids[obj.name]
        ev = obj.evaluated_get(depsgraph)
        mesh = ev.to_mesh()
        try:
            # Triangola le facce con vertici collineari prima dell'STL:
            # evita bordi a T quando il visualizzatore rilegge il file.
            triangulated = bmesh.new()
            triangulated.from_mesh(mesh)
            bmesh.ops.triangulate(triangulated, faces=list(triangulated.faces),
                                  quad_method="BEAUTY", ngon_method="BEAUTY")
            triangulated.to_mesh(mesh)
            triangulated.free()
            mesh.calc_loop_triangles()
            world = [obj.matrix_world @ v.co for v in mesh.vertices]
            mins = [min(v[i] for v in world) for i in range(3)]
            maxs = [max(v[i] for v in world) for i in range(3)]
            slug = re.sub(r"[^A-Za-z0-9_]+", "_", names[obj.name])
            filename = f"{part_id}_{slug}.stl"
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
                id=part_id, name=names[obj.name], file=f"stl/{filename}",
                assembled_bounds=[[round(mins[i] * 1000, 4), round(maxs[i] * 1000, 4)]
                                  for i in range(3)],
                dimensions_mm=[round((maxs[i] - mins[i]) * 1000, 4) for i in range(3)],
                triangles=len(triangles), copies=copies * obj.get("quantita", 1) * twin_of.get(obj.name, 1),
            ))
        finally:
            ev.to_mesh_clear()
    manifest = dict(
        note="Tenoni con gancio a L e sedi cieche; longherone basso, guida e fermo in un unico pezzo; maniglia integrata. Pezzi entro un piatto 230 x 230 mm. Verificare giochi e carico con provini.",
        print_bed_mm=PRINT_BED_MM,
        unit="mm", source_blend=bpy.data.filepath, parts=records,
    )
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print("Esportati", len(records), "STL in", out)
    # Le due misure maggiori devono stare nel piatto (il pezzo poggia sulla faccia minore).
    for r in records:
        big = sorted(r["dimensions_mm"])[1:]
        if max(big) > PRINT_BED_MM:
            print(f"ATTENZIONE: {r['id']} {r['name']} {big[1]:.1f} x {big[0]:.1f} mm supera il piatto {PRINT_BED_MM} mm")
    return manifest


# Cambiare questa riga per creare nuove tipologie e misure.
CONFIG = make_config("standard", levels=3, drawer_open_fraction=0.32)
build_organizer(CONFIG)
# Per aggiornare gli STL dopo una modifica a CONFIG, decommentare la riga seguente
# e usare Alt+P nel Text Editor. Gli STL esistenti con lo stesso nome saranno aggiornati.
# export_first_level_stls(r"D:\3D Print\Organizer Modulare\stl", copies=CONFIG["levels"])
print("Organizer rigenerato:", CONFIG)
