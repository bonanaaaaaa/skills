import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkState } from "./check-state.mjs";

const template = readFileSync(new URL("../state-template.md", import.meta.url), "utf8");

const ready = `# Issue loop state

- Repository: bonanaaaaaa/chess
- Issue URL and number: https://github.com/bonanaaaaaa/chess/issues/2 (#2)
- Issue updated at: 2026-10-10T09:00:00Z
- Owning checkout: /Users/me/lab/chess
- Active driver/session: Claude Code desktop session
- Base branch and SHA: main @ 3aabf2bd873638172262b268e1340735dd993d41
- Working branch: feat/issue-2-pieces-orbit-camera
- Phase: READY
- Resume phase:
- Step invocations: 0
- Review rejections: 1
- Verification failures: 0
- Failed CI heads: 0
- Publication authorization: user asked to continue all issues
- PR URL and head SHA: https://github.com/bonanaaaaaa/chess/pull/10 @ 02df1a5d21af31612d20fe17fbe2adf96024ef46
- Verified/reviewed revision: 02df1a5d21af31612d20fe17fbe2adf96024ef46
- Pending action:
- Blocker and recovery action:

## Scope and acceptance criteria

- The whole board always stays in view.

## Plan

- [x] [frontend-developer] Orbit camera with zoom limits — verify: forced sweep of 32 directions at 375x812
- [-] [devops] CI job — skipped: repo has no CI yet

## Evidence

- measured: forced sweep, 0 off-screen frames @ 02df1a5

## Review findings

- Round 1 FAIL (fresh team-lead): zoom crops the board. Fixed in 02df1a5.
- Round 2 PASS (fresh team-lead).

## History

- 2026-10-10 READY.
`;

const withPhase = (text, phase) => text.replace(/^- Phase: .*$/m, `- Phase: ${phase}`);

test("a complete READY state passes", () => {
  assert.deepEqual(checkState(ready), []);
});

test("the untouched template passes at DISCOVER once identity is filled", () => {
  const discover = template
    .replace("- Repository:", "- Repository: o/r")
    .replace("- Issue URL and number:", "- Issue URL and number: https://github.com/o/r/issues/1 (#1)")
    .replace("- Owning checkout:", "- Owning checkout: /tmp/r");
  assert.deepEqual(checkState(discover), []);
});

test("template placeholders do not count as content", () => {
  const problems = checkState(withPhase(template, "READY"));
  assert.ok(problems.some((p) => p.startsWith("Scope and acceptance criteria is empty")));
  assert.ok(problems.some((p) => p.startsWith("Plan has no checklist items")));
  assert.ok(problems.some((p) => p.startsWith("Evidence is empty")));
  assert.ok(problems.some((p) => p.startsWith("Review findings is empty")));
});

test("a READY state whose record lives only in History fails", () => {
  const historyOnly = ready
    .replace(/## Plan[\s\S]*?## History/, "## Plan\n\n## Evidence\n\n## Review findings\n\n## History")
    .replace(/^- Verified\/reviewed revision: .*$/m, "- Verified/reviewed revision:");
  const problems = checkState(historyOnly);
  assert.ok(problems.some((p) => p.startsWith("Plan has no checklist items")));
  assert.ok(problems.some((p) => p.startsWith("Evidence is empty")));
  assert.ok(problems.some((p) => p.startsWith("Review findings is empty")));
  assert.ok(problems.some((p) => p.startsWith("Verified/reviewed revision")));
});

test("VERIFY needs every plan item done or skipped with a reason", () => {
  const open = withPhase(ready, "VERIFY")
    .replace("- [x] [frontend", "- [ ] [frontend")
    .replace(" — skipped: repo has no CI yet", "");
  const problems = checkState(open);
  assert.ok(problems.some((p) => p.startsWith("Plan item is still open")));
  assert.ok(problems.some((p) => p.startsWith('Skipped plan item has no "skipped:"')));
});

test("plan items need a verification method", () => {
  const problems = checkState(withPhase(ready, "IMPLEMENT").replace(" — verify: forced sweep of 32 directions at 375x812", ""));
  assert.ok(problems.some((p) => p.startsWith('Plan item has no "verify:"')));
});

test("PUBLISH needs a PASS verdict", () => {
  const problems = checkState(withPhase(ready, "PUBLISH").replace("Round 2 PASS", "Round 2 FAIL"));
  assert.ok(problems.includes("Review findings has no PASS verdict."));
});

test("the working branch must name the issue", () => {
  const problems = checkState(ready.replace("feat/issue-2-", "codex/issue-2-"));
  assert.ok(problems.some((p) => p.startsWith("Working branch")));
});

test("a counter over its limit requires BLOCKED", () => {
  const over = ready.replace("- Review rejections: 1", "- Review rejections: 4");
  assert.ok(checkState(over).some((p) => p.includes("over the limit of 3")));
  const blocked = withPhase(over, "BLOCKED")
    .replace("- Resume phase:", "- Resume phase: IMPLEMENT")
    .replace("- Blocker and recovery action:", "- Blocker and recovery action: 4 rejections; ask the user");
  assert.deepEqual(checkState(blocked), []);
});

test("BLOCKED needs a resume phase and a recovery action", () => {
  const problems = checkState(withPhase(ready, "BLOCKED"));
  assert.ok(problems.includes("BLOCKED needs a blocker and recovery action."));
  assert.ok(problems.some((p) => p.startsWith("BLOCKED needs a Resume phase")));
});
