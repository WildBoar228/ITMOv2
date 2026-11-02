"""Фича B: кнопки «✎» (правка) и «🗑» (удаление с confirm) на карточках списка.

Правка переиспользует экран редактора: заголовок «Редактирование»,
«Сохранить» обновляет deck по id. Всё в памяти, персист — через экспорт.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_JS = ROOT / "project" / "app.js"
INDEX_HTML = ROOT / "project" / "index.html"
STYLE_CSS = ROOT / "project" / "style.css"


def src():
    return APP_JS.read_text(encoding="utf-8")


def test_list_cards_have_edit_and_delete_buttons():
    s = src()
    assert "✎" in s, "в renderList нет кнопки правки «✎»"
    assert "🗑" in s, "в renderList нет кнопки удаления «🗑»"


def test_delete_uses_confirm():
    s = src()
    assert re.search(r"confirm\s*\(", s), "удаление должно спрашивать confirm()"


def test_edit_mode_reuses_editor():
    s = src()
    html = INDEX_HTML.read_text(encoding="utf-8")
    assert "editingId" in s, "нет признака режима правки (editingId)"
    assert "Редактирование" in s, "заголовок «Редактирование» не ставится"
    assert 'id="editor-title"' in html, "заголовку редактора нужен id='editor-title'"


def test_save_updates_deck_by_id_instead_of_always_push():
    s = src()
    assert re.search(r"findIndex|find\s*\(\s*\(d\)", s), "сохранение должно находить deck по id"
    assert "card-actions" in s or "edit-btn" in s, "нет контейнера/классов кнопок карточки"
    css = STYLE_CSS.read_text(encoding="utf-8")
    assert "card-actions" in css or "icon-btn" in css, "стили кнопок должны жить в style.css"
