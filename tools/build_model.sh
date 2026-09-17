#!/usr/bin/env bash
# Rebuilds every artefact derived from the raw dilution-refrigerator model.
#
# The 42 MB source GLB is not in the repository (see AGENTS.md); point
# QC_SOURCE at it, or drop it back at the default path.
#
#   ./tools/build_model.sh
#
# Produces:
#   assets/model/quantum-computer.glb   Draco-compressed render model
#   assets/model/qc-front.svg           hidden-line drawing, front view
#   assets/model/qc-three-quarter.svg   hidden-line drawing, three-quarter view

set -euo pipefail
cd "$(dirname "$0")/.."

SOURCE="${QC_SOURCE:-Quantum_Computer_glb/Quantum_Computer.glb}"
WORK=".work/model"

if [ ! -f "$SOURCE" ]; then
  echo "error: source model not found at $SOURCE" >&2
  echo "       set QC_SOURCE=/path/to/Quantum_Computer.glb" >&2
  exit 1
fi

mkdir -p "$WORK" assets/model

echo "==> render model (Draco + WebP textures)"
npx gltf-transform optimize "$SOURCE" "$WORK/qc-high.glb" \
  --texture-compress webp --texture-size 1024 \
  --simplify-error 0.0008 --compress draco
cp "$WORK/qc-high.glb" assets/model/quantum-computer.glb

echo "==> line-extraction model (low poly, welded, uncompressed)"
# Uncompressed so the extractor can load it without a Draco decoder, welded so
# EdgesGeometry can actually find shared edges.
npx gltf-transform optimize "$SOURCE" "$WORK/qc-lines.glb" \
  --texture-compress webp --texture-size 64 \
  --simplify-error 0.006 --compress false --weld 0.0001

echo "==> hidden-line SVGs"
node tools/glb2svg/run.mjs

echo
ls -lh assets/model/
