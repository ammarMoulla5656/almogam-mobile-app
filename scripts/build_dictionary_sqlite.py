import json
import re
import sqlite3
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "database" / "processed"
OUTPUT_DIR = ROOT / "public" / "data" / "sqlite"
PREVIEW_DIR = ROOT / "public" / "data" / "previews"
DICTIONARIES = {
    "fiqhi_main": "unified_fiqhi.json",
    "usuli_dict": "unified_usuli.json",
    "lughawi_dict": "unified_lughawi.json",
}
ARABIC_MARKS = re.compile(r"[\u064b-\u065f\u0670\u0640]")
NON_WORD = re.compile(r"[^\w\u0621-\u064a\u0660-\u0669\u06f0-\u06f9]+", re.UNICODE)
PREFIXES = ("وال", "بال", "كال", "فال", "لل", "ال", "و", "ف", "ب", "ك", "ل")


def normalize(value):
    text = unicodedata.normalize("NFKC", str(value or "")).lower()
    text = ARABIC_MARKS.sub("", text)
    text = text.translate(str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ؤ": "و", "ئ": "ي", "ى": "ي", "ة": "ه"}))
    return " ".join(NON_WORD.sub(" ", text).split())


def index_words(text, allow_prefixes=False):
    result = set()
    for word in normalize(text).split():
        if len(word) < 2:
            continue
        result.add(word)
        if allow_prefixes:
            for end in range(2, len(word)):
                result.add(word[:end])
        for prefix in PREFIXES:
            if word.startswith(prefix) and len(word) - len(prefix) >= 2:
                result.add(word[len(prefix):])
                break
    return result


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    for dictionary_id, filename in DICTIONARIES.items():
        source = json.loads((SOURCE_DIR / filename).read_text(encoding="utf-8"))
        preview = {
            "id": dictionary_id,
            "entryCount": len(source["entries"]),
            "entries": [
                {
                    "id": str(entry.get("id") or f"{dictionary_id}_{index}"),
                    "dictionaryId": dictionary_id,
                    "term": str(entry.get("term") or ""),
                    "definition": str(entry.get("definition") or ""),
                    "letter": str(entry.get("letter") or ""),
                    "page": int(entry.get("page") or 0),
                    "sources": entry.get("sources") if isinstance(entry.get("sources"), list) else [],
                    "aliases": entry.get("aliases") if isinstance(entry.get("aliases"), list) else [],
                }
                for index, entry in enumerate(source["entries"][:50], start=1)
            ],
        }
        preview_path = PREVIEW_DIR / f"{dictionary_id}.json"
        preview_path.write_text(json.dumps(preview, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"{dictionary_id}: {len(preview['entries'])} preview entries -> {preview_path.relative_to(ROOT)} ({preview_path.stat().st_size:,} bytes)")
        output = OUTPUT_DIR / f"{dictionary_id}.sqlite"
        if output.exists():
            output.unlink()
        connection = sqlite3.connect(output)
        connection.execute("PRAGMA journal_mode=OFF")
        connection.execute("PRAGMA synchronous=OFF")
        connection.execute("PRAGMA temp_store=MEMORY")
        connection.executescript("""
            CREATE TABLE entries (
                row_id INTEGER PRIMARY KEY,
                id TEXT NOT NULL UNIQUE,
                dictionary_id TEXT NOT NULL,
                term TEXT NOT NULL,
                term_norm TEXT NOT NULL,
                definition TEXT NOT NULL,
                letter TEXT NOT NULL DEFAULT '',
                page INTEGER NOT NULL DEFAULT 0,
                sources_json TEXT NOT NULL DEFAULT '[]',
                aliases_json TEXT NOT NULL DEFAULT '[]'
            );
            CREATE INDEX entries_term_norm ON entries(term_norm);
            CREATE INDEX entries_letter_term ON entries(letter, term_norm);
            CREATE VIRTUAL TABLE entries_fts USING fts4(
                term_norm, definition_norm, aliases_norm, content='', tokenize=unicode61, prefix='2,3'
            );
        """)

        entry_rows, fts_rows = [], []
        for row_id, entry in enumerate(source["entries"], start=1):
            term = str(entry.get("term") or "")
            definition = str(entry.get("definition") or "")
            aliases = entry.get("aliases") if isinstance(entry.get("aliases"), list) else []
            sources = entry.get("sources") if isinstance(entry.get("sources"), list) else []
            entry_rows.append((
                row_id,
                str(entry.get("id") or f"{dictionary_id}_{row_id}"),
                dictionary_id,
                term,
                normalize(term),
                definition,
                str(entry.get("letter") or ""),
                int(entry.get("page") or 0),
                json.dumps(sources, ensure_ascii=False),
                json.dumps(aliases, ensure_ascii=False),
            ))
            fts_rows.append((row_id, normalize(term), normalize(definition), normalize(" ".join(map(str, aliases)))))

        connection.executemany("INSERT INTO entries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", entry_rows)
        connection.executemany("INSERT INTO entries_fts(docid, term_norm, definition_norm, aliases_norm) VALUES (?, ?, ?, ?)", fts_rows)
        connection.execute("PRAGMA optimize")
        connection.commit()
        connection.close()
        print(f"{dictionary_id}: {len(entry_rows):,} entries -> {output.relative_to(ROOT)} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
