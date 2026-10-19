# SpecForgeX

> [简体中文](README.md) | English

> ⚠️ **License restriction**: neither this repo nor upstream SpecForge ships a LICENSE file, so under current law the default is **all rights reserved**. You are free to read, fork and clone this repo; **commercial use, redistribution outside GitHub, or relicensing require prior permission from the upstream author**. See [“Relationship to upstream, license, credits”](#relationship-to-upstream-license-credits) below.

A documentation-driven AI development workflow, rebuilt from [SpecForge](https://github.com/MingYuePop/SpecForge) V3. The core ideas are inherited from upstream — **documentation first** (every decision lands in a doc, so switching sessions loses no memory), **phase separation** (each skill does exactly one thing), and **AC traceability** (acceptance criteria stay traceable from requirement to test). SpecForgeX adds the engineering layer: **review gate, convergence verdict, change archival, configurable toolchain**.

---

## Skill overview (14 skills, three layers)

### Layer 1 — Project level: run once when starting a project (7)

| Skill | Role | What it does | Output |
|---|---|---|---|
| `project-requirements-clarification` | Requirements analyst | Socratic questioning that turns "I want a blog" into a clear picture: core value, target users, key features, constraints. **On first use it asks before creating the two mechanism files, CONSTITUTION.md and TOOLCHAIN.md** | Conversation summary (no business docs) |
| `project-product-overview` | Chief product officer | Upgrades the summary into a formal product doc: vision, core modules, user personas, measurable acceptance criteria | `specs/产品概述.md` |
| `project-tech-stack` | CTO | Picks the **most suitable, not the most popular** stack from the overview, with options, rationale and a recommendation | `specs/技术栈.md` |
| `project-structure` | System architect | Maps core modules to code modules; designs a high-cohesion, low-coupling directory structure | `specs/项目结构.md` |
| `project-dev-standards` | Tech committee | Writes enforceable rules: naming, code style, Git conventions, error handling, AI collaboration protocol — each rule with correct/incorrect examples | `specs/开发规范.md` |
| `project-roadmap-planning` | Technical PM | Dependency analysis → milestone split (MVP / complete / enhanced) → build order, with **vertical slice seeds** for every feature (2–5 slices by user behaviour) | `specs/开发路线图.md` |
| `project-initialization` | DevOps engineer | The only executing skill: creates the skeleton, config files, `git init`, **and walks you through TOOLCHAIN.md** (test commands, verification tools). On an existing project it touches nothing and only does the toolchain walkthrough | Skeleton + `docs/开发记录/初始化记录.md` |

### Layer 2 — Feature level: run for every feature (6)

| Skill | Role | What it does | Output |
|---|---|---|---|
| `feature-requirements-clarification` | Product partner | Digs out one feature's requirements across six dimensions (scenarios / flow / edge cases / rules / scope / quality) and produces Given-When-Then **acceptance criteria (AC)**. When you already wrote the requirement clearly it takes the **fast lane** (AC draft + assumption list); non-functional targets only enter AC when measurable — AC quality decides everything downstream | `specs/features/{feature}/需求.md` + initializes `开发日志.md` |
| `feature-tech-design` | Technical partner | Derives data model, APIs and core logic from the AC; checks what existing code can be reused first; confirms key decisions (new dependencies, trade-offs) with you; ends with an AC coverage table | `specs/features/{feature}/技术方案.md` |
| `feature-task-planning` | Tech lead | Splits into atomic tasks by **vertical slice** (user behaviour); each task gets a plain-language summary, executable verification criteria and a type label (A logic / B UI / C schema); tests are not separate tasks | `specs/features/{feature}/任务规划.md` |
| `feature-implementation` | TDD developer | Executes by task type: A goes RED→GREEN→REFACTOR, B gets component tests + browser verification, C gets migration + query verification. After each task it **loads the `feature-review` skill**; at phase end it emits a **convergence verdict** | Code + tests + `reports/阶段N_完成报告.md` |
| `feature-review` | Code reviewer | The **review gate**, loaded by implementation after each task, or triggered manually ("review Task-03"). Evidence-based: runs the tests itself, checks the diff for scope creep, compares against standards, returns PASS / FAIL / unverified plus a remediation list | Verdict (recorded in the dev log in a fixed format) |
| `feature-evolution` | Product architect | The **change manager**, two modes: (1) a change to an existing feature → impact analysis (including cross-feature checks) → a change folder, canonical docs untouched; (2) "archive CR-XXX" → verify completion, merge back into the canonical docs, append a change log | `specs/changes/CR-XXX-{slug}/` (change proposal / change tasks / merge checklist) |

### Layer 3 — Universal: on demand (1)

| Skill | Role | What it does | Output |
|---|---|---|---|
| `bugfix-workflow` | Debugger | Decides first whether it is really a bug (behaviour diverging from design); quick fix for simple cases, and the hard rule "no reproduction, no code changes" for complex ones; ends with a three-state verdict: verified / partial / failed | Report under `docs/BUG修复文档/` |

### The two mechanism files (not skills, but every skill obeys them)

- **`specs/CONSTITUTION.md` (project constitution)**: on-demand context loading (never read all of `specs/`, only the current feature's docs), six project principles, phase-boundary guard (including the "I know the risk, just do it" escalation exit), dev-log and review-record formats, path and placeholder conventions, and the **missing-mechanism-file protocol** (how an existing project gets bootstrapped).
- **`specs/TOOLCHAIN.md` (toolchain config)**: this project's test commands, lint, UI verification tooling and database verification tooling — every skill verifies through this table instead of assuming you use Supabase or anything else.

---

## How to use it

### Step 0 — Install

```bash
node scripts/install-skills.mjs                       # installs into ~/.agents/skills
node scripts/install-skills.mjs -t ~/.claude/skills   # or another directory (repeatable)
node scripts/install-skills.mjs --dry-run             # show the plan, change nothing
```

Requires Node.js 18+. The script reads `skills/manifest.json` and **flattens** the 14 skills into the target directory (ending up as `~/.agents/skills/feature-review/SKILL.md`). Identical copies are skipped; differing copies are refused by default — `--force` overwrites them, and backs them up to a sibling `_skills_backup_<timestamp>` first. Skills from other sources already in the target are **listed but never deleted**.

Prefer copying by hand? Copy the **14 skill directories under** `skills/project/`, `skills/feature/` and `skills/universal/` into your skills directory, keeping them flat.

> ⚠️ Do not copy the three layer directories `project/`, `feature/`, `universal/` themselves: most tools only look one level deep for `SKILL.md`, so nesting them means zero skills load. Layering is a repo organisation detail, not an install structure.

`specs/` stays in this repo as a reference copy of the mechanism files — a user project's CONSTITUTION/TOOLCHAIN are generated by the workflow after you confirm, so no manual copying is needed.

### Step 1 — New project: seven steps to lay the foundation (do them in one session if possible)

```
/project-requirements-clarification I want to build X     ← asks before creating CONSTITUTION/TOOLCHAIN
/project-product-overview turn the summary into a product overview
/project-tech-stack choose the stack
/project-structure design the directory structure
/project-dev-standards write the development standards
/project-roadmap-planning plan the roadmap                ← every feature gets slice seeds
/project-initialization initialize the project            ← walks you through TOOLCHAIN
```

> The `/project-xxx` form above is illustrative — invoke the same-named skill however your tool works (e.g. just say "use project-tech-stack for the stack", or use the tool's skill entry point).

Each output feeds the next step. Spend two minutes reviewing each document — mistakes at the docs stage are a hundred times cheaper than mistakes found after the code is written.

### Step 2 — Build a feature: a four-step loop (one feature at a time, following the roadmap)

```
① /feature-requirements-clarification add search to the article list
      ↓ produces 需求.md (with AC) + 开发日志.md
② /feature-tech-design search
      ↓ produces 技术方案.md (with AC coverage table)
③ /feature-task-planning search
      ↓ produces 任务规划.md (slices + tasks + verification criteria + type labels)
④ /feature-implementation finish phase 1 of the search feature
      ↓ per task: classify → verify → acceptance → review → tick off
      ↓ phase end: convergence verdict (Converged / Needs Work) + phase report + dev log
```

Suggestion: run ①②③ in one session (their context is tightly coupled); for ④ consider a fresh session per task (the skill forces re-reading the docs, so context is never lost). Review is triggered by implementation after each task, and the dev log is appended by each skill in a fixed format — you don't maintain either by hand.

### Step 3 — Change a delivered feature: the three-step change flow

```
① /feature-evolution add search history to search
      ↓ impact analysis (including cross-feature checks) → specs/changes/CR-001-搜索历史/
      ↓ canonical docs untouched! the change lives in its own folder
② /feature-implementation finish the change tasks for CR-001
      ↓ executes 变更任务.md, same flow as before (review included)
③ /feature-evolution archive CR-001
      ↓ verifies everything is done → merges back per 归并清单.md → moves into changes/archive/
```

Documentation drift (code changed, docs forgotten) dies here: the canonical docs are only touched at archive time, and the merge checklist decides exactly what changes. If a change exceeds ~70% of the original feature, it will push you towards a new feature instead of forcing it in.

### Step 4 — Fix a bug

```
/bugfix-workflow the page doesn't refresh after posting a comment
```

It first decides whether this is really a bug (new behaviour or a changed requirement should use the flow above), refuses to touch code on complex bugs without a reproduction, and ends with a three-state verdict.

### What your project looks like afterwards

```
your-project/
├── specs/
│   ├── CONSTITUTION.md / TOOLCHAIN.md        ← mechanism files
│   ├── 产品概述.md / 技术栈.md / 开发规范.md ...   ← project-level docs
│   ├── features/{feature}/                    ← one directory per feature
│   │   ├── 需求.md / 技术方案.md / 任务规划.md     ← the canonical trio
│   │   ├── 开发日志.md                         ← append-only dev log
│   │   └── reports/                           ← phase reports + acceptance screenshots
│   └── changes/                               ← in-flight changes + archive/
└── docs/开发记录/ (init log, escalation log), docs/BUG修复文档/
```

### Practical advice

- **One thing at a time**: one feature requirement per message; don't "also change X while you're at it".
- **Invoke the skill explicitly**: name it yourself (`/feature-xxx`, or "use feature-xxx", depending on your tool) — more reliable than dropping a vague description and waiting for a guess.
- **Never ignore Needs Work**: when a phase report says Needs Work, its difference list is your next to-do.

---

## Differences from SpecForge V3

| # | Change | Problem it solves |
|---|--------|-------------------|
| 1 | CONSTITUTION.md replaces GUARDRAILS + PROJECT-CONTEXT; context loaded on demand | 120 lines of persuasion waste tokens; rules contradicted each other |
| 2 | TOOLCHAIN.md makes the toolchain configurable | Playwright/Supabase assumptions baked into the author's stack; breaks on any other project |
| 3 | Change folders + merge-on-archive | Doc drift relied on the user remembering to sync |
| 4 | feature-review gate | The review loop upstream's README promised but never shipped |
| 5 | Convergence verdict + bugfix three-state verdict | "Recording" upgraded to "deciding"; nothing goes silent |
| 6 | Cumulative dev log | Scattered phase reports had no continuous memory |
| 7 | TDD classified A/B/C | Performative TDD — fake failing tests for UI or schema work |
| 8 | Fixed broken references (dead links, bad numbering, path typos) | Leftovers from the V3 rewrite |
| 9 | Roadmap slice seeds + unified project-level skills | The project level was still V2 style |
| 10 | Guard escalation exit | The guard was fighting the user |

> **Direction not adopted — parallel execution**: the bottleneck in this workflow is verification and integration (a single browser walkthrough often surfaces nearly ten bugs), while the tasks that could run in parallel mostly share locale files, routes and menu config — running them concurrently would leave `feature-review` without a clean diff as evidence. Worth revisiting once "one commit per task" is the norm.

## Migrating an existing project (one-off, two minutes)

1. **Add the mechanism files**: call any skill — when it notices they are missing it follows the CONSTITUTION "missing-mechanism-file protocol" and asks whether to initialise them; yes means it creates them, no means it works normally and marks the output "not wired to SpecForgeX mechanism files".
2. **Fill in TOOLCHAIN**: call `/project-initialization` — on an existing project it touches no files and only runs the toolchain walkthrough, writing test commands, lint and UI verification tooling into `specs/TOOLCHAIN.md`.
3. **Leave old docs alone**: V3's single-file layout (`specs/features/{feature}.md` etc.) is still read by every skill; leftover GUARDRAILS / PROJECT-CONTEXT files can stay (CONSTITUTION tolerates them) or go.

## Relationship to upstream, license, credits

- **Origin**: a fork of [MingYuePop/SpecForge](https://github.com/MingYuePop/SpecForge), renamed to SpecForgeX. Content starts from the V3 baseline `5d2c453` (2026-03-22); history was squashed into a single initial commit, so commit history does not overlap upstream — compare against that baseline commit when checking specific changes.
- **Inherited vs added**: skill names and the "documentation first / phase separation / AC traceability" methodology come from upstream; the review gate, change folders and archival, convergence verdict, TDD classification, manifest and self-check script are added here.
- **License**: upstream has **no LICENSE file** (i.e. all rights reserved by default), and this repo does not add one either. As a GitHub fork, viewing, forking and cloning on the platform are permitted; **commercial use, distribution outside GitHub, or relicensing require explicit upstream permission**. If upstream adds MIT (its README welcomes PRs), this repo will follow the same license.
- **Design references**: [obra/superpowers](https://github.com/obra/superpowers) (post-task review, subagent execution), [github/spec-kit](https://github.com/github/spec-kit) (constitution, converge loop, three-state bug verdict), [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) (change folders + archive merge), [Trellis](https://docs.trytrellis.app) (per-task spec injection, dev log).

## Self-check

After editing a skill, run `npm test` (the same as `node scripts/check-skills.mjs`, Node 18+). It checks front-matter, the manifest (paths / layer / kind / unique names / no duplicate step within a layer), asset references, leftover placeholders, the mechanism-file copies (line endings are normalised first, so CRLF cannot produce a false failure), and — for both READMEs — the heading structure, full skill name coverage, and the declared skill count against the manifest. It tells you exactly what to fix.

The same checks run automatically in GitHub Actions on push and pull request (Node 18 / 20 / 22), plus four smoke tests: install dry-run, real install, install idempotency, and byte-identical mechanism files in the installed output — so a forgotten manual run cannot push an inconsistency into `main`.
