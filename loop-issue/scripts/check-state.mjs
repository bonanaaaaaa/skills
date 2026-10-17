import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const phases = ["DISCOVER", "PLAN", "IMPLEMENT", "VERIFY", "REVIEW", "PUBLISH", "CI_WAIT", "READY"];

const limits = {
  "Review rejections": 3,
  "Verification failures": 3,
  "Failed CI heads": 8,
  "Step invocations": 25,
};

const templateUrl = new URL("../state-template.md", import.meta.url);

// Guidance lines in the template's sections are placeholders, not recorded state.
const placeholders = new Set(
  readFileSync(templateUrl, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "" && !line.startsWith("#") && !line.startsWith("- "))
    .map((line) => line.trim()),
);

const sha = /\b[0-9a-f]{7,40}\b/;
const checklistItem = /^- \[([ x-])\] (.*)$/;

export function parseState(text) {
  const fields = {};
  const sections = {};
  let section = null;
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^## (.+?)\s*$/);
    if (heading) {
      section = heading[1];
      sections[section] = [];
      continue;
    }
    if (section === null) {
      const field = line.match(/^- ([^:]+):\s*(.*)$/);
      if (field) fields[field[1].trim()] = field[2].trim();
      continue;
    }
    const trimmed = line.trim();
    if (trimmed !== "" && !placeholders.has(trimmed)) sections[section].push(trimmed);
  }
  return { fields, sections };
}

function reached(phase, target) {
  return phases.indexOf(phase) >= phases.indexOf(target);
}

export function checkState(text) {
  const { fields, sections } = parseState(text);
  const problems = [];
  const field = (name) => fields[name] ?? "";
  const lines = (name) => sections[name] ?? [];

  for (const name of ["Repository", "Issue URL and number", "Owning checkout", "Phase"]) {
    if (field(name) === "") problems.push(`${name} is empty.`);
  }

  let phase = field("Phase");
  if (phase === "BLOCKED") {
    if (field("Blocker and recovery action") === "") problems.push("BLOCKED needs a blocker and recovery action.");
    phase = field("Resume phase");
    if (!phases.includes(phase)) {
      problems.push(`BLOCKED needs a Resume phase from ${phases.join(", ")}.`);
      return problems;
    }
  } else if (!phases.includes(phase)) {
    problems.push(`Phase "${phase}" is not one of ${phases.join(", ")}, BLOCKED.`);
    return problems;
  }

  for (const [name, limit] of Object.entries(limits)) {
    const value = field(name);
    if (!/^\d+$/.test(value)) {
      problems.push(`${name} must be a whole number, found "${value}".`);
    } else if (Number(value) > limit && field("Phase") !== "BLOCKED") {
      problems.push(`${name} is ${value}, over the limit of ${limit}; the issue must be BLOCKED.`);
    }
  }

  if (reached(phase, "PLAN")) {
    if (lines("Scope and acceptance criteria").length === 0) {
      problems.push("Scope and acceptance criteria is empty; DISCOVER copies the issue's criteria there.");
    }
    if (!sha.test(field("Base branch and SHA"))) problems.push("Base branch and SHA has no commit SHA.");
  }

  const items = lines("Plan")
    .map((line) => line.match(checklistItem))
    .filter(Boolean)
    .map(([, mark, body]) => ({ mark, body }));

  if (reached(phase, "IMPLEMENT")) {
    const issueNumber = field("Issue URL and number").match(/(\d+)\D*$/)?.[1];
    const branch = field("Working branch");
    if (!new RegExp(`^(feat|fix|chore)/issue-${issueNumber ?? "\\d+"}-[a-z0-9-]+$`).test(branch)) {
      problems.push(`Working branch "${branch}" does not match <feat|fix|chore>/issue-<number>-<slug>.`);
    }
    if (items.length === 0) problems.push("Plan has no checklist items (- [ ] [role] item — verify: method).");
    for (const { mark, body } of items) {
      if (mark !== "-" && !/\bverify:/i.test(body)) problems.push(`Plan item has no "verify:" method: ${body}`);
    }
  }

  if (reached(phase, "VERIFY")) {
    for (const { mark, body } of items) {
      if (mark === " ") problems.push(`Plan item is still open: ${body}`);
      if (mark === "-" && !/\bskipped:/i.test(body)) problems.push(`Skipped plan item has no "skipped:" reason: ${body}`);
    }
  }

  if (reached(phase, "REVIEW")) {
    const evidence = lines("Evidence");
    if (evidence.length === 0) problems.push("Evidence is empty; VERIFY records each check there.");
    else if (!evidence.some((line) => sha.test(line))) problems.push("Evidence names no tested revision (commit SHA or diff fingerprint).");
    if (!sha.test(field("Verified/reviewed revision"))) problems.push("Verified/reviewed revision has no commit SHA or diff fingerprint.");
  }

  if (reached(phase, "PUBLISH")) {
    const findings = lines("Review findings");
    if (findings.length === 0) problems.push("Review findings is empty; REVIEW records the verdict and reviewer there.");
    else if (!findings.some((line) => /\bPASS\b/.test(line))) problems.push("Review findings has no PASS verdict.");
  }

  if (reached(phase, "CI_WAIT")) {
    if (!/\/pull\/\d+/.test(field("PR URL and head SHA")) || !sha.test(field("PR URL and head SHA"))) {
      problems.push("PR URL and head SHA needs both the PR URL and the head SHA.");
    }
  }

  return problems;
}

export function runCli(args = process.argv.slice(2), { log = console.log, logError = console.error } = {}) {
  if (args.length !== 1) {
    logError("Usage: node check-state.mjs <.loop/issues/owner--repo--number.md>");
    return 2;
  }
  const problems = checkState(readFileSync(args[0], "utf8"));
  if (problems.length > 0) {
    logError(`${args[0]} does not support its recorded phase:`);
    for (const problem of problems) logError(`- ${problem}`);
    return 1;
  }
  log(`${args[0]} supports its recorded phase.`);
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli();
}
