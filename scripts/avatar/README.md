# The AI Hospital virtual guide (3D model)

`public/models/guide-high.glb` (~370 KB, ~32k triangles; used by every 3D quality tier) is
built by `build.sh` from **MakeHuman** data:

- base mesh, shape targets, skeleton, skin weights, facial expression units
  and eye proxy from https://github.com/makehumancommunity/makehuman
  (`makehuman/data/…`) and the `makehuman` 1.3.2 package on PyPI
  (`targets.npz`)
- **Licence: CC0 1.0 Universal** for these assets (MakeHuman `LICENSE.md`,
  section C, and the `license: CC0` fields in the skeleton, weights and
  expression files). The output may be used for any purpose, including
  government use, without attribution. We credit MakeHuman anyway.

`build_guide.py` is our own code (no MakeHuman program code is copied). It:

1. shapes an adult woman (~35 years, Asian ethnicity blend) with the macro
   targets
2. makes scrubs and a white coat from the CC0 "tights"/"skirt" helper meshes,
   hair over the scalp with a strand texture, eyes, teeth
3. paints skin, lips, brows and lash line as vertex colours
4. bakes ambient occlusion into the vertex colours (64 rays per vertex,
   Embree through `trimesh`; optional — `pip install trimesh embreex`; the
   build prints a note and skips it if they are missing): creases under the
   chin, at the collar, around the eyes, inside the mouth
5. gives the hair shell a strand texture with alpha and fades the vertex
   alpha over the last ~1.2 cm to the hairline, so the edge is cut into fine
   strands (glTF `alphaMode: MASK`) instead of a hard "cap" line
6. keeps a simplified skeleton (bones have no rest rotation)
7. bakes 16 facial morph targets (ARKit-style names: `eyeBlink_L`, `jawOpen`,
   `mouthSmile`, …) from the CC0 Asian expression units
8. writes glTF; `build.sh` compresses it with meshopt (no automatic
   simplification: it creased the face and looked unsettling)

Tried and removed (VD4): separate hair "cards" along the hairline (read as a
jagged fringe) and lapel geometry on the coat (the helper mesh is too coarse;
it showed as grey zigzags).

Limits: no photographic skin scan or strand hair. MakeHuman's own hair and
skin-texture assets are hosted on download.tuxfamily.org, which this build
environment cannot reach; they are CC0 too and would be the next step. A commissioned, licensed
scan of a real (consenting) Mizo doctor could replace it later: any glTF with
the same bone names and morph names works with `GuideAvatar.tsx`.

Downloaded data is cached in `scripts/avatar/.cache/` (git-ignored).
