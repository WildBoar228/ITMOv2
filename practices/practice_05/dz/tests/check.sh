#!/usr/bin/env bash
# Runner автопроверки: вызывается hook после правок в project/,
# а также вручную из practices/practice_04/: bash tests/check.sh
set -u
cd "$(dirname "$0")/.." || exit 1

fail=0

echo "== decks.json =="
python3 -m json.tool project/data/decks.json > /dev/null || fail=1

echo "== node --check =="
node --check project/app.js || fail=1

echo "== pytest =="
pytest -q || fail=1

if [ "$fail" -eq 0 ]; then
  echo CHECK_OK
else
  echo CHECK_FAIL
  exit 1
fi
