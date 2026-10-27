"""MCP-сервер `quiz`: read-only доступ агента к играм Quiz-карточек.

Инструменты:
  list_decks   — список игр [{id, title, questionCount}]
  get_question — вопрос БЕЗ правильного ответа (чтобы не утекал в контекст)
  check_answer — проверка ответа, возвращает correct + explain
  validate_deck — проверка чужого deck-JSON по схеме (для связки со скиллом quiz-generator)

Данные: project/data/decks.json (путь от этого файла, не от cwd).
Правила валидации совпадают с validateDeck() в project/app.js.
"""

import json
from pathlib import Path

from mcp.server.mcpserver import MCPServer

DECKS_PATH = Path(__file__).resolve().parent.parent / "project" / "data" / "decks.json"

server = MCPServer("quiz")


def _err(msg):
    raise ValueError(msg)


def _nonempty_str(v):
    return isinstance(v, str) and bool(v.strip())


def validate_question(q, where=""):
    """Возвращает список ошибок схемы для одного вопроса."""
    errors = []
    if not isinstance(q, dict):
        return [f"{where}: вопрос должен быть объектом"]
    if not _nonempty_str(q.get("id")):
        errors.append(f"{where}: пустой id вопроса")
    if not _nonempty_str(q.get("q")):
        errors.append(f"{where}: пустой текст вопроса")
    options = q.get("options")
    if not isinstance(options, list) or len(options) != 4:
        errors.append(f"{where}: вариантов ровно 4")
    elif not all(_nonempty_str(o) for o in options):
        errors.append(f"{where}: пустой вариант")
    elif len({o.strip() for o in options}) != 4:
        errors.append(f"{where}: дубли вариантов")
    correct = q.get("correct")
    if not isinstance(correct, int) or isinstance(correct, bool) or not 0 <= correct <= 3:
        errors.append(f"{where}: correct — индекс 0–3")
    if "explain" in q and not isinstance(q["explain"], str):
        errors.append(f"{where}: explain должен быть строкой")
    return errors


def validate_deck_dict(deck):
    """Возвращает список ошибок схемы для одной игры."""
    if not isinstance(deck, dict):
        return ["игра должна быть объектом"]
    errors = []
    if not _nonempty_str(deck.get("id")):
        errors.append("пустой id игры")
    if not _nonempty_str(deck.get("title")):
        errors.append(f"игра {deck.get('id')}: пустой title")
    questions = deck.get("questions")
    if not isinstance(questions, list) or len(questions) < 1:
        errors.append(f"игра {deck.get('id')}: вопросов >= 1")
        return errors
    for q in questions:
        errors += validate_question(q, f"игра {deck.get('id')} вопрос {q.get('id') if isinstance(q, dict) else '?'}")
    return errors


def load_decks():
    try:
        decks = json.loads(DECKS_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        _err(f"decks.json не найден: {DECKS_PATH}")
    except json.JSONDecodeError as e:
        _err(f"decks.json invalid: {e}")
    if not isinstance(decks, list):
        _err("decks.json invalid: корень должен быть массивом")
    errors = []
    for d in decks:
        errors += validate_deck_dict(d)
    if errors:
        _err("decks.json invalid: " + "; ".join(errors[:5]))
    return decks


def find_deck(decks, deck_id):
    for d in decks:
        if d["id"] == deck_id:
            return d
    _err(f"unknown deck: {deck_id}")


@server.tool()
def list_decks() -> list:
    """Список игр: id, название, число вопросов."""
    return [
        {"id": d["id"], "title": d["title"], "questionCount": len(d["questions"])}
        for d in load_decks()
    ]


@server.tool()
def get_question(deck_id: str, index: int) -> dict:
    """Вопрос по номеру (0-based). Правильный ответ НЕ возвращается."""
    deck = find_deck(load_decks(), deck_id)
    questions = deck["questions"]
    if not isinstance(index, int) or isinstance(index, bool) or not 0 <= index < len(questions):
        _err(f"index out of range: {index} (всего {len(questions)})")
    q = questions[index]
    return {"id": q["id"], "q": q["q"], "options": q["options"]}


@server.tool()
def check_answer(deck_id: str, question_id: str, answer_idx: int) -> dict:
    """Проверить ответ. Возвращает correct, верный индекс и пояснение."""
    deck = find_deck(load_decks(), deck_id)
    hit = [q for q in deck["questions"] if q["id"] == question_id]
    if not hit:
        _err(f"unknown question: {question_id}")
    if not isinstance(answer_idx, int) or isinstance(answer_idx, bool) or not 0 <= answer_idx <= 3:
        _err(f"answer_idx must be 0–3, got: {answer_idx}")
    q = hit[0]
    ok = answer_idx == q["correct"]
    return {"correct": ok, "correct_idx": q["correct"], "explain": q.get("explain", "") or ""}


@server.tool()
def validate_deck(deck: dict) -> dict:
    """Проверить чужой deck-JSON (например, от quiz-generator) по схеме.

    Возвращает {"valid": bool, "errors": [...]}. Ошибок нет — можно импортировать.
    """
    if not isinstance(deck, dict):
        return {"valid": False, "errors": ["игра должна быть объектом"]}
    errors = validate_deck_dict(deck)
    return {"valid": not errors, "errors": errors}


if __name__ == "__main__":
    server.run()
