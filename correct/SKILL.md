---
name: correct
description: Find mistakes agents keep repeating in a repository and make each one impossible, fixing it at the highest level that works - architecture, types, a lint or CI check, a test, and docs last. Use for /correct, after the user corrects the same mistake twice, or when fix commits keep landing in one area. Does not deliver unrelated issues.
---

# Make repeated mistakes impossible

Adapted from the `correct` skill in Lauren Tan's [pstack](https://github.com/backnotprop/pstack) (MIT). This version reads `loop-issue` state and GitHub history, and follows this repository's publication rules.

Codex: `$correct [area]`. Claude Code: `/correct [area]`.

Assume every contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. Change the repository so that a change that looks right from one file is right for the whole repository. A rule an agent can skip is not a fix.

## Find the mistake classes

Read applicable repository instructions, `GLOSSARY.md` (or `CONTEXT.md`), `docs/design-decisions.md`, and ADRs first, so a fix never contradicts an accepted decision. Then gather evidence of repeated mistakes:

- `fix:` commits and reverts in `git log`, grouped by the area they touch. Several fixes to one area in a short span is a candidate class.
- Review rounds and History in `.loop/issues/*.md`: FAIL verdicts, findings carried to later issues, and repeated "not verified" gaps.
- PR review comments and requested changes (`gh pr view --comments`, `gh api repos/<owner>/<repo>/pulls/<n>/comments`).
- Corrections the user gave in this session, and comments in the code that explain a workaround.

Group the mistakes into classes by cause, not by symptom. A class counts once it has happened twice. Cite each occurrence by commit, PR, or state file.

## Fix each class at the highest level that works

1. **Architecture.** Give each piece of state one owner and each task one supported way. Hide internals so the wrong import fails. Replace hand-synced lists with one source of truth. Delete old ways and dead code an agent would copy.
2. **Types.** Make the bad state impossible to write.
3. **Lint or CI check.** If bad code still compiles, add a check whose error names the file, type, or function to use instead. If the pattern is already common, fail only when a change adds more of it.
4. **Test the behavior.** Fix or delete any test that would still pass if every function it calls returned nothing.
5. **Docs or role-skill rules, last.** Use them only for judgment calls. Nothing fails when an agent skips them.

For each class, say why each higher level did not work before you settle on a lower one.

## Fix and prove

Fix the most frequent classes first, one commit per class, on a branch named `fix/correct-<slug>` (or as GitHub issues for `loop-issue` when a fix is large). Prove each new check fails on a real past mistake: check out or reapply the bad change, run the check, and record the failure. Run the same command locally and in CI. An exception goes on the offending line with a reason, an expiry date, and the user's approval.

Publishing follows existing session authorization, as in `loop-issue`: prepare the branch and PR text locally, and ask before pushing if authorization is absent. Do not post comments, close issues, or merge.

## Keep the rule table

Keep one table in the repository's agent instructions (`CLAUDE.md` or `AGENTS.md`) that pairs each rule with what enforces it, for example:

| Rule | Enforced by |
|---|---|
| HUD fits every supported viewport | `pnpm test:layout` (viewport sweep) |

When the user corrects a mistake, fix it and add the rule. If the rule was already there and nothing enforces it, that is a repeat: move it up a level in the same change. Drop a rule once its mistake cannot happen.

**Reply:** each class with its evidence, the level chosen and why a higher level did not work, the proof that the check fails on the past mistake, and the classes left for later.
