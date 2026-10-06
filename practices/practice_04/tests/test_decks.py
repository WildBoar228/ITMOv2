"""Схема project/data/decks.json + фиксированный таймер в project/app.js.

Запускается hook после правок в project/ (см. tests/check.sh),
а также вручную: pytest -q (из practices/practice_04/).
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DECKS = ROOT / "project" / "data" / "decks.json"
APP_JS = ROOT / "project" / "app.js"


def load_decks():
    with open(DECKS, encoding="utf-8") as f:
        return json.load(f)


def test_decks_file_is_nonempty_array():
    decks = load_decks()
    assert isinstance(decks, list), "корень decks.json должен быть массивом"
    assert len(decks) >= 1, "нужна хотя бы одна игра"


def test_deck_schema():
    for deck in load_decks():
        assert isinstance(deck.get("id"), str) and deck["id"].strip(), f"deck без id: {deck}"
        title = deck.get("title")
        assert isinstance(title, str) and title.strip(), f"deck {deck.get('id')}: пустой title"
        questions = deck.get("questions")
        assert isinstance(questions, list) and len(questions) >= 1, (
            f"deck {deck['id']}: вопросов >= 1"
        )
        for q in questions:
            assert isinstance(q.get("id"), str) and q["id"].strip()
            assert isinstance(q.get("q"), str) and q["q"].strip(), (
                f"deck {deck['id']}: пустой текст вопроса"
            )
            options = q.get("options")
            assert isinstance(options, list) and len(options) == 4, (
                f"deck {deck['id']} {q.get('id')}: вариантов ровно 4"
            )
            for opt in options:
                assert isinstance(opt, str) and opt.strip(), (
                    f"deck {deck['id']} {q.get('id')}: пустой вариант"
                )
            assert isinstance(q.get("correct"), int) and 0 <= q["correct"] <= 3, (
                f"deck {deck['id']} {q.get('id')}: correct — индекс 0–3"
            )


def test_timer_is_fixed_15s():
    src = APP_JS.read_text(encoding="utf-8")
    m = re.search(r"TIME_PER_QUESTION\s*=\s*(\d+)", src)
    assert m, "в app.js нет константы TIME_PER_QUESTION"
    assert m.group(1) == "15", "таймер фиксирован: 15 с (см. AGENTS.md)"
