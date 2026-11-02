"""Тесты MCP-сервера quiz (mcp/quiz_server.py).

Гоняют настоящие tool через call_tool: успешные сценарии и ошибочные входы.
Транспорт stdio дополнительно проверяется живой командой `opencode mcp list`.
"""

import asyncio
import importlib.util
import json
from pathlib import Path

import pytest

SERVER_PATH = Path(__file__).resolve().parent / "quiz_server.py"


def load_server():
    spec = importlib.util.spec_from_file_location("quiz_server", SERVER_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.server


server = load_server()


def call(name, args):
    """Вызов tool, возвращает распарсенный JSON (или список для list_decks)."""
    res = asyncio.run(server.call_tool(name, args))
    assert not res.is_error, f"{name} неожиданно вернул ошибку"
    items = [json.loads(b.text) for b in res.content]
    return items[0] if len(items) == 1 else items


def call_fails(name, args, match):
    """Ошибочный вход: tool падает, текст ошибки — в цепочке причин.

    In-process клиент заворачивает ошибку в UnexpectedToolError, а исходный
    ValueError с текстом едет в __cause__/__context__ — именно он сериализуется
    в MCP-error по stdio и виден агенту. Матчим по всей цепочке.
    """
    import re

    try:
        asyncio.run(server.call_tool(name, args))
    except Exception as e:
        chain = " | ".join(str(x) for x in (e, e.__cause__, e.__context__) if x)
        assert re.search(match, chain), f"{name}: ждали '{match}', получили '{chain}'"
        return
    raise AssertionError(f"{name}: ожидали ошибку, но tool прошёл")


def good_deck():
    return {
        "id": "t",
        "title": "t",
        "questions": [
            {"id": "q1", "q": "2+2?", "options": ["3", "4", "5", "6"], "correct": 1}
        ],
    }


# ---------- Успешные сценарии ----------


def test_list_decks_ok():
    decks = call("list_decks", {})
    demo = next(d for d in decks if d["id"] == "demo-it")
    assert demo == {"id": "demo-it", "title": "Основы IT", "questionCount": 3}


def test_get_question_hides_correct():
    q = call("get_question", {"deck_id": "demo-it", "index": 0})
    assert set(q) == {"id", "q", "options"}, "correct не должен утекать в контекст"
    assert len(q["options"]) == 4


def test_check_answer_correct():
    res = call("check_answer", {"deck_id": "demo-it", "question_id": "q1", "answer_idx": 0})
    assert res["correct"] is True
    assert res["explain"].strip(), "пояснение должно вернуться"


def test_check_answer_wrong():
    res = call("check_answer", {"deck_id": "demo-it", "question_id": "q1", "answer_idx": 1})
    assert res["correct"] is False
    assert res["correct_idx"] == 0


def test_validate_deck_ok():
    res = call("validate_deck", {"deck": good_deck()})
    assert res == {"valid": True, "errors": []}


def test_validate_deck_bad():
    bad = good_deck()
    bad["questions"][0]["options"] = ["только", "три", "варианта"]
    bad["questions"][0]["correct"] = 9
    res = call("validate_deck", {"deck": bad})
    assert res["valid"] is False
    assert len(res["errors"]) >= 2


# ---------- Ошибочные входы ----------


def test_get_question_unknown_deck():
    call_fails("get_question", {"deck_id": "nope", "index": 0}, "unknown deck")


def test_get_question_index_out_of_range():
    call_fails("get_question", {"deck_id": "demo-it", "index": 99}, "out of range")


def test_check_answer_bad_idx():
    call_fails(
        "check_answer",
        {"deck_id": "demo-it", "question_id": "q1", "answer_idx": 9},
        "0–3",
    )


def test_check_answer_unknown_question():
    call_fails(
        "check_answer",
        {"deck_id": "demo-it", "question_id": "q999", "answer_idx": 0},
        "unknown question",
    )
