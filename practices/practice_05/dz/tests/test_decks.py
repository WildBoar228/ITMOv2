"""Схема project/data/decks.json + фиксированный таймер в project/app.js.

Запускается hook после правок в project/ (см. tests/check.sh),
а также вручную: pytest -q (из practices/practice_04/).
"""

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DECKS = ROOT / "project" / "data" / "decks.json"
APP_JS = ROOT / "project" / "app.js"


def load_decks():
    with open(DECKS, encoding="utf-8") as f:
        return json.load(f)


def js_validateDeck(cases):
    """Прогоняет НАСТОЯЩИЙ validateDeck из project/app.js через node.

    Извлекает функцию из исходника по балансу скобок и применяет
    к фикстурам. Никаких моков: тестируется production-код.
    Возвращает список bool.
    """
    src = APP_JS.read_text(encoding="utf-8")
    start = src.index("function validateDeck(d)")
    brace = src.index("{", start)
    depth = 0
    for i in range(brace, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                func = src[start : i + 1]
                break
    else:
        raise AssertionError("не нашёл тело validateDeck в app.js")
    snippet = func + "\nconst cases = " + json.dumps(cases) + ";"
    snippet += "console.log(JSON.stringify(cases.map(validateDeck)));"
    out = subprocess.run(["node", "-e", snippet], capture_output=True, text=True, timeout=30)
    assert out.returncode == 0, f"node не смог выполнить validateDeck: {out.stderr}"
    return json.loads(out.stdout)


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


def base_question(**overrides):
    q = {"id": "q1", "q": "2+2?", "options": ["3", "4", "5", "6"], "correct": 1}
    q.update(overrides)
    return q


def deck_of(*questions):
    return {"id": "t", "title": "t", "questions": list(questions)}


def test_validateDeck_accepts_optional_explain():
    cases = [
        deck_of(base_question()),
        deck_of(base_question(explain="Потому что 2+2=4.")),
        deck_of(base_question(explain="")),
    ]
    assert js_validateDeck(cases) == [True, True, True], (
        "validateDeck должен принимать вопрос без explain, с текстом и с пустым"
    )


def test_validateDeck_rejects_bad_explain():
    cases = [deck_of(base_question(explain=123)), deck_of(base_question(explain=["текст"]))]
    assert js_validateDeck(cases) == [False, False], (
        "validateDeck должен отклонять нестроковый explain"
    )


def test_demo_decks_ship_explain():
    decks = {d["id"]: d for d in load_decks()}
    q1 = decks["demo-it"]["questions"][0]
    assert isinstance(q1.get("explain"), str) and q1["explain"].strip(), (
        "демо-игра demo-it q1 должна везти непустое пояснение (фича A)"
    )
