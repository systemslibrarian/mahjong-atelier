"""Rebuild the standalone offline game from the modular source."""
from pathlib import Path
import re
root = Path(__file__).parent
styles = (root / "styles.css").read_text(encoding="utf-8")
names = ["core", "solitaire", "table", "hongkong", "american", "coach", "learn", "practice", "path", "ui"]
js = "\n".join((root / "js" / (n + ".js")).read_text(encoding="utf-8").replace("</script", "<\\/script") for n in names)
page = (root / "index.html").read_text(encoding="utf-8")
page = page.replace('<link rel="stylesheet" href="styles.css"/>', "<style>\n" + styles + "\n</style>")
page = re.sub(r'<script src="js/[a-z]+\.js"></script>\n?', "", page)
page = page.replace("</body>", "<script>\n" + js + "\n</script>\n</body>")
out = root / "Mahjong_Atelier.html"
out.write_text(page, encoding="utf-8")
print(f"Built {out.name} ({out.stat().st_size:,} bytes)")

