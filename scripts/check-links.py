#!/usr/bin/env python3
"""Checks that every local link, image, script and stylesheet in site/ resolves."""

import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = (Path(__file__).resolve().parent.parent / "site").resolve()
REFERENCE_ATTRIBUTES = ("href", "src")


class Collector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.references = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if not value:
                continue
            if name == "id":
                self.ids.add(value)
            elif name in REFERENCE_ATTRIBUTES:
                self.references.append(value)


def main():
    if not ROOT.is_dir():
        print("site/ was not found", file=sys.stderr)
        return 1

    pages = {}
    for path in sorted(ROOT.rglob("*.html")):
        collector = Collector()
        collector.feed(path.read_text(encoding="utf-8"))
        pages[path] = collector

    if not pages:
        print("site/ does not contain any HTML page", file=sys.stderr)
        return 1

    errors = []
    for path, collector in pages.items():
        name = path.relative_to(ROOT)
        for reference in collector.references:
            parts = urlsplit(reference)
            if parts.scheme or parts.netloc:
                continue

            target = path if not parts.path else (path.parent / parts.path).resolve()
            if not target.exists():
                errors.append(f"{name}: missing target {reference}")
                continue

            if parts.fragment and target.suffix == ".html":
                other = pages.get(target)
                if other is None or parts.fragment not in other.ids:
                    errors.append(f"{name}: missing anchor {reference}")

    for error in errors:
        print(error, file=sys.stderr)
    if errors:
        print(f"{len(errors)} problem(s) found", file=sys.stderr)
        return 1

    print(f"All local references in {len(pages)} page(s) resolve")
    return 0


if __name__ == "__main__":
    sys.exit(main())