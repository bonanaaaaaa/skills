# skills
Agent skills shared across all projects

## Layout

- `<skill>/` — generic skills usable in any repo.
- `projects/<project>/<skill>/` — skills tuned to one project's stack. Same-named skills differ per project.

## Generic

| Skill | Description |
|---|---|
| [to-spec](to-spec/SKILL.md) | Synthesize a repository spec from settled design discussions, `GLOSSARY.md`, or a feature idea. |
| [loop-issue](loop-issue/SKILL.md) | Deliver one GitHub issue through a resumable plan → implement → verify → review → PR loop. |
| [team-lead](team-lead/SKILL.md) | Plan bounded issues and independently review architecture, acceptance criteria, and evidence. |

`loop-issue` routes work to `team-lead` plus the project's own role skills below.

## Projects

| Skill | [resume](projects/resume) (SvelteKit, Workers static assets) |
|---|---|
| frontend-developer | ✓ |
| qa-engineer | ✓ |
| devops | ✓ |
| edit-resume | ✓ |

The chess role skills live in the chess repository itself (`.claude/skills/`), next to the code they describe.

## Install

Copy or symlink a skill folder into a project's `.claude/skills/` (or `~/.claude/skills/` for all projects):

```bash
ln -s "$PWD/to-spec" ~/.claude/skills/to-spec
```
