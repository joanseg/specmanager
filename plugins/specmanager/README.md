# SpecManager

SpecManager runs a project's lifecycle as a kanban board: PRD → Architecture → Design (optional) → Plan → Build → Walkthroughs. Claude drafts each stage from the previous approved one and from your code; you edit and approve each document in a board served from your own computer. Every document and task is a plain markdown or JSON file in your project's repository, so git tracks all of it.

## Where it works

Claude Code only: the terminal, the IDE extensions, and the Code tab of the desktop app.

Cowork is not supported. The plugin's commands appear there, but its MCP server (a local program that gives Claude the SpecManager tools and serves the board) cannot run: the desktop app does not install the server's dependencies, and does not tell it which project folder a session is working in.

Chat on claude.ai is not supported. Chat does not load local MCP servers, agents or hooks, and this plugin is made of those: the MCP server, agents (prompts that draft each document) and one hook (a script run when Claude finishes responding).

## Requirements

Node.js 20 or later, and `npm` on your `PATH`.

## Install

Install from the plugin directory, or from the GitHub marketplace:

```
/plugin marketplace add joanseg/specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

## First use

In your project, run `/specmanager:specmanager-init`, then `/specmanager:specmanager-prd` with a feature title. A stage opens only after you approve the previous stage's document in the board.

| Command | What it does |
|---|---|
| `/specmanager:specmanager-init` | Sets up the spec folder and the managed files listed below. |
| `/specmanager:specmanager-interview` | Optional: questions you about an idea before the PRD. |
| `/specmanager:specmanager-prd` | Drafts the PRD, creating the feature if needed. |
| `/specmanager:specmanager-architecture` | Drafts the Architecture from the PRD and your code. |
| `/specmanager:specmanager-design` | Optional: draws the screens as one HTML mockup file. |
| `/specmanager:specmanager-plan` | Drafts the Plan and its tasks, grouped into phases. |
| `/specmanager:specmanager-build` | Builds one phase, then stops for your review. |
| `/specmanager:specmanager-walkthrough` | Writes up what a finished phase built. |
| `/specmanager:specmanager-board` | Opens the board in your browser. |

## Examples

1. **Turn an idea into a PRD.** Run `/specmanager:specmanager-interview a CRM to manage our sales pipeline`. Claude asks you a few pointed questions about who needs it and why, and saves the interview. Then run `/specmanager:specmanager-prd Sales pipeline CRM`: a draft PRD appears in the board's PRD column for you to edit and approve.
2. **Design the build from the approved PRD.** Run `/specmanager:specmanager-architecture sales-pipeline-crm`, approve the result in the board, then run `/specmanager:specmanager-plan sales-pipeline-crm`. The plan lands as a document plus a list of small, scored tasks grouped into phases, visible in the Build column.
3. **Build one phase and review it.** Run `/specmanager:specmanager-build sales-pipeline-crm next`. Claude builds the first phase task by task, runs that phase's tests, has a read-only reviewer check the result against the plan and architecture, and drafts a walkthrough of what was built. It stops at the end of the phase so you can check the work before the next one.

## What this plugin does on your machine

- **Installs dependencies.** At plugin install, its Node dependencies are downloaded from the npm registry at the versions pinned in the bundled lockfile. None runs an install script.
- **Starts a local web server.** The board server starts and stops with each Claude session that has the plugin enabled. It listens on `127.0.0.1` only, so other machines cannot reach it; it has no authentication, so other programs on your computer can. It uses port 4317 (configurable) or the next free port. An earlier board process still running for the same project is sent a termination signal first.
- **Registers a Stop hook.** It exits immediately unless a phase started by `/specmanager:specmanager-build` in the same session is still in flight. Then it runs that phase's test command, taken from the plan in your repository, through `bash -lc` in the project directory, and checks that the phase's tasks are done. On failure Claude is told to keep working; after three failures the phase is marked blocked and Claude may stop.
- **Writes files in your project.** Documents, tasks and an index under `.claude/specs/`; a block in `CLAUDE.md` between two SpecManager marker comments; and `docs/DESIGN.md`, a design summary generated from your UI source files, also between markers. Both are created if missing; text outside the markers is left alone. Repository paths you pass to the init command have their `CLAUDE.md` and `DESIGN.md` read and copied under `repos/` in your project; nothing is written into those repositories.
- **Edits code and commits during a build.** The build command has Claude change your code and make local git commits, under your normal permissions. It does not push.
- **Opens your browser.** The board command launches your default browser at the board's address through the system opener (`open`, `xdg-open` or `cmd /c start`).
- **Keeps small state files.** A pidfile with the board's process id, in the plugin's data directory (or the system temporary directory if there is none). Under the git-ignored `.claude/specs/.cache/`: `active-build.json`, naming the build in flight, and `stop-gate/`, the hook's retry counter.
- **Sends no data anywhere.** The plugin makes no model or API calls of its own and has no telemetry or analytics. Its only network use is the npm registry at install and the board on the loopback address; the board loads nothing from the internet. Drafting and building run in your own Claude session, where the architecture agent may use the session's web tools to look up public library documentation.

## Troubleshooting

- **The MCP server fails to start.** The dependency install probably did not finish (slow network, or `npm` missing). Run `npm ci --ignore-scripts` in the plugin's install directory (the folder containing this README, under `~/.claude/plugins/cache/`), then reconnect with `/mcp`.
- **Upgraded from a version before 1.0.** The `node_modules` folder in the plugin's data directory, under `~/.claude/plugins/data/`, is no longer used and can be deleted.

## Support

- **Bugs, questions and feature requests:** open an issue at <https://github.com/joanseg/specmanager/issues>.
- **Security concerns:** report them privately from the repository's **Security** tab with **Report a vulnerability**, rather than in a public issue.

## License

MIT. Source and full documentation: <https://github.com/joanseg/specmanager> and <https://specmanager.org>.
