#!/usr/bin/env python3
"""Prépare le dossier ../data/ à partir des fichiers bruts.

Remplace le va-et-vient « Generateur.html → copier → coller dans index.html » :
ici on écrit directement les fichiers que la page va lire, et la page n'a pas
besoin d'être modifiée.

Usage :
    python3 preparer-donnees.py DOSSIER_DES_FICHIERS_BRUTS

Fichiers bruts attendus (les noms d'origine sont acceptés) :
    Chemin de fer.json                        -> data/chemins_de_fer.json
    Liste des gares.geojson                   -> data/gares.geojson
    regroupements.json                        -> data/regroupements.json
    zones_remplacement.json                   -> data/zones_remplacement.json
    Collège et Lycée Académie - Amiens.csv    -> data/etablissements.csv

Les couches transport couvrent la France entière (13 Mo) alors que l'outil ne
sert que pour l'académie d'Amiens : elles sont découpées sur l'emprise des trois
départements et les coordonnées arrondies à 5 décimales (~1 m). Gain observé :
13 Mo -> 1 Mo.
"""
import json
import shutil
import sys
from pathlib import Path

# Emprise Aisne / Oise / Somme, avec une marge confortable.
LON_MIN, LON_MAX, LAT_MIN, LAT_MAX = 1.2, 4.45, 48.65, 50.55

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data"


def dans_emprise(lon, lat):
    return LON_MIN <= lon <= LON_MAX and LAT_MIN <= lat <= LAT_MAX


def arrondi(point):
    return [round(point[0], 5), round(point[1], 5)]


def premier_existant(dossier, *noms):
    for nom in noms:
        chemin = dossier / nom
        if chemin.exists():
            return chemin
    sys.exit(f"Fichier introuvable dans {dossier} : {' / '.join(noms)}")


def ecrire_json(chemin, obj):
    chemin.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  {chemin.name:28} {chemin.stat().st_size // 1024} Ko")


def main(dossier_brut):
    dossier = Path(dossier_brut)
    SORTIE.mkdir(parents=True, exist_ok=True)
    print(f"Écriture dans {SORTIE}")

    # Établissements : recopiés tels quels, le séparateur reste le point-virgule.
    src_csv = premier_existant(dossier, "Collège et Lycée Académie - Amiens.csv", "etablissements.csv")
    shutil.copyfile(src_csv, SORTIE / "etablissements.csv")
    print(f"  {'etablissements.csv':28} {(SORTIE / 'etablissements.csv').stat().st_size // 1024} Ko")

    for nom_source, nom_sortie in (("regroupements.json", "regroupements.json"),
                                   ("zones_remplacement.json", "zones_remplacement.json")):
        ecrire_json(SORTIE / nom_sortie,
                    json.loads(premier_existant(dossier, nom_source).read_text(encoding="utf-8")))

    # Voies ferrées : liste d'objets contenant chacun un « geo_shape ».
    rail = json.loads(premier_existant(dossier, "Chemin de fer.json", "chemins_de_fer.json").read_text(encoding="utf-8"))
    if isinstance(rail, dict):                       # déjà une FeatureCollection
        rail = [{"geo_shape": f} for f in rail.get("features", [])]
    traces = []
    for element in rail:
        forme = element.get("geo_shape") or {}
        geometrie = forme.get("geometry") or {}
        if geometrie.get("type") != "LineString":
            continue
        points = geometrie["coordinates"]
        if not any(dans_emprise(p[0], p[1]) for p in points):
            continue
        traces.append({"type": "Feature",
                       "geometry": {"type": "LineString", "coordinates": [arrondi(p) for p in points]},
                       "properties": {}})
    print(f"  voies ferrées : {len(traces)} tracés retenus sur {len(rail)}")
    ecrire_json(SORTIE / "chemins_de_fer.json", {"type": "FeatureCollection", "features": traces})

    # Gares : FeatureCollection de points.
    gares = json.loads(premier_existant(dossier, "Liste des gares.geojson", "gares.geojson").read_text(encoding="utf-8"))
    retenues = []
    for feature in gares.get("features", []):
        geometrie = feature.get("geometry") or {}
        if geometrie.get("type") != "Point":
            continue
        lon, lat = geometrie["coordinates"][:2]
        if not dans_emprise(lon, lat):
            continue
        retenues.append({"type": "Feature",
                         "geometry": {"type": "Point", "coordinates": arrondi([lon, lat])},
                         "properties": {"libelle": (feature.get("properties") or {}).get("libelle")}})
    print(f"  gares : {len(retenues)} retenues sur {len(gares.get('features', []))}")
    ecrire_json(SORTIE / "gares.geojson", {"type": "FeatureCollection", "features": retenues})


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
