---
name: edit-resume
description: Update resume content - profile, summary, contacts, employers, positions, highlights, skills - in src/lib/resume.ts, keeping every look and the two-page print layout intact. Use when asked to add a job, reword a highlight, update skills, or tailor the resume.
---

# edit-resume

All resume content lives in `src/lib/resume.ts`; components only render it. Change content there, not in Svelte markup. Keep the exported types (`Employer`, `Position`, `SkillGroup`, `Link`) satisfied, and keep `profile.stats` and the summary consistent with the positions, such as years of experience.

Write highlights as short past-tense achievements with concrete scope and outcome. Do not invent employers, dates, metrics or skills: ask when a fact is missing. Keep employers in reverse chronological order, and group related companies under one employer using `Position.company`. Contacts are real personal details; change them only when the user asks, and never add new personal data on your own.

After editing, run `pnpm fmt`, `pnpm check` and `pnpm build`. Check the three looks and the print preview: the printed resume must stay at two A4 pages, so shorten or merge highlights rather than letting it run to a third page. Report what changed and whether the print still fits. Regenerating the PDF in the repo root is a separate step; do it only when asked.
