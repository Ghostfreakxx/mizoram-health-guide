#!/usr/bin/env python3
"""Builds the AI Hospital virtual guide (public/models/guide-*.glb).

Source data: the MakeHuman base mesh, shape targets, skeleton, skin weights,
expression targets and eye proxy, all released by the MakeHuman project under
CC0 1.0 (public domain). See scripts/avatar/README.md. This script is our own
code; it only reads those data files.

Pipeline
  1. shape the base mesh (adult woman, ~35 years, Asian ethnicity blend)
  2. build clothing (scrubs + white coat), hair, eyelashes, eyes, teeth
  3. vertex colours for skin, lips, brows, eyes
  4. simplified skeleton (identity rest rotations) + merged skin weights
  5. facial morph targets from the CC0 expression units
  6. write glTF binary (.glb); compression is done afterwards with
     gltf-transform (see build.sh)

Usage:  python3 build_guide.py <cache_dir> <out.glb>
Needs:  numpy, pillow
"""

import json
import struct
import sys
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

import numpy as np

RAW = "https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/"
WHEEL = "https://files.pythonhosted.org/packages/py3/m/makehuman/makehuman-1.3.2-py3-none-any.whl"
FILES = [
    "3dobjs/base.obj",
    "rigs/default.mhskel",
    "rigs/default_weights.mhw",
    "eyes/high-poly/high-poly.obj",
    "eyes/high-poly/high-poly.mhclo",
]

DM = 0.1  # MakeHuman units are decimetres

# ---------------------------------------------------------------- data


def fetch(cache: Path) -> None:
    cache.mkdir(parents=True, exist_ok=True)
    for f in FILES:
        p = cache / f
        if not p.exists():
            p.parent.mkdir(parents=True, exist_ok=True)
            print("download", f)
            urllib.request.urlretrieve(RAW + f, p)
    npz = cache / "targets.npz"
    if not npz.exists():
        whl = cache / "makehuman.whl"
        if not whl.exists():
            print("download makehuman wheel (targets)")
            urllib.request.urlretrieve(WHEEL, whl)
        with zipfile.ZipFile(whl) as z:
            npz.write_bytes(z.read("makehuman/data/targets.npz"))


def load_obj(path: Path):
    verts, faces, groups = [], [], []
    group = None
    for line in path.open():
        if line.startswith("v "):
            verts.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("g "):
            group = line.split()[1]
        elif line.startswith("f "):
            faces.append([int(p.split("/")[0]) - 1 for p in line.split()[1:]])
            groups.append(group)
    return np.array(verts, dtype=np.float64), faces, groups


class Targets:
    def __init__(self, path: Path):
        self.z = np.load(path)

    def apply(self, V: np.ndarray, name: str, weight: float) -> None:
        if weight == 0:
            return
        idx = self.z[f"targets/{name}.index"].astype(np.int64)
        vec = self.z[f"targets/{name}.vector"].astype(np.float64) * 1e-3
        V[idx] += vec * weight

    def delta(self, n: int, name: str) -> np.ndarray:
        d = np.zeros((n, 3))
        idx = self.z[f"targets/{name}.index"].astype(np.int64)
        d[idx] = self.z[f"targets/{name}.vector"].astype(np.float64) * 1e-3
        return d


# ---------------------------------------------------------------- shape


def shape(V: np.ndarray, T: Targets, age_years=35.0, asian=0.9, caucasian=0.1) -> None:
    """Macro modifiers: female, average muscle and weight, given age and ethnicity."""
    T.apply(V, "torso/torso-scale-horiz-decr", 0.25)
    # MakeHuman ages: young = 25, old = 90 (linear between)
    old = max(0.0, min(1.0, (age_years - 25.0) / 65.0))
    ages = {"young": 1 - old, "old": old}
    for age, aw in ages.items():
        T.apply(V, f"macrodetails/universal-female-{age}-averagemuscle-averageweight", aw)
        for race, rw in (("asian", asian), ("caucasian", caucasian)):
            T.apply(V, f"macrodetails/{race}-female-{age}", aw * rw)
        T.apply(V, f"macrodetails/proportions/female-{age}-averagemuscle-averageweight-idealproportions", aw * 0.5)
        # Modest bust and slightly narrower torso: reads as professional
        # under a coat rather than a mannequin silhouette.
        T.apply(V, f"breast/female-{age}-averagemuscle-averageweight-mincup-averagefirmness", aw * 0.55)
        # A little taller than MakeHuman's Asian average (~1.49 m)
        T.apply(V, f"macrodetails/height/female-{age}-averagemuscle-averageweight-maxheight", aw * 0.06)


def face(V: np.ndarray, T: Targets) -> None:
    """A woman of about 35 from Mizoram: a soft oval face, gentle jaw, ears
    close to the head, open (not heavy) brows, slightly larger eyes, fuller
    lips at a very slight resting lift. Small, deliberate amounts only."""
    for name, w in (
        ("head/head-oval", 0.45),
        ("head/head-scale-horiz-decr", 0.25),
        ("head/head-fat-decr", 0.25),
        ("chin/chin-width-decr", 0.35),
        ("chin/chin-bones-decr", 0.3),
        ("chin/chin-height-incr", 0.15),
        ("neck/neck-scale-horiz-decr", 0.25),
        ("eyebrows/eyebrows-trans-up", 0.25),
        ("eyebrows/eyebrows-angle-up", 0.15),
        ("mouth/mouth-upperlip-volume-incr", 0.35),
        ("mouth/mouth-lowerlip-volume-incr", 0.3),
        ("mouth/mouth-cupidsbow-incr", 0.35),
        ("mouth/mouth-scale-horiz-decr", 0.1),
        ("nose/nose-point-width-decr", 0.35),
        ("nose/nose-scale-horiz-decr", 0.2),
        ("nose/nose-width2-decr", 0.2),
        ("nose/nose-volume-decr", 0.15),
        ("nose/nose-nostrils-width-decr", 0.2),
    ):
        T.apply(V, name, w)
    for s_ in ("l", "r"):
        for name, w in (
            (f"ears/{s_}-ear-flap-decr", 0.7),
            (f"ears/{s_}-ear-wing-decr", 0.7),
            (f"ears/{s_}-ear-scale-decr", 0.25),
            (f"eyes/{s_}-eye-scale-incr", 0.18),
            (f"cheek/{s_}-cheek-volume-incr", 0.2),
            (f"cheek/{s_}-cheek-bones-incr", 0.12),
        ):
            T.apply(V, name, w)


# ---------------------------------------------------------------- geometry helpers


def tris(faces):
    out = []
    for f in faces:
        if len(f) == 3:
            out.append(f)
        else:
            out.append([f[0], f[1], f[2]])
            out.append([f[0], f[2], f[3]])
    return np.array(out, dtype=np.int64)


def vertex_normals(V, F):
    n = np.zeros_like(V)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    for k in range(3):
        np.add.at(n, F[:, k], fn)
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    ln[ln == 0] = 1
    return n / ln


def fit_proxy(V, mhclo: Path):
    """MakeHuman proxy fitting: each proxy vertex is a weighted triangle point plus a scaled offset."""
    refs, scales = [], {}
    lines = mhclo.read_text().splitlines()
    i = 0
    while i < len(lines):
        l = lines[i].split()
        if l and l[0] in ("x_scale", "y_scale", "z_scale"):
            scales[l[0][0]] = (int(l[1]), int(l[2]), float(l[3]))
        if l and l[0] == "verts":
            i += 1
            while i < len(lines) and lines[i].strip() and not lines[i].startswith("#") and len(lines[i].split()) >= 3:
                p = lines[i].split()
                if len(p) == 9:
                    refs.append(([int(x) for x in p[:3]], [float(x) for x in p[3:6]], [float(x) for x in p[6:9]]))
                elif len(p) == 1 or len(p) == 3 and "." not in p[0]:
                    pass
                i += 1
            break
        i += 1
    sc = np.array([abs(V[a][k] - V[b][k]) / d for k, (a, b, d) in zip(range(3), (scales["x"], scales["y"], scales["z"]))])
    out = np.zeros((len(refs), 3))
    for j, (vi, w, off) in enumerate(refs):
        out[j] = w[0] * V[vi[0]] + w[1] * V[vi[1]] + w[2] * V[vi[2]] + np.array(off) * sc
    return out, refs


# ---------------------------------------------------------------- glTF writer


class GLB:
    def __init__(self):
        self.bin = bytearray()
        self.views, self.accessors = [], []

    def _view(self, data: bytes, target=None):
        while len(self.bin) % 4:
            self.bin.append(0)
        off = len(self.bin)
        self.bin += data
        v = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target:
            v["target"] = target
        self.views.append(v)
        return len(self.views) - 1

    def accessor(self, arr: np.ndarray, kind: str, ctype: int, target=None, normalized=False, minmax=False):
        dtype = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[ctype]
        a = np.ascontiguousarray(arr.astype(dtype))
        view = self._view(a.tobytes(), target)
        acc = {"bufferView": view, "componentType": ctype, "count": int(a.shape[0]), "type": kind}
        if normalized:
            acc["normalized"] = True
        if minmax:
            flat = a.reshape(a.shape[0], -1)
            acc["min"] = flat.min(0).tolist()
            acc["max"] = flat.max(0).tolist()
        self.accessors.append(acc)
        return len(self.accessors) - 1

    def write(self, gltf: dict, path: Path):
        gltf["buffers"] = [{"byteLength": len(self.bin)}]
        gltf["bufferViews"] = self.views
        gltf["accessors"] = self.accessors
        js = json.dumps(gltf, separators=(",", ":")).encode()
        while len(js) % 4:
            js += b" "
        while len(self.bin) % 4:
            self.bin.append(0)
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        with path.open("wb") as f:
            f.write(struct.pack("<III", 0x46546C67, 2, total))
            f.write(struct.pack("<II", len(js), 0x4E4F534A))
            f.write(js)
            f.write(struct.pack("<II", len(self.bin), 0x004E4942))
            f.write(self.bin)


# ---------------------------------------------------------------- skeleton

EXPORT_BONES = [
    "root", "spine05", "spine04", "spine03", "spine02", "spine01",
    "neck01", "neck02", "neck03", "head", "jaw", "eye.L", "eye.R",
    "pelvis.L", "pelvis.R", "upperleg01.L", "upperleg01.R", "upperleg02.L", "upperleg02.R",
    "lowerleg01.L", "lowerleg01.R",
]
for s_ in ("L", "R"):
    EXPORT_BONES += [f"clavicle.{s_}", f"shoulder01.{s_}", f"upperarm01.{s_}", f"upperarm02.{s_}",
                     f"lowerarm01.{s_}", f"lowerarm02.{s_}", f"wrist.{s_}"]
    EXPORT_BONES += [f"metacarpal{i}.{s_}" for i in range(1, 5)]
    EXPORT_BONES += [f"finger{f}-{k}.{s_}" for f in range(1, 6) for k in range(1, 4)]

# Facial morph targets (ARKit-style names) from the CC0 Asian expression units.
MORPHS = {
    "eyeBlink_L": ["eye-left-closure"],
    "eyeBlink_R": ["eye-right-closure"],
    "eyeWide": ["eye-left-opened-up", "eye-right-opened-up"],
    "eyeSquint": ["eye-left-slit", "eye-right-slit"],
    "browInnerUp": ["eyebrows-left-inner-up", "eyebrows-right-inner-up"],
    "browOuterUp": ["eyebrows-left-extern-up", "eyebrows-right-extern-up"],
    "browDown": ["eyebrows-left-down", "eyebrows-right-down"],
    "jawOpen": ["mouth-open"],
    "mouthSmile": ["mouth-corner-puller"],
    "mouthFrown": ["mouth-depression"],
    "mouthPucker": ["mouth-pursing"],
    "mouthPress": ["mouth-compression"],
    "mouthStretch": ["mouth-retraction"],
    "mouthFunnel": ["mouth-protusion"],
    "lipsPart": ["mouth-parling"],
    "mouthUpperUp": ["mouth-elevation"],
}


def joint_positions(V, skel):
    return {k: V[np.array(v)].mean(0) for k, v in skel["joints"].items()}


def export_parent(bone, bones, exported):
    p = bones[bone]["parent"]
    while p is not None and p not in exported:
        p = bones[p]["parent"]
    return p


def skin_weights(n, skel_bones, weights, exported_index):
    """Top-4 weights per base vertex after merging non-exported bones into exported ancestors."""
    acc = defaultdict(lambda: defaultdict(float))
    for bone, pairs in weights.items():
        b = bone
        while b not in exported_index:
            b = skel_bones[b]["parent"]
        j = exported_index[b]
        for vi, w in pairs:
            acc[vi][j] += w
    J = np.zeros((n, 4), dtype=np.int64)
    W = np.zeros((n, 4))
    head = exported_index["head"]
    for vi in range(n):
        items = sorted(acc[vi].items(), key=lambda t: -t[1])[:4] if vi in acc else [(head, 1.0)]
        tot = sum(w for _, w in items) or 1.0
        for k, (j, w) in enumerate(items):
            J[vi, k], W[vi, k] = j, w / tot
    return J, W


# ---------------------------------------------------------------- colour helpers


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def smooth_mask(m, F, iterations=3):
    """Averages a per-vertex mask with its neighbours (removes triangle blotches)."""
    n = len(m)
    for _ in range(iterations):
        acc = np.zeros(n)
        cnt = np.zeros(n)
        for a, b in ((0, 1), (1, 2), (2, 0)):
            np.add.at(acc, F[:, a], m[F[:, b]])
            np.add.at(cnt, F[:, a], 1)
        m = 0.5 * m + 0.5 * np.where(cnt > 0, acc / np.maximum(cnt, 1), m)
    return m


def mask_from_target(T, n, name, lo=0.15):
    d = np.linalg.norm(T.delta(n, name), axis=1)
    if d.max() == 0:
        return d
    m = d / d.max()
    return np.clip((m - lo) / (1 - lo), 0, 1)


# ---------------------------------------------------------------- main build


class Part:
    def __init__(self, name, material, pos, faces, src, color, joints=None, weights=None, uv=None):
        self.name, self.material, self.uv = name, material, uv
        self.pos, self.faces, self.src, self.color = pos, faces, src, color
        self.joints, self.weights = joints, weights


def compact(F):
    used = np.unique(F)
    remap = -np.ones(F.max() + 1, dtype=np.int64)
    remap[used] = np.arange(len(used))
    return used, remap[F]


def clip(P, F, f):
    """Keeps the part of a triangle mesh where the scalar field f < 0.

    Triangles crossing f = 0 are split exactly along the cut, so edges are
    clean lines instead of a staircase. Returns new positions, faces, and for
    each new vertex the nearest original vertex (for weights and colours).
    """
    out_p, near, faces = list(P), list(range(len(P))), []
    cache = {}

    def cut(a, b):
        key = (min(a, b), max(a, b))
        if key not in cache:
            t = f[a] / (f[a] - f[b])
            out_p.append(P[a] + (P[b] - P[a]) * t)
            near.append(a if t < 0.5 else b)
            cache[key] = len(out_p) - 1
        return cache[key]

    for tri in F:
        inside = [f[v] < 0 for v in tri]
        k = sum(inside)
        if k == 3:
            faces.append(list(tri))
        elif k == 0:
            continue
        else:
            # rotate so the odd vertex is first
            for r in range(3):
                t3 = [tri[(i + r) % 3] for i in range(3)]
                ins = [f[v] < 0 for v in t3]
                if (k == 1 and ins[0]) or (k == 2 and not ins[0]):
                    break
            a, b, c = t3
            if k == 1:  # keep the small triangle at a
                faces.append([a, cut(a, b), cut(a, c)])
            else:  # keep the quad b, c, ca, ab
                ab, ac = cut(a, b), cut(a, c)
                faces.append([ab, b, c])
                faces.append([ab, c, ac])
    out_p = np.array(out_p)
    F2 = np.array(faces, dtype=np.int64)
    used = np.unique(F2)
    remap = -np.ones(len(out_p), dtype=np.int64)
    remap[used] = np.arange(len(used))
    return out_p[used], remap[F2], np.array(near)[used]


def strand_texture(w=128, h=256, seed=3):
    """Fine hair strands: streaks along v, as a greyscale PNG (bytes)."""
    import io
    from PIL import Image, ImageFilter
    r = np.random.default_rng(seed)
    cols = r.uniform(0.55, 1.0, w)
    img = np.tile(cols, (h, 1))
    img *= r.uniform(0.9, 1.0, (h, w))
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur((0.4, 3)))
    buf = io.BytesIO()
    im.convert("RGB").save(buf, "PNG", optimize=True)
    return buf.getvalue()


def srgb_to_linear(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def main(cache: Path, out: Path) -> None:
    fetch(cache)
    V, faces, groups = load_obj(cache / "3dobjs/base.obj")
    T = Targets(cache / "targets.npz")
    shape(V, T)
    # A relaxed, closed mouth at rest: the base mesh's lips sit slightly apart.
    T.apply(V, "expression/units/asian/mouth-compression", 0.35)
    face(V, T)
    n = len(V)
    rng = np.random.default_rng(7)

    by_group = defaultdict(list)
    for f, g in zip(faces, groups):
        by_group[g].append(f)
    F_all = {g: tris(fs) for g, fs in by_group.items()}

    # Landmarks (decimetres, y up, +z forward)
    eyeL = V[np.unique(F_all["helper-l-eye"])].mean(0)
    eyeR = V[np.unique(F_all["helper-r-eye"])].mean(0)
    eye_y = (eyeL[1] + eyeR[1]) / 2
    neck_y = eye_y - 1.55  # base of the neck, roughly at the collar
    skel = json.loads((cache / "rigs/default.mhskel").read_text())
    jp = joint_positions(V, skel)
    body_min_y = V[np.unique(F_all_body := tris(by_group["body"]))][:, 1].min()
    print("eye height when standing (m):", round((eye_y - body_min_y) * DM, 3))

    # Fields are negative where a surface is kept. All in decimetres.
    hand_x = 3.55   # |x| beyond the wrist (A-pose)
    thigh_y = -2.5  # lowest point kept (the desk hides the legs)

    def v_field(P, top, depth, width):
        """Negative inside a V-neck opening at the front: apex at top - depth."""
        apex = top - depth
        half = np.clip((P[:, 1] - apex) / depth, 0, None) * width
        inside_front = P[:, 2] > 0.2
        return np.where(inside_front & (P[:, 1] > apex), np.abs(P[:, 0]) - half, 1.0)

    scrub_top = neck_y + 0.25

    # ---- body skin: head and neck above the collar, hands, and the V of the scrubs
    bN = vertex_normals(V, F_all["body"])
    f_neck = (neck_y - 0.1) - V[:, 1]
    def wrist_field(P, margin):
        """Negative on the hand side of a plane across each wrist (per side by x sign)."""
        out = np.full(len(P), 1.0)
        for side, sgn in (("L", 1), ("R", -1)):
            w = jp[skel["bones"][f"wrist.{side}"]["head"]]
            e = jp[skel["bones"][f"lowerarm01.{side}"]["head"]]
            d = (w - e) / np.linalg.norm(w - e)
            m = (np.sign(P[:, 0]) == sgn)
            out = np.where(m, -(((P - w) @ d) - margin), out)
        return out

    f_hands = wrist_field(V, -0.12)
    f_v = v_field(V, scrub_top, 0.95, 0.62) + 0.06
    f_skin = np.minimum(np.minimum(f_neck, f_hands), f_v)

    # ---- skin colours (vertex colours, sRGB here, linearised on export)
    skin = hexrgb("#cf9b7a")  # light-medium, warm: common in Mizoram
    C = np.tile(skin, (n, 1))
    C *= (1 + rng.normal(0, 0.012, (n, 1)))
    lips = np.maximum(mask_from_target(T, n, "mouth/mouth-lowerlip-volume-incr", 0.25),
                      mask_from_target(T, n, "mouth/mouth-upperlip-height-incr", 0.35))
    lips = smooth_mask(lips, F_all["body"], 2)
    C = C * (1 - lips[:, None] * 0.45) + hexrgb("#b56a64") * lips[:, None] * 0.45
    # Eyebrows: a soft arched band above each eye (front of the face only)
    ax = np.abs(V[:, 0])
    along = np.clip((ax - 0.1) / 0.55, 0, 1)
    brow_y = eye_y + 0.13 + 0.05 * np.sin(np.pi * np.clip(along * 1.15, 0, 1))
    width = 0.044 * (1 - 0.5 * along)
    brows = np.exp(-((V[:, 1] - brow_y) / width) ** 2) * np.clip((ax - 0.12) / 0.06, 0, 1) * (ax < 0.7) * (V[:, 2] > eyeL[2] - 0.25)
    brows *= np.clip((0.72 - ax) / 0.12, 0, 1)
    brows = smooth_mask(brows, F_all["body"], 2)
    brows = np.clip(brows * 1.25, 0, 1)
    C = C * (1 - brows[:, None] * 0.62) + hexrgb("#2b1e17") * brows[:, None] * 0.62
    # Lash line: the eyelid rim where it meets the eyeball (upper lid darker)
    for ec in (eyeL, eyeR):
        r_eye = np.linalg.norm(V[np.unique(F_all["helper-l-eye"])] - eyeL, axis=1).mean()
        dist = np.linalg.norm(V - ec, axis=1) - r_eye
        rim = np.exp(-(dist / 0.032) ** 2) * (np.linalg.norm(V[:, :2] - ec[:2], axis=1) < 0.32) * (V[:, 2] > ec[2] - 0.05)
        rim *= np.where(V[:, 1] > ec[1], 1.0, 0.3)
        C = C * (1 - rim[:, None] * 0.82) + hexrgb("#17100d") * rim[:, None] * 0.82
    # Inside of the mouth: darker towards the back
    lip_idx = np.where(lips > 0.3)[0]
    mc = V[lip_idx].mean(0)
    lip_front = V[lip_idx][:, 2].max()
    nb = vertex_normals(V, F_all["body"])
    to_c = mc + np.array([0, 0, -0.25]) - V
    dist_c = np.linalg.norm(to_c, axis=1)
    facing_in = np.einsum("ij,ij->i", nb, to_c / np.maximum(dist_c[:, None], 1e-9)) > 0.2
    inside = facing_in & (dist_c < 0.42) & (np.abs(V[:, 0] - mc[0]) < 0.32) & (V[:, 2] < lip_front - 0.06)
    depth = np.clip((lip_front - 0.06 - V[:, 2]) / 0.2, 0, 1)
    C = np.where(inside[:, None], C * (1 - depth[:, None]) + hexrgb("#4a2224") * depth[:, None], C)
    cheeks = np.exp(-(((np.abs(V[:, 0]) - 0.55) / 0.35) ** 2 + ((V[:, 1] - (eye_y - 0.45)) / 0.3) ** 2)) * (V[:, 2] > 0.8)
    C = C * (1 - cheeks[:, None] * 0.14) + hexrgb("#d27c70") * cheeks[:, None] * 0.14
    # Natural variation: a slightly warmer nose tip and ears, a lighter forehead,
    # a little shadow in the eye sockets. Never a uniform "painted" tone.
    nose = np.exp(-((V[:, 0] / 0.12) ** 2 + ((V[:, 1] - (eye_y - 0.32)) / 0.14) ** 2)) * (V[:, 2] > eyeL[2])
    C = C * (1 - nose[:, None] * 0.12) + hexrgb("#c2766a") * nose[:, None] * 0.12
    ears = np.clip((np.abs(V[:, 0]) - 0.66) / 0.08, 0, 1) * (np.abs(V[:, 1] - (eye_y - 0.2)) < 0.45) * (V[:, 1] > neck_y + 0.6)
    C = C * (1 - ears[:, None] * 0.12) + hexrgb("#bf7a68") * ears[:, None] * 0.12
    forehead = np.clip((V[:, 1] - (eye_y + 0.25)) / 0.4, 0, 1) * (V[:, 2] > eyeL[2] - 0.3)
    C = C * (1 + forehead[:, None] * 0.04)
    for ec in (eyeL, eyeR):
        socket = np.exp(-(((V[:, 0] - ec[0]) / 0.22) ** 2 + ((V[:, 1] - ec[1] + 0.03) / 0.16) ** 2)) * (V[:, 2] > ec[2] - 0.2)
        C = C * (1 - socket[:, None] * 0.06) + hexrgb("#a07465") * socket[:, None] * 0.06
    C *= (1 + smooth_mask(rng.normal(0, 0.03, n), F_all["body"], 3)[:, None])
    C = np.clip(C, 0, 1)

    parts = []
    P, Fl, near = clip(V, F_all["body"], f_skin)
    parts.append(Part("skin", "skin", P, Fl, near, C[near]))

    # ---- clothing shells from the CC0 "tights" and "skirt" helpers
    def drape(P, F, N, iterations):
        """Laplacian smoothing that never moves a point inwards: fabric hangs
        over the body instead of following every curve of it."""
        n_ = len(P)
        for _ in range(iterations):
            acc = np.zeros_like(P)
            cnt = np.zeros(n_)
            for a, b in ((0, 1), (1, 2), (2, 0)):
                np.add.at(acc, F[:, a], P[F[:, b]])
                np.add.at(cnt, F[:, a], 1)
            m = cnt > 0
            target = P.copy()
            target[m] = acc[m] / cnt[m][:, None]
            d = target - P
            inward = np.einsum("ij,ij->i", d, N)
            d -= N * np.minimum(inward, 0)[:, None]
            P = P + d * 0.6
        return P

    def shell(group, offset, field, color, name, material, smooth=0):
        F = F_all[group]
        u = np.unique(F)
        N = vertex_normals(V, F)
        Pg = V.copy()
        Pg[u] = V[u] + N[u] * offset
        if smooth:
            Pg = drape(Pg, F, N, smooth)
        Pc, Fc, nr = clip(Pg, F, field(Pg))
        col = np.tile(hexrgb(color), (len(Pc), 1)) * (1 + rng.normal(0, 0.01, (len(Pc), 1)))
        parts.append(Part(name, material, Pc, Fc, nr, np.clip(col, 0, 1)))

    def torso_field(P, top):
        return np.maximum.reduce([P[:, 1] - top, thigh_y - P[:, 1], -wrist_field(P, -0.05)])

    def elbow_field(P, margin):
        """Negative on the shoulder side of a plane across each upper arm."""
        out = np.full(len(P), -1.0)
        for side, sgn in (("L", 1), ("R", -1)):
            e = jp[skel["bones"][f"lowerarm01.{side}"]["head"]]
            sh = jp[skel["bones"][f"upperarm01.{side}"]["head"]]
            d = (e - sh) / np.linalg.norm(e - sh)
            m = (np.sign(P[:, 0]) == sgn)
            out = np.where(m, ((P - e) @ d) + margin, out)
        return out

    shell("helper-tights", 0.035, lambda P: np.maximum.reduce([torso_field(P, scrub_top), -v_field(P, scrub_top, 0.95, 0.62), elbow_field(P, 0.9)]), "#1f6470", "scrubs", "scrubs", smooth=4)
    coat_top = neck_y + 0.12
    shell("helper-tights", 0.07, lambda P: np.maximum(torso_field(P, coat_top), -v_field(P, coat_top, 2.2, 0.45)), "#f4f5f6", "coat", "coat", smooth=8)
    shell("helper-skirt", 0.07, lambda P: np.maximum(P[:, 1] - 0.9, -2.4 - P[:, 1]), "#f1f2f4", "coat-skirt", "coat", smooth=4)

    # ---- hair: a shell over the scalp with a clean, natural hairline, plus a low bun
    head_c = np.array([0.0, eye_y + 0.1, eyeL[2] - 1.0])
    rel = V - head_c
    az = np.arctan2(rel[:, 0], rel[:, 2])  # 0 = straight ahead
    front = np.cos(az)
    # height of the hairline above the head centre, by direction
    fr = np.clip(front, 0, 1)
    # A natural hairline: a soft rounded centre, curving down at the temples,
    # in front of the ears, then behind them to the nape.
    line = np.where(front > 0, 0.55 * fr ** 3 - 0.6 * (1 - fr) ** 1.2, -0.6 + 0.4 * front)
    # a slightly lower, softer middle (no straight "cap" edge)
    line -= 0.05 * np.exp(-(az / 0.25) ** 2)
    f_hair = np.maximum(line - rel[:, 1], np.linalg.norm(rel, axis=1) - 1.95)
    f_hair = np.maximum(f_hair, (eye_y - 1.05) - V[:, 1])
    # Ears stay uncovered: a smooth round clearance around each ear (a hard
    # mask left jagged triangles along the mesh edges).
    ear_c_y, ear_c_z = eye_y - 0.3, eyeL[2] - 0.78
    ear_d = np.sqrt(((V[:, 1] - ear_c_y) / 1.0) ** 2 + ((V[:, 2] - ear_c_z) / 0.85) ** 2)
    f_ear = np.where(np.abs(V[:, 0]) > 0.5, 0.42 - ear_d, -1.0)
    f_hair = np.maximum(f_hair, f_ear)
    # Real volume (1–2 cm), already near the hairline, more at the crown and
    # back; a side parting (her right) where the hair lies flatter.
    part_x = 0.28
    parting = np.exp(-((V[:, 0] - part_x) / 0.07) ** 2) * (rel[:, 1] > 0.25) * (rel[:, 2] > -0.6)
    top = np.clip(rel[:, 1] / 1.2, 0, 1)
    sides = np.clip(np.abs(rel[:, 0]) / 0.8, 0, 1) * (1 - top)
    thick = np.clip(-f_hair / 0.12, 0, 1) ** 0.5 * (0.1 + 0.09 * top + 0.06 * np.clip(-rel[:, 2], 0, 1)) * (1 - 0.35 * parting) * (1 - 0.45 * sides)
    Ph = V + bN * thick[:, None]
    Ph[:, 1] += 0.0
    P, Fl, near = clip(Ph, F_all["body"], f_hair)
    hc = np.tile(hexrgb("#1e1612"), (len(P), 1)) * (1 + rng.normal(0, 0.05, (len(P), 1)))
    # the parting shows a little scalp colour
    pp = np.exp(-((P[:, 0] - part_x) / 0.035) ** 2) * ((P - head_c)[:, 1] > 0.3) * ((P - head_c)[:, 2] > -0.5)
    hc = hc * (1 - pp[:, None] * 0.35) + hexrgb("#5a4234") * pp[:, None] * 0.35
    rh = P - head_c
    hair_uv = np.stack([np.arctan2(rh[:, 0], rh[:, 1]) / np.pi * 3.0, np.arctan2(rh[:, 2], rh[:, 1]) / np.pi * 1.5], -1)
    parts.append(Part("hair", "hair", P, Fl, near, np.clip(hc, 0, 1), uv=hair_uv))
    # Soft hairline: skin just outside the hair edge takes a little of the
    # hair colour, so the edge is not a hard cut-out line.
    sk = parts[0]
    fh = f_hair[sk.src]
    # Wider, softer fade so the edge is a gradient of fine hairs, not a line.
    roots = np.clip(1 - fh / 0.24, 0, 1) ** 1.6 * (fh >= 0) * (V[sk.src][:, 1] > eye_y)
    sk.color = sk.color * (1 - roots[:, None] * 0.6) + hexrgb("#3e3029") * roots[:, None] * 0.6
    # Skin UNDER the hair: near the hairline the hair shell is very thin and the
    # skin shows through as a pale strip (a "cap" look). Scalp under hair is
    # dark, so it takes the hair-root colour, fading in over a short distance.
    under = np.clip(-fh / 0.06, 0, 1) * (fh < 0) * (V[sk.src][:, 1] > eye_y)
    sk.color = sk.color * (1 - under[:, None] * 0.88) + hexrgb("#2a201a") * under[:, None] * 0.88
    bun_c = head_c + np.array([0.0, -0.4, -0.86])
    th, ph = np.meshgrid(np.linspace(0, np.pi, 16), np.linspace(0, 2 * np.pi, 26, endpoint=False), indexing="ij")
    bp = np.stack([np.sin(th) * np.cos(ph) * 0.44, np.cos(th) * 0.38, np.sin(th) * np.sin(ph) * 0.34], -1).reshape(-1, 3) + bun_c
    bf = []
    R, Cn = th.shape
    for i in range(R - 1):
        for j in range(Cn):
            a, b, c2, d = i * Cn + j, i * Cn + (j + 1) % Cn, (i + 1) * Cn + (j + 1) % Cn, (i + 1) * Cn + j
            bf += [[a, d, c2], [a, c2, b]]
    bcol = np.tile(hexrgb("#271c17"), (len(bp), 1)) * (1 + rng.normal(0, 0.04, (len(bp), 1)))
    bun_uv = np.stack([ph.reshape(-1) / np.pi * 2.0, th.reshape(-1) / np.pi * 1.0], -1)
    parts.append(Part("bun", "hair", bp, np.array(bf), -np.ones(len(bp), dtype=np.int64), np.clip(bcol, 0, 1), uv=bun_uv))

    # ---- mouth interior: a dark cavity behind the lips. Without it the head is
    # hollow and the background shows through the gap between the lips.
    lipv = np.where(lips > 0.3)[0]
    mcen = V[lipv].mean(0)
    mfront = V[lipv][:, 2].max()
    th2, ph2 = np.meshgrid(np.linspace(0, np.pi, 12), np.linspace(0, 2 * np.pi, 18, endpoint=False), indexing="ij")
    mb = np.stack([np.sin(th2) * np.cos(ph2) * 0.27, np.cos(th2) * 0.2, np.sin(th2) * np.sin(ph2) * 0.3], -1).reshape(-1, 3)
    mb += np.array([mcen[0], mcen[1] - 0.04, mfront - 0.38])
    mf = []
    R2, C2 = th2.shape
    for i in range(R2 - 1):
        for j in range(C2):
            a_, b_, c_, d_ = i * C2 + j, i * C2 + (j + 1) % C2, (i + 1) * C2 + (j + 1) % C2, (i + 1) * C2 + j
            mf += [[a_, c_, d_], [a_, b_, c_]]  # inward-facing: seen from inside the mouth
    parts.append(Part("mouth-cavity", "mouth", mb, np.array(mf), -np.ones(len(mb), dtype=np.int64), np.tile(hexrgb("#2e1416"), (len(mb), 1))))

    # ---- eyelashes, teeth, tongue (CC0 helper geometry)
    for g, col, mat in (("helper-upper-teeth", "#ece6da", "teeth"), ("helper-lower-teeth", "#e8e1d4", "teeth"), ("helper-tongue", "#9c4a4a", "mouth")):
        u, Fl_ = compact(F_all[g])
        P = V[u] - np.array([0, 0, 0.12])  # set back so closed lips hide them
        parts.append(Part(g, mat, P, Fl_, u, np.tile(hexrgb(col), (len(u), 1))))

    # ---- eyes: CC0 high-poly eye proxy, coloured by angle from the eye's forward axis
    EP, refs = fit_proxy(V, cache / "eyes/high-poly/high-poly.mhclo")
    ev, ef, groups_e = load_obj(cache / "eyes/high-poly/high-poly.obj")
    EF = tris(ef)
    eye_src = np.array([r[0][0] for r in refs])
    for side, centre in (("L", eyeL), ("R", eyeR)):
        sel_v = (EP[:, 0] > 0) if side == "L" else (EP[:, 0] < 0)
        Fs = EF[sel_v[EF].all(1)]
        u, Fl_ = compact(Fs)
        P = EP[u]
        c0 = P.mean(0)
        d = P - c0
        d /= np.linalg.norm(d, axis=1, keepdims=True)
        ang = np.arccos(np.clip(d[:, 2], -1, 1))
        side_ang = np.arctan2(d[:, 0], d[:, 2])
        col = np.tile(hexrgb("#e9e3da"), (len(u), 1))
        corner = np.clip((np.abs(side_ang) - 0.75) / 0.6, 0, 1)[:, None]
        col = col * (1 - corner * 0.25) + hexrgb("#d9b9ae") * corner * 0.25
        iris = ang < 0.6
        ring = np.clip((ang - 0.2) / 0.4, 0, 1)
        streak = 1 + 0.12 * np.sin(np.arctan2(d[:, 1], d[:, 0]) * 23) * (1 - ring)
        col[iris] = (hexrgb("#6b4428") * (1 - ring[iris, None]) + hexrgb("#3a2415") * ring[iris, None]) * streak[iris, None]
        limbus = (ang > 0.52) & (ang < 0.64)
        col[limbus] = hexrgb("#1f130b")
        col[ang < 0.21] = hexrgb("#050303")
        parts.append(Part(f"eye.{side}", "eye", P, Fl_, eye_src[u], np.clip(col, 0, 1)))
        # Wet cornea: a thin clear cap over the front, for natural highlights
        r = np.linalg.norm(P - c0, axis=1).mean()
        th_, ph_ = np.meshgrid(np.linspace(0, 0.95, 8), np.linspace(0, 2 * np.pi, 24, endpoint=False), indexing="ij")
        cp = np.stack([np.sin(th_) * np.cos(ph_), np.sin(th_) * np.sin(ph_), np.cos(th_)], -1).reshape(-1, 3) * r * 1.035 + c0
        cf = []
        Rr, Cc_ = th_.shape
        for i in range(Rr - 1):
            for j in range(Cc_):
                a, b, c2, dd = i * Cc_ + j, i * Cc_ + (j + 1) % Cc_, (i + 1) * Cc_ + (j + 1) % Cc_, (i + 1) * Cc_ + j
                cf += [[a, c2, dd], [a, b, c2]]
        parts.append(Part(f"cornea.{side}", "cornea", cp, np.array(cf), -np.ones(len(cp), dtype=np.int64), np.ones((len(cp), 3))))

    # ---- skeleton
    bones = skel["bones"]
    exported = [b for b in EXPORT_BONES if b in bones]
    ex_index = {b: i for i, b in enumerate(exported)}
    heads = np.array([jp[bones[b]["head"]] for b in exported])
    parents = [export_parent(b, bones, set(exported)) for b in exported]
    weights = json.loads((cache / "rigs/default_weights.mhw").read_text())["weights"]
    J, W = skin_weights(n, bones, weights, ex_index)

    # Eyes follow their eye bones exactly; the bun follows the head.
    for p in parts:
        if p.name.startswith("eye.") or p.name.startswith("cornea."):
            j = ex_index["eye." + p.name.split(".")[1]]
            p.joints = np.tile([j, 0, 0, 0], (len(p.pos), 1))
            p.weights = np.tile([1.0, 0, 0, 0], (len(p.pos), 1))
        elif p.name in ("bun", "mouth-cavity"):
            p.joints = np.tile([ex_index["head"], 0, 0, 0], (len(p.pos), 1))
            p.weights = np.tile([1.0, 0, 0, 0], (len(p.pos), 1))
        else:
            p.joints, p.weights = J[p.src], W[p.src]

    # ---- morph targets
    morph_full = {}
    for name, units in MORPHS.items():
        d = np.zeros((n, 3))
        for u_ in units:
            d += T.delta(n, f"expression/units/asian/{u_}")
        morph_full[name] = d

    write(parts, exported, parents, heads, morph_full, out, ground=body_min_y * DM)


MATERIALS = {
    "skin": {"color": [1, 1, 1, 1], "rough": 0.62, "metal": 0.0},
    "scrubs": {"color": [1, 1, 1, 1], "rough": 0.9, "metal": 0.0},
    "coat": {"color": [1, 1, 1, 1], "rough": 0.88, "metal": 0.0},
    "hair": {"color": [1, 1, 1, 1], "rough": 0.72, "metal": 0.0},
    "lashes": {"color": [1, 1, 1, 1], "rough": 0.8, "metal": 0.0, "double": True},
    "teeth": {"color": [1, 1, 1, 1], "rough": 0.35, "metal": 0.0},
    "mouth": {"color": [1, 1, 1, 1], "rough": 0.6, "metal": 0.0},
    "eye": {"color": [1, 1, 1, 1], "rough": 0.12, "metal": 0.0},
    "cornea": {"color": [1, 1, 1, 0.08], "rough": 0.03, "metal": 0.0, "blend": True},
}


def write(parts, bone_names, parents, heads, morph_full, out: Path, ground: float = 0.0):
    g = GLB()
    # concatenate parts into one vertex buffer
    pos, col, jnt, wgt, src, nrm, uvs = [], [], [], [], [], [], []
    prims = defaultdict(list)
    base = 0
    for p in parts:
        k = len(p.pos)
        pos.append(p.pos)
        col.append(p.color)
        jnt.append(p.joints)
        wgt.append(p.weights)
        src.append(p.src)
        uvs.append(p.uv if p.uv is not None else np.zeros((k, 2)))
        nrm.append(vertex_normals(p.pos, p.faces))
        prims[p.material].append(p.faces + base)
        base += k
    P = np.concatenate(pos) * DM
    # stand on the floor (y = 0 at the soles of the feet)
    P[:, 1] -= ground
    Nn = np.concatenate(nrm)
    Cc = np.concatenate(col)
    Jj = np.concatenate(jnt)
    Ww = np.concatenate(wgt)
    S = np.concatenate(src)
    print("vertices:", len(P), "triangles:", sum(len(f) for fs in prims.values() for f in fs))

    a_pos = g.accessor(P, "VEC3", 5126, 34962, minmax=True)
    a_nrm = g.accessor(Nn, "VEC3", 5126, 34962)
    a_col = g.accessor(np.clip(np.round(np.concatenate([srgb_to_linear(Cc), np.ones((len(Cc), 1))], 1) * 255), 0, 255), "VEC4", 5121, 34962, normalized=True)
    a_jnt = g.accessor(Jj, "VEC4", 5121 if len(bone_names) < 256 else 5123, 34962)
    a_wgt = g.accessor(Ww, "VEC4", 5126, 34962)
    a_uv = g.accessor(np.concatenate(uvs), "VEC2", 5126, 34962)
    tex_view = g._view(strand_texture())

    targets, names = [], []
    for name, d in morph_full.items():
        dd = np.where(S[:, None] >= 0, d[np.maximum(S, 0)], 0) * DM
        if np.abs(dd).max() < 1e-7:
            continue
        targets.append({"POSITION": g.accessor(dd, "VEC3", 5126, 34962, minmax=True)})
        names.append(name)

    materials, primitives = [], []
    for mi, (mname, flist) in enumerate(prims.items()):
        m = MATERIALS[mname]
        pbr = {"baseColorFactor": m["color"], "roughnessFactor": m["rough"], "metallicFactor": m["metal"]}
        if mname == "hair":
            pbr["baseColorTexture"] = {"index": 0}
        mat = {"name": mname, "pbrMetallicRoughness": pbr, "doubleSided": bool(m.get("double"))}
        if m.get("blend"):
            mat["alphaMode"] = "BLEND"
        materials.append(mat)
        F = np.concatenate(flist)
        idx = g.accessor(F.reshape(-1), "SCALAR", 5125 if base > 65535 else 5123, 34963)
        primitives.append({
            "attributes": {"POSITION": a_pos, "NORMAL": a_nrm, "COLOR_0": a_col, "JOINTS_0": a_jnt, "WEIGHTS_0": a_wgt, "TEXCOORD_0": a_uv},
            "indices": idx, "material": mi, "targets": targets,
        })

    # bones: identity rest rotations, translation relative to parent head
    H = heads * DM
    H[:, 1] -= ground
    nodes = []
    for i, b in enumerate(bone_names):
        par = parents[i]
        t = H[i] - (H[bone_names.index(par)] if par else 0)
        nodes.append({"name": b, "translation": t.tolist(), "children": []})
    for i, par in enumerate(parents):
        if par:
            nodes[bone_names.index(par)]["children"].append(i)
    for nd in nodes:
        if not nd["children"]:
            del nd["children"]
    roots = [i for i, par in enumerate(parents) if not par]
    ibm = np.zeros((len(bone_names), 16))
    for i in range(len(bone_names)):
        m = np.eye(4)
        m[:3, 3] = -H[i]
        ibm[i] = m.T.reshape(-1)  # column-major
    a_ibm = g.accessor(ibm, "MAT4", 5126)
    mesh_node = len(nodes)
    nodes.append({"name": "guide", "mesh": 0, "skin": 0})
    arm = len(nodes)
    nodes.append({"name": "Armature", "children": roots})
    gltf = {
        "asset": {"version": "2.0", "generator": "AI Hospital build_guide.py (MakeHuman CC0 data)", "copyright": "CC0 1.0 (MakeHuman assets); see scripts/avatar/README.md"},
        "scene": 0,
        "scenes": [{"nodes": [arm, mesh_node]}],
        "nodes": nodes,
        "meshes": [{"name": "guide", "primitives": primitives, "extras": {"targetNames": names}, "weights": [0] * len(names)}],
        "skins": [{"joints": list(range(len(bone_names))), "inverseBindMatrices": a_ibm, "skeleton": roots[0]}],
        "materials": materials,
        "images": [{"bufferView": tex_view, "mimeType": "image/png"}],
        "samplers": [{"wrapS": 10497, "wrapT": 10497}],
        "textures": [{"source": 0, "sampler": 0}],
    }
    g.write(gltf, out)
    print("wrote", out, round(out.stat().st_size / 1e6, 2), "MB; morphs:", names)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
