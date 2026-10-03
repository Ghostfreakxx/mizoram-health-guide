#!/usr/bin/env bash
# Rebuilds public/models/guide-high.glb and guide-balanced.glb.
# Needs: python3 with numpy + pillow, and Node (npx) for gltf-transform.
# After rebuilding, bump MODEL_VERSION in app/ai-hospital/consult-room/Doctor3D.tsx.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
cache="${AVATAR_CACHE:-$here/.cache}"
tmp="$(mktemp -d)"
python3 "$here/build_guide.py" "$cache" "$tmp/guide-raw.glb"
npx -y @gltf-transform/cli@4 meshopt "$tmp/guide-raw.glb" "$root/public/models/guide-high.glb"
npx -y @gltf-transform/cli@4 simplify "$tmp/guide-raw.glb" "$tmp/guide-simpl.glb" --ratio 0.45 --error 0.0008
npx -y @gltf-transform/cli@4 meshopt "$tmp/guide-simpl.glb" "$root/public/models/guide-balanced.glb"
ls -la "$root/public/models"
