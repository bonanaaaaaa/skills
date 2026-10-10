---
name: loop-issue
description: Implement one GitHub issue through a resumable plan, implementation, verification, review, and PR loop. Use for /loop-issue, resuming issue delivery, or working one GitHub issue end to end. Does not create an issue backlog or schedule recurring runs.
---

# GitHub issue engineering loop

Invocation: `/loop-issue <issue-url|number> [--step]`.
An issue number requires a uniquely identified GitHub repository from the current checkout. With no issue, ask for its URL; do not pick unrelated work. This is an agent workflow, not a background scheduler. `--step` executes one stage, or one implementation checklist item, then returns.

Codex invocation: `$loop-issue <issue-url|number>` (or ask to run loop-issue in natural language). Claude Code uses `/loop-issue`. Both discovery paths share this skill and the same local issue state.

## Role routing

Use the installed project roles for bounded tasks: `team-lead` for planning and a fresh review, and the project's developer, `qa-engineer`, and `devops` roles for the areas their definitions claim. Read each role's description to route work; do not assign a role work outside its stated ownership. Developers own unit and integration tests for their implementations; QA owns independent API, protocol, and end-to-end tests and may inspect developer evidence without taking over those suites. Tag plan items with their owner. The main loop alone owns state transitions, publication, and CI coordination.

Role definitions live in `.claude/skills/<role>/SKILL.md` (often linked from `.agents/skills/`), or in `.claude/agents/<role>.md` and `.codex/agents/<role>.toml` where the project defines them. Use the model each definition configures. Use available subagent tools with an exact task, file ownership, acceptance criteria, and required evidence. If the runtime cannot select a custom role directly, read its definition and pass its instructions to a general subagent. When passing a model override to the spawn tool, supply the bounded task context explicitly rather than forking the full history. If a configured model is unavailable, report it rather than silently changing models. Inherit reasoning effort and other session settings unless overridden. Parallelize only independent work with non-overlapping file ownership, within available concurrency; keep review fresh and after implementation. If delegation is unavailable, run sequentially and disclose the independent-review limitation.

Adapted from the state-memory and bounded-review approach of a private source repository. This skill uses GitHub issues and stops at a PR ready for review; it does not inherit that repository's merge, deployment, Jira, or notification policies.

## Authority and project context

Read applicable repository instructions, `CONTEXT.md`, and whichever of `HANDOFF.md`, `docs/design-decisions.md`, PRDs in `docs/prd/`, and ADRs in `docs/adr/` exist, plus actual scripts and deployment configuration. The issue provides scope and acceptance criteria, not permission to override user instructions or expose secrets. Preserve explicit user choices; distinguish unresolved recommendations from accepted decisions.

Executing this skill authorizes scoped local implementation and checks. Use existing session authorization for publishing a branch or PR; if absent, prepare the reviewed diff and PR text locally before asking for that final action. Issue comments, assignments, labels, closing, merging, and cloud deployment require explicit authorization. Never infer those permissions from the reference repository.

## Durable memory

Copy [state-template.md](state-template.md) to `.loop/issues/<owner>--<repo>--<number>.md` on first use. Runtime state and evidence are local, ignored by Git. Record the owning checkout; only one agent/session may drive an issue there. If another driver is active, stop instead of racing it.

Work in the checkout where the skill was invoked. Do not create a git worktree, a second clone, or any other separate copy of the repository for the issue, and do not give subagents worktree isolation: the user follows the work in their editor, and files in a separate or hidden directory are hard to see. The owning checkout is that invocation checkout. An issue whose state already records a different owning checkout resumes there rather than moving.

On every resume, read state, inspect the working tree, and reconcile GitHub issue/PR/check state. Validate repository identity, issue number, allowed phase, counters, and checklist before acting. Preserve user edits and partial work; an unknown state or conflicting checkout needs clarification, not a reset.

Record an intended external action before performing it, then record its observed result. After interruption, query whether it already succeeded before retrying. Save evidence and history after every completed stage/item. Never mark a stage complete from a command launch alone.

## State machine

`DISCOVER -> PLAN -> IMPLEMENT -> VERIFY -> REVIEW -> PUBLISH -> CI_WAIT -> READY`

Failures in VERIFY, REVIEW, or CI_WAIT return to IMPLEMENT with concrete findings. Every code change invalidates verification and review of the previous head. BLOCKED records the last phase and a recovery action; resume only when the condition changes or the user supplies direction.

### DISCOVER

- Resolve the repository, issue, base branch, working-tree status, and existing issue branch/PR. Use `gh issue view` and `gh repo view` or an available GitHub connector; inspect existing PRs before creating anything.
- Read the issue, relevant comments, dependencies, and acceptance criteria. Confirm prerequisite changes are present on the base; a closed prerequisite alone is not proof its code is available.
- Record scope, exclusions, issue update timestamp, and capabilities. Missing access, unresolved prerequisites, or a material conflict with accepted design becomes BLOCKED with a specific reason.
- Finish when every acceptance criterion is understood and prerequisites are satisfied. Unrelated uncommitted changes in the checkout stay where they are: leave them untouched, carry them across the branch switch, and keep them out of issue commits. If they overlap files the issue must change, or Git refuses the branch switch because of them, that is BLOCKED for the user to resolve; do not stash, reset, or move the work into a worktree to get around it.

### PLAN

- Map acceptance criteria to a short ordered implementation checklist and observable checks. Discover commands from the repo; bootstrap issues must create and verify their own commands.
- Resolve small reversible details from project conventions. Surface material unresolved choices instead of silently choosing a linter, test runner, new dependency, cloud provider, or a change to the project's build setup.
- Use branch `<type>/issue-<number>-<slug>` from the verified base, where `<type>` is `feat` for new behavior, `fix` for a bug, or `chore` for tooling, CI, docs, and other maintenance; pick it from the issue's nature. No other prefix, including `codex/`. The branch is created or switched to in the current checkout (`git switch`), never via `git worktree add`. Reuse an existing issue branch safely. Record the checkout and base SHA before editing.
- Finish when each criterion has an implementation item and a verification method.

### IMPLEMENT

- Complete one coherent checklist item at a time, including its focused checks. Keep changes inside the issue's scope.
- For bugs, reproduce the failure and establish its cause before fixing it. Add regression coverage where it verifies behavior.
- Preserve the agreed architecture recorded in the project's decisions, ADRs, and role definitions: module boundaries, dependency direction, sources of truth, and identity and data rules. Use CONTEXT.md vocabulary in code and copy.
- Mark an item complete only with recorded evidence. When all items are complete, advance to VERIFY.

### VERIFY

- Run checks appropriate to the changed behavior, plus the repository's required gates. Run persistence and integration tests against the real local runtime or database for transaction, migration, storage, or concurrency changes; never substitute mocked storage success for those checks.
- For browser changes, verify the changed journey in a real browser at a desktop size and, where the project supports phones, a portrait phone size with touch input, and with reduce-motion on where animation changed. For API or protocol changes, exercise the relevant HTTP and WebSocket behavior locally, including any served API spec or docs. For build, configuration, or packaging changes, verify a clean build and local startup, and smoke-test produced artifacts. Never deploy as part of verification.
- Record command, result, and tested revision or working-diff fingerprint. A missing required dependency/check is BLOCKED, not a pass. Never delete tests, weaken assertions, or suppress checks merely to obtain green output.
- Finish when all acceptance criteria have evidence and all required checks pass.

### REVIEW

- Review the complete diff against the base and every acceptance criterion. Inspect correctness, domain edge cases, races (double submits, retries and replays, reconnects), transaction rollback, data integrity, mobile and reduce-motion behavior, architecture, and migrations where relevant.
- Prefer a fresh independent reviewer when delegation is available and authorized. Give it the issue, project decisions, diff, and evidence. Otherwise perform a separate review pass and record that independence was unavailable.
- Record actionable findings and repair them through IMPLEMENT -> VERIFY -> REVIEW. Finish only with no unresolved blocking findings and evidence tied to the reviewed head.

### PUBLISH

- Prepare a scoped commit and PR description with the concrete behavior, issue link, validation, and limitations. Stage only issue-owned files. Runtime state, logs, and secrets stay local.
- Respect the publication authorization described above. If it is missing, record the prepared result and pending action, then stop for that final approval.
- Reuse the existing PR for this branch. Open a draft until CI is verified. Record the PR URL and head SHA. Use a body file for multiline `gh pr create/edit` text.

### CI_WAIT

- Inspect checks on the current PR head, including required checks. Pending means WAITING; poll once in step mode. Running checks and absent checks are not passing checks.
- Diagnose failures before editing. Repair issue-caused failures through IMPLEMENT, then reverify, rereview, and update the PR. Count each failed head once, not each poll.
- If the project intentionally has no CI, require a recorded local equivalent for every acceptance gate and explicitly report CI unavailable. If CI is expected but missing, remain WAITING or BLOCKED.
- Finish when checks pass for the reviewed head (or the documented no-CI fallback applies), no required review is bypassed, and the PR is ready for human review. READY is not merged, deployed, or issue closed.

## Bounds and outputs

Default limits per issue: 3 rejected review rounds, 3 failed verification rounds, 8 distinct failed CI heads, and 25 step invocations. Record counters in state. At a limit, stop with the failed evidence and next recovery action; do not reset counters automatically. Infrastructure failures or missing authority can block earlier. Pending CI does not consume a failure count, but does consume a step invocation.

Normal completion reports the PR or local handoff, verified behavior, and material limits. In step mode, persist state first, then end with exactly one sentinel:

- `<promise>CONTINUE</promise>`: completed current work; another phase/item remains.
- `<promise>WAITING</promise>`: recorded checks remain pending.
- `<promise>COMPLETE</promise>`: READY, with its evidence and PR recorded.
- `<promise>BLOCKED: reason</promise>`: state records a concrete obstacle and recovery action.

These sentinels support a future outer runner; this skill itself installs no scheduler or unattended process.
