#!/usr/bin/env python3
"""
Incorpore l'annuaire des établissements dans l'outil.

L'annuaire ne bouge quasiment jamais, alors que l'export du registre change
souvent. En l'embarquant, il ne reste qu'un seul fichier à déposer à l'usage.

Le script ne garde que les colonnes réellement lues par l'outil, écarte les
établissements sans coordonnées, compresse en gzip puis encode en base64, et
écrit `annuaire.js`. La page le décompresse au démarrage avec `DecompressionStream`,
sans bibliothèque.

    python3 build-annuaire.py Etablissement.csv
    python3 build-standalone.py        # pour répercuter dans le fichier autonome

Sans argument, le script régénère un `annuaire.js` vide : l'outil redemande
alors les deux fichiers, comme avant.
"""

import base64
import csv
import gzip
import io
import pathlib
import sys
import unicodedata
from datetime import date

HERE = pathlib.Path(__file__).parent
TARGET = HERE / "annuaire.js"

# Colonnes lues par l'outil, dans l'ordre où elles seront réécrites.
# Chaque entrée liste les intitulés acceptés en entrée.
COLUMNS = [
    ("Numéro d'UAI", ["Numéro d'UAI", "UAI"]),
    ("Appellation officielle", ["Appellation officielle", "Dénomination principale"]),
    ("Libellé de la commune", ["Libellé de la commune", "Commune"]),
    ("Libellé du département ou de la collectivité",
     ["Libellé du département ou de la collectivité", "Département"]),
    ("Libellé de la nature de l'UAI", ["Libellé de la nature de l'UAI"]),
    ("Secteur", ["Secteur"]),
    ("Adresse : désignation de la voie", ["Adresse : désignation de la voie"]),
    ("Adresse : code postal", ["Adresse : code postal"]),
    ("Localité d'acheminement", ["Localité d'acheminement"]),
    ("Latitude WGS84", ["Latitude WGS84", "Latitude"]),
    ("Longitude WGS84", ["Longitude WGS84", "Longitude"]),
]


def norm(value: str) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return "".join(c for c in text.lower() if c.isalnum())


def resolve(headers, candidates):
    index = {norm(h): h for h in headers}
    for candidate in candidates:
        hit = index.get(norm(candidate))
        if hit:
            return hit
    for candidate in candidates:                       # repli : correspondance partielle
        key = norm(candidate)
        for normalised, real in index.items():
            if key and key in normalised:
                return real
    return None


def write_module(payload: str, meta: dict) -> None:
    fields = ",\n  ".join(f"{k}: {v!r}".replace("'", '"') for k, v in meta.items())
    body = (
        "/* Généré par build-annuaire.py — ne pas modifier à la main. */\n"
        "window.VI_ANNUAIRE = "
        + ("null;\n" if payload is None else "{\n  " + fields + ",\n  gzip: \"" + payload + "\"\n};\n")
    )
    TARGET.write_text(body, encoding="utf-8")


def main(argv) -> int:
    if len(argv) < 2:
        write_module(None, {})
        print(f"{TARGET.name} vidé : l'outil redemandera les deux fichiers.")
        return 0

    source = pathlib.Path(argv[1])
    if not source.is_file():
        print(f"Introuvable : {source}", file=sys.stderr)
        return 1

    raw = source.read_bytes().decode("utf-8-sig", errors="replace")
    sample = raw[:4096]
    delimiter = max(";,\t", key=sample.count)
    reader = csv.DictReader(io.StringIO(raw), delimiter=delimiter)

    if not reader.fieldnames:
        print("Fichier illisible : aucun en-tête détecté.", file=sys.stderr)
        return 1

    mapping = {out: resolve(reader.fieldnames, cands) for out, cands in COLUMNS}
    for out, found in mapping.items():
        if found is None and out in ("Numéro d'UAI", "Latitude WGS84", "Longitude WGS84"):
            print(f"Colonne obligatoire absente : {out}", file=sys.stderr)
            return 1

    out_buffer = io.StringIO()
    writer = csv.writer(out_buffer, delimiter=";", lineterminator="\n",
                        quoting=csv.QUOTE_MINIMAL)
    writer.writerow([name for name, _ in COLUMNS])

    kept = skipped_coords = skipped_uai = 0
    for row in reader:
        uai = (row.get(mapping["Numéro d'UAI"]) or "").strip()
        if not uai:
            skipped_uai += 1
            continue
        lat = (row.get(mapping["Latitude WGS84"]) or "").strip().replace(",", ".")
        lon = (row.get(mapping["Longitude WGS84"]) or "").strip().replace(",", ".")
        try:
            float(lat), float(lon)
        except ValueError:
            skipped_coords += 1
            continue
        writer.writerow([
            (row.get(mapping[name]) or "").strip() if mapping[name] else ""
            for name, _ in COLUMNS
        ])
        kept += 1

    if not kept:
        print("Aucun établissement géolocalisé retenu.", file=sys.stderr)
        return 1

    trimmed = out_buffer.getvalue().encode("utf-8")
    packed = gzip.compress(trimmed, 9)
    payload = base64.b64encode(packed).decode("ascii")

    write_module(payload, {
        "name": source.name,
        "count": kept,
        "built": date.today().isoformat(),
    })

    print(f"{TARGET.name} — {kept} établissements géolocalisés")
    print(f"  source    : {source.name}  {len(raw.encode('utf-8')) / 1024:>8.0f} Ko")
    print(f"  colonnes  : {len(reader.fieldnames)} → {len(COLUMNS)}"
          f"           {len(trimmed) / 1024:>8.0f} Ko")
    print(f"  gzip      :                       {len(packed) / 1024:>8.0f} Ko")
    print(f"  base64    :                       {len(payload) / 1024:>8.0f} Ko"
          f"  ({len(payload) / len(raw.encode('utf-8')):.0%} de l'original)")
    if skipped_coords or skipped_uai:
        print(f"  écartés   : {skipped_coords} sans coordonnées, {skipped_uai} sans UAI")
    print("\nPensez à relancer build-standalone.py pour le fichier autonome.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
