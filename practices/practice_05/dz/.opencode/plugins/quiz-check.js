// Hook: автопроверка после правок в project/.
//
// Срабатывает на tool.execute.after для тулов edit/write, если правился
// файл внутри project/. Запускает tests/check.sh; при провале бросает
// исключение — агент видит его как ошибку тула и чинит код.
//
// Файл лежит в .opencode/plugins/ и подхватывается OpenCode автоматически,
// регистрация в opencode.json не нужна.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const EDIT_TOOLS = new Set(["edit", "write"]);

function practiceRoot(input) {
  const candidates = [];
  if (input?.directory) candidates.push(input.directory);
  if (input?.worktree) candidates.push(join(input.worktree, "practices", "practice_04"));
  for (const dir of candidates) {
    if (existsSync(join(dir, "tests", "check.sh"))) return dir;
  }
  return null;
}

function isProjectFile(args) {
  const raw = args?.filePath ?? args?.path ?? args?.file ?? "";
  if (!raw) return false;
  return String(raw).replace(/\\/g, "/").includes("project/");
}

export default async function (input) {
  return {
    "tool.execute.after": async (info) => {
      if (!EDIT_TOOLS.has(info.tool)) return;
      if (!isProjectFile(info.args)) return;
      const root = practiceRoot(input);
      if (!root) return;
      try {
        execFileSync("bash", ["tests/check.sh"], { cwd: root, timeout: 120000 });
      } catch (e) {
        const out = [e.stdout?.toString(), e.stderr?.toString()].filter(Boolean).join("\n");
        throw new Error(`quiz-check: проверка project/ упала:\n${out || e.message}\nПочини и повтори.`);
      }
    },
  };
}
