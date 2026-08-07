#!/usr/bin/env bash
# Télécharge les modèles MediaPipe dans assets/models/.
#
# Ils ne sont pas versionnés : ce sont des binaires de plusieurs mégaoctets
# qui ne changent jamais entre deux commits. À lancer une fois après le
# clone, et à refaire si tu changes de version de MediaPipe.
#
#   ./scripts/fetch-models.sh
#
# La borne devant fonctionner sans réseau, ces fichiers doivent être
# présents sur la machine avant la soirée.

set -euo pipefail

cd "$(dirname "$0")/.."
DEST="assets/models"
BASE="https://storage.googleapis.com/mediapipe-models"

mkdir -p "$DEST"

fetch() {
  local name="$1" url="$2"
  if [ -f "$DEST/$name" ]; then
    echo "✓ $name (déjà présent)"
    return
  fi
  echo "↓ $name"
  curl -fSL --retry 3 -o "$DEST/$name.part" "$url"
  mv "$DEST/$name.part" "$DEST/$name"
  echo "✓ $name"
}

# Suivi de main : c'est celui dont dépend toute la navigation.
fetch "hand_landmarker.task" \
  "$BASE/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"

# Optionnel — pour les jeux au corps entier (squats, esquives).
# Décommenter quand un jeu en aura besoin : c'est 9 Mo de plus au démarrage.
# fetch "pose_landmarker_lite.task" \
#   "$BASE/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

echo
echo "Modèles prêts dans $DEST/"
ls -lh "$DEST"
