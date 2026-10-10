# skills
Agent skills shared across all projects

## Layout

- `<skill>/` — generic skills usable in any repo.
- `projects/<project>/<skill>/` — skills tuned to one project's stack. Same-named skills differ per project.

## Generic

| Skill | Description |
|---|---|
| [to-prd](to-prd/SKILL.md) | Synthesize a repository PRD from settled design discussions, `CONTEXT.md`, or a feature idea. |
| [loop-issue](loop-issue/SKILL.md) | Deliver one GitHub issue through a resumable plan → implement → verify → review → PR loop. |
| [team-lead](team-lead/SKILL.md) | Plan bounded issues and independently review architecture, acceptance criteria, and evidence. |

`loop-issue` routes work to `team-lead` plus the project's own role skills below.

## Projects

| Skill | [chess](projects/chess) (Cloudflare Workers, Three.js) | [scos](projects/scos) (Hono, Prisma, PostgreSQL, AWS Lambda) |
|---|---|---|
| backend-developer | ✓ | ✓ |
| frontend-developer | ✓ | ✓ |
| qa-engineer | ✓ | ✓ |
| devops | ✓ | ✓ |

## Install

Copy or symlink a skill folder into a project's `.claude/skills/` (or `~/.claude/skills/` for all projects):

```bash
ln -s "$PWD/to-prd" ~/.claude/skills/to-prd
```
