# The AI Hospital virtual guide (3D model)

`public/models/guide-high.glb` (~370 KB) and `guide-balanced.glb` (~230 KB) are
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
4. keeps a simplified skeleton (bones have no rest rotation)
5. bakes 16 facial morph targets (ARKit-style names: `eyeBlink_L`, `jawOpen`,
   `mouthSmile`, …) from the CC0 Asian expression units
6. writes glTF; `build.sh` compresses with meshopt and makes a simplified
   "balanced" version for ordinary phones

Limits: no photographic skin scan or strand hair. A commissioned, licensed
scan of a real (consenting) Mizo doctor could replace it later: any glTF with
the same bone names and morph names works with `GuideAvatar.tsx`.

Downloaded data is cached in `scripts/avatar/.cache/` (git-ignored).
