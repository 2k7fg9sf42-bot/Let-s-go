#!/usr/bin/env python3
"""Fabrique artifact/index.html : la version de l'app publiée sur une page claude.ai.

Une page claude.ai reçoit son propre squelette HTML et n'accepte que des styles
et scripts intégrés : on reprend index.html, assets/style.css et assets/app.js
et on les assemble en un seul fichier. Les données (data/events.json) et
l'icône restent des fichiers à part, publiés à côté de la page.

Usage : python3 scripts/build_artifact.py
Publication : page artifact/index.html + fichiers data/events.json et icons/logo-mark.png.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "artifact" / "index.html"

HEAD = """<title>FIGHTLY</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,700;1,800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
"""


def main() -> None:
    page = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "assets" / "style.css").read_text(encoding="utf-8")
    js = (ROOT / "assets" / "app.js").read_text(encoding="utf-8")
    if "</script" in js.lower():
        raise SystemExit("app.js contient « </script> » : impossible de l'intégrer tel quel.")

    body = page.split("<body>", 1)[1].rsplit("</body>", 1)[0]
    tag = '<script src="assets/app.js" defer></script>'
    if tag not in body:
        raise SystemExit("Balise du script introuvable dans index.html.")
    body = body.replace(tag, f"<script>\n{js}\n</script>")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(f"{HEAD}<style>\n{css}\n</style>\n{body.strip()}\n", encoding="utf-8")
    print(f"✓ {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} Ko)")


if __name__ == "__main__":
    main()
