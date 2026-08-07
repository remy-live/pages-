#!/usr/bin/env python3
"""
Construit `visu-incidents-autonome.html` : une copie de `index.html` dans
laquelle les feuilles de style, les scripts et les images du dossier `vendor/`
sont incorporés.

Le fichier obtenu tient en un seul document. Il s'ouvre depuis un Drive, une
clé USB ou un disque local, sans serveur et sans accès aux CDN — seul le fond
de carte OpenStreetMap reste chargé depuis le réseau (l'outil le signale et
reste utilisable sans).

    python3 build-standalone.py
"""

import base64
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).parent
VENDOR = HERE / "vendor"
SOURCE = HERE / "index.html"
TARGET = HERE / "visu-incidents-autonome.html"

MIME = {".png": "image/png", ".svg": "image/svg+xml", ".gif": "image/gif"}


def inline_css_assets(css: str) -> str:
    """Remplace les url(...) d'une feuille par des données encodées en base64."""

    def repl(match: "re.Match[str]") -> str:
        raw = match.group(1).strip("\"'")
        if raw.startswith(("data:", "http:", "https:", "//")):
            return match.group(0)
        asset = (VENDOR / raw).resolve()
        if not asset.is_file():
            return match.group(0)
        mime = MIME.get(asset.suffix.lower(), "application/octet-stream")
        payload = base64.b64encode(asset.read_bytes()).decode("ascii")
        return f"url(data:{mime};base64,{payload})"

    return re.sub(r"url\(([^)]+)\)", repl, css)


def main() -> int:
    if not SOURCE.is_file():
        print(f"Introuvable : {SOURCE}", file=sys.stderr)
        return 1

    html = SOURCE.read_text(encoding="utf-8")
    inlined = []

    def css_tag(match: "re.Match[str]") -> str:
        href = match.group(1)
        if not href.startswith("vendor/"):
            return match.group(0)
        path = HERE / href
        inlined.append(href)
        return "<style>\n" + inline_css_assets(path.read_text(encoding="utf-8")) + "\n</style>"

    def js_tag(match: "re.Match[str]") -> str:
        src = match.group(1)
        if not src.startswith("vendor/"):
            return match.group(0)
        path = HERE / src
        inlined.append(src)
        code = path.read_text(encoding="utf-8")
        # Une occurrence littérale de </script> couperait la balise englobante.
        code = code.replace("</script", "<\\/script")
        return "<script>\n" + code + "\n</script>"

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)"\s*/?>', css_tag, html)
    html = re.sub(r'<script src="([^"]+)"></script>', js_tag, html)

    if re.search(r'(?:href|src)="vendor/', html):
        print("Attention : des références à vendor/ subsistent.", file=sys.stderr)
        return 1

    html = html.replace(
        "<title>Visu-Incidents",
        "<!-- Version autonome : bibliothèques incorporées. -->\n<title>Visu-Incidents",
        1,
    )

    TARGET.write_text(html, encoding="utf-8")
    print(f"{TARGET.name} — {TARGET.stat().st_size / 1024:.0f} Ko")
    for name in inlined:
        print(f"  incorporé : {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
