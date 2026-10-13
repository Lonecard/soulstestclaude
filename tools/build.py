#!/usr/bin/env python3
"""Bundle the game into one self-contained HTML file: dist/ashen-reach.html"""
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">',
                    '<style>\n' + (root / 'style.css').read_text() + '</style>')


def inline(match):
    src = match.group(1)
    return '<script>\n' + (root / src).read_text() + '</script>'


html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
out = root / 'dist' / 'ashen-reach.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(f'wrote {out} ({len(html) // 1024} KB)')
