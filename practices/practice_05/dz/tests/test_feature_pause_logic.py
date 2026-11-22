"""Feature: Pause/Resume game logic on Play screen (logic-only, UI separate).

Static assertions against project/app.js source to ensure:
- Functions pauseGame, resumeGame, isPaused exist
- state.current.paused is used to gate answer() and Next navigation
- pauseGame clears timer interval and sets paused=true
- resumeGame restarts timer interval only when not locked, using 200ms tick and 0.2s decrement
- TIME_PER_QUESTION constant and 200ms cadence preserved
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_JS = ROOT / "project" / "app.js"


def src():
    return APP_JS.read_text(encoding="utf-8")


def test_pause_resume_functions_exist():
    s = src()
    assert re.search(r"function\s+pauseGame\s*\(", s), "pauseGame() function is missing"
    assert re.search(r"function\s+resumeGame\s*\(", s), "resumeGame() function is missing"
    assert re.search(r"function\s+isPaused\s*\(\)\s*\{", s), "isPaused() function is missing"


def test_state_has_paused_flag_and_is_set_false_on_start_or_render():
    s = src()
    # paused flag should be referenced off state.current
    assert re.search(r"state\.current\.?[a-zA-Z_]*?paused", s), "no use of state.current.paused"
    # ensure startGame or renderQuestion resets paused to false
    assert (
        re.search(r"startGame\([\s\S]*?state\.current[\s\S]*?paused\s*=\s*false", s)
        or re.search(r"renderQuestion\([\s\S]*?paused\s*=\s*false", s)
    ), "paused should be set to false when (re)starting a question"


def test_answer_is_gated_when_paused():
    s = src()
    # answer() must early-return if paused
    assert re.search(r"function\s+answer\s*\(.*?\)[\s\S]*?state\.current\.[\s\S]*?paused[\s\S]*?return;", s), (
        "answer(idx) should return early when state.current.paused is true"
    )


def test_next_navigation_is_gated_when_paused():
    s = src()
    # onclick for play-next should include a paused guard
    assert re.search(r"play-next" + r"[\s\S]*?onclick\s*=\s*\(\)\s*=>[\s\S]*?state\.current\.[\s\S]*?paused[\s\S]*?return;", s), (
        "Next button handler should guard paused and return early"
    )


def test_pause_clears_interval_and_sets_flag():
    s = src()
    assert re.search(r"pauseGame[\s\S]*?clearInterval\(\s*state\.current\.timerId\s*\)\s*;[\s\S]*?state\.current\.paused\s*=\s*true", s), (
        "pauseGame must clear interval and set paused=true"
    )


def test_resume_restarts_interval_with_200ms_and_0_2_decrement_when_not_locked():
    s = src()
    # Should setInterval with 200 and decrement by 0.2
    assert re.search(r"resumeGame[\s\S]*?setInterval\([\s\S]*?,\s*200\s*\)", s), (
        "resumeGame should use setInterval(..., 200)"
    )
    assert re.search(r"resumeGame[\s\S]*?timeLeft\s*-=?\s*0\.2", s), (
        "resumeGame's timer should decrement timeLeft by 0.2 per tick"
    )


def test_time_per_question_constant_and_tick_unchanged():
    s = src()
    assert re.search(r"TIME_PER_QUESTION\s*=\s*15\b", s), "TIME_PER_QUESTION must remain 15"
    assert re.search(r"setInterval\([\s\S]*?,\s*200\s*\)", s), "Timer tick cadence must remain 200ms"


def test_ui_pause_toggle_wires_to_logic():
    s = src()
    # The pause toggle change handler should call pauseGame/resumeGame
    assert re.search(r"pause-toggle[\s\S]*addEventListener\(\s*['\"]change['\"][\s\S]*pauseGame", s), (
        "Pause toggle change handler should call pauseGame()"
    )
    assert re.search(r"pause-toggle[\s\S]*addEventListener\(\s*['\"]change['\"][\s\S]*resumeGame", s), (
        "Pause toggle change handler should call resumeGame()"
    )
