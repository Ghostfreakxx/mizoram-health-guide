#!/usr/bin/env bash
# Rebuilds public/models/guide-high.glb (used by every 3D quality tier).
# Automatic simplification is deliberately not used: it creased the face.
# Needs: python3 with numpy + pillow, and Node (npx) for gltf-transform.
# After rebuilding, bump MODEL_VERSION in app/ai-hospital/consult-room/models.ts.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
cache="${AVATAR_CACHE:-$here/.cache}"
tmp="$(mktemp -d)"
python3 "$here/build_guide.py" "$cache" "$tmp/guide-raw.glb"
npx -y @gltf-transform/cli@4 meshopt "$tmp/guide-raw.glb" "$root/public/models/guide-high.glb"
ls -la "$root/public/models"
