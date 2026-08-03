#!/usr/bin/env python3
"""Lightweight static-site checks using only the Python standard library."""

from __future__ import annotations

import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PRODUCTION = "https://jjscustompcs.com"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.description = ""
        self.canonicals: list[str] = []
        self.robots = ""
        self.h1_count = 0
        self.heading_levels: list[int] = []
        self.links: list[str] = []
        self.assets: list[str] = []
        self.images: list[dict[str, str]] = []
        self.ids: list[str] = []
        self.json_ld: list[str] = []
        self.meta: dict[tuple[str, str], str] = {}
        self._capture_title = False
        self._capture_json = False
        self._buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {key: value or "" for key, value in attrs_list}
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "title":
            self._capture_title = True
            self._buffer = []
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            level = int(tag[1])
            self.heading_levels.append(level)
            if tag == "h1":
                self.h1_count += 1
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "script" and attrs.get("src"):
            self.assets.append(attrs["src"])
        if tag == "link" and attrs.get("href") and attrs.get("rel") in {
            "stylesheet", "icon", "shortcut icon", "manifest", "apple-touch-icon"
        }:
            self.assets.append(attrs["href"])
        if tag == "img":
            self.images.append(attrs)
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href", ""))
        if tag == "meta":
            if attrs.get("name"):
                self.meta[("name", attrs["name"])] = attrs.get("content", "")
            if attrs.get("property"):
                self.meta[("property", attrs["property"])] = attrs.get("content", "")
            if attrs.get("name") == "description":
                self.description = attrs.get("content", "")
            if attrs.get("name") == "robots":
                self.robots = attrs.get("content", "")
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self._capture_json = True
            self._buffer = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self._capture_title:
            self.title = "".join(self._buffer).strip()
            self._capture_title = False
            self._buffer = []
        if tag == "script" and self._capture_json:
            self.json_ld.append("".join(self._buffer).strip())
            self._capture_json = False
            self._buffer = []

    def handle_data(self, data: str) -> None:
        if self._capture_title or self._capture_json:
            self._buffer.append(data)


class FAQParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.items: list[tuple[str, str]] = []
        self._in_item = False
        self._depth = 0
        self._capture = ""
        self._question: list[str] = []
        self._answer: list[str] = []

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {key: value or "" for key, value in attrs_list}
        classes = attrs.get("class", "").split()
        if tag == "article" and "faq-item" in classes:
            self._in_item = True
            self._depth = 1
            self._question = []
            self._answer = []
            return
        if not self._in_item:
            return
        self._depth += 1
        if tag == "h2":
            self._capture = "question"
        elif tag == "p":
            self._capture = "answer"

    def handle_endtag(self, tag: str) -> None:
        if not self._in_item:
            return
        if tag in {"h2", "p"}:
            self._capture = ""
        self._depth -= 1
        if self._depth == 0:
            question = " ".join("".join(self._question).split())
            answer = " ".join("".join(self._answer).split())
            self.items.append((question, answer))
            self._in_item = False

    def handle_data(self, data: str) -> None:
        if self._capture == "question":
            self._question.append(data)
        elif self._capture == "answer":
            self._answer.append(data)


def local_target(page: Path, href: str) -> tuple[Path | None, str]:
    parsed = urlparse(href)
    if parsed.scheme in {"mailto", "tel", "http", "https", "data"} or href.startswith("//"):
        if parsed.netloc == "jjscustompcs.com":
            path = parsed.path.lstrip("/") or "index.html"
            return ROOT / unquote(path), parsed.fragment
        return None, ""
    path = unquote(parsed.path)
    target = (page.parent / path).resolve() if path else page.resolve()
    if target.is_dir():
        target /= "index.html"
    return target, parsed.fragment


def main() -> int:
    errors: list[str] = []
    pages: dict[Path, PageParser] = {}
    html_files = sorted(ROOT.glob("*.html")) + sorted((ROOT / "builds").glob("*.html"))

    for page in html_files:
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        pages[page.resolve()] = parser
        rel = page.relative_to(ROOT)
        indexable = "noindex" not in parser.robots.lower()

        if parser.h1_count != 1:
            errors.append(f"{rel}: expected one H1, found {parser.h1_count}")
        if not parser.title:
            errors.append(f"{rel}: missing title")
        if not parser.description:
            errors.append(f"{rel}: missing meta description")
        if indexable and len(parser.canonicals) != 1:
            errors.append(f"{rel}: expected one canonical, found {len(parser.canonicals)}")
        if indexable and parser.canonicals:
            expected_path = "/" if rel.as_posix() == "index.html" else f"/{rel.as_posix()}"
            if parser.canonicals[0] != f"{PRODUCTION}{expected_path}":
                errors.append(f"{rel}: canonical does not match production URL")
        if indexable:
            required_meta = [
                ("property", "og:type"), ("property", "og:title"),
                ("property", "og:description"), ("property", "og:url"),
                ("property", "og:image"), ("property", "og:image:alt"),
                ("name", "twitter:card"),
            ]
            for key in required_meta:
                if not parser.meta.get(key):
                    errors.append(f"{rel}: missing {key[1]}")
        for previous, current in zip(parser.heading_levels, parser.heading_levels[1:]):
            if current > previous + 1:
                errors.append(f"{rel}: heading jumps from H{previous} to H{current}")
        duplicates = {item for item in parser.ids if parser.ids.count(item) > 1}
        if duplicates:
            errors.append(f"{rel}: duplicate IDs: {', '.join(sorted(duplicates))}")
        for image in parser.images:
            if "alt" not in image:
                errors.append(f"{rel}: image missing alt attribute: {image.get('src', '')}")
            if not image.get("width") or not image.get("height"):
                errors.append(f"{rel}: image missing dimensions: {image.get('src', '')}")
            target, _ = local_target(page, image.get("src", ""))
            if target and not target.exists():
                errors.append(f"{rel}: missing image: {image.get('src', '')}")
        for asset in parser.assets:
            target, _ = local_target(page, asset)
            if target and not target.exists():
                errors.append(f"{rel}: missing linked asset: {asset}")
        for block in parser.json_ld:
            try:
                data = json.loads(block)
            except json.JSONDecodeError as exc:
                errors.append(f"{rel}: invalid JSON-LD: {exc}")
                continue
            serialized = json.dumps(data)
            if "http://jjscustompcs.com" in serialized or "github.io/Test" in serialized:
                errors.append(f"{rel}: JSON-LD has a non-production URL")

    titles: dict[str, list[str]] = {}
    descriptions: dict[str, list[str]] = {}
    for path, parser in pages.items():
        rel = str(path.relative_to(ROOT))
        if "noindex" not in parser.robots.lower():
            titles.setdefault(parser.title, []).append(rel)
            descriptions.setdefault(parser.description, []).append(rel)
    for value, locations in titles.items():
        if value and len(locations) > 1:
            errors.append(f"duplicate title in: {', '.join(locations)}")
    for value, locations in descriptions.items():
        if value and len(locations) > 1:
            errors.append(f"duplicate description in: {', '.join(locations)}")

    for page, parser in pages.items():
        rel = page.relative_to(ROOT)
        for href in parser.links:
            if "/Test/" in href or "github.io/Test" in href:
                errors.append(f"{rel}: production link points to Test: {href}")
            target, fragment = local_target(page, href)
            if target is None:
                continue
            if not target.exists():
                errors.append(f"{rel}: broken internal link: {href}")
                continue
            if fragment and target.suffix == ".html":
                target_parser = pages.get(target.resolve())
                if target_parser and fragment not in target_parser.ids:
                    errors.append(f"{rel}: missing fragment target: {href}")

    sitemap = ET.parse(ROOT / "sitemap.xml")
    namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap_urls = {node.text for node in sitemap.findall("s:url/s:loc", namespace)}
    expected_urls = set()
    for path, parser in pages.items():
        if "noindex" in parser.robots.lower():
            continue
        rel = path.relative_to(ROOT).as_posix()
        expected_urls.add(f"{PRODUCTION}/" if rel == "index.html" else f"{PRODUCTION}/{rel}")
    if sitemap_urls != expected_urls:
        for url in sorted(expected_urls - sitemap_urls):
            errors.append(f"sitemap missing: {url}")
        for url in sorted(sitemap_urls - expected_urls):
            errors.append(f"sitemap has unexpected URL: {url}")

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if "Allow: /" not in robots or f"Sitemap: {PRODUCTION}/sitemap.xml" not in robots:
        errors.append("robots.txt does not allow the site and reference the production sitemap")
    if (ROOT / "CNAME").read_text(encoding="utf-8").strip() != "jjscustompcs.com":
        errors.append("CNAME is not jjscustompcs.com")

    home = (ROOT / "index.html").read_text(encoding="utf-8")
    required_form_markup = {
        "quote form POST endpoint": 'id="quote-form" action="https://formsubmit.co/a3b58795bc0ec2a0644d6798de47715b" method="POST"',
        "absolute thank-you fallback": 'name="_next" id="form-next" value="https://jjscustompcs.com/thankyou.html"',
        "source-page fallback": 'name="_url" value="https://jjscustompcs.com/#quote-section"',
        "AJAX helper": 'src="assets/js/form-submit.js?v=22"',
    }
    for label, markup in required_form_markup.items():
        if markup not in home:
            errors.append(f"index.html: missing or changed {label}")

    faq_text = (ROOT / "faq.html").read_text(encoding="utf-8")
    faq_parser = FAQParser()
    faq_parser.feed(faq_text)
    faq_schema: list[tuple[str, str]] = []
    for block in pages[(ROOT / "faq.html").resolve()].json_ld:
        data = json.loads(block)
        if data.get("@type") == "FAQPage":
            faq_schema = [
                (item.get("name", ""), item.get("acceptedAnswer", {}).get("text", ""))
                for item in data.get("mainEntity", [])
            ]
    if faq_parser.items != faq_schema:
        errors.append("faq.html: visible FAQ questions and answers do not exactly match FAQPage JSON-LD")

    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".html", ".js", ".xml", ".txt"}:
            text = path.read_text(encoding="utf-8", errors="ignore")
            if "github.io/Test" in text or "jjscustompcs.github.io/Test" in text:
                errors.append(f"{path.relative_to(ROOT)}: contains a Test-deployment URL")

    if errors:
        print(f"Validation failed with {len(errors)} issue(s):")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"Validation passed: {len(html_files)} HTML pages, {len(expected_urls)} indexable sitemap URLs.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
