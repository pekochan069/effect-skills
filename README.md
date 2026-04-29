# Effect Skills

Agent skills for projects using Effect.

## Skills

- [`effect`](skills/effect/SKILL.md) - Effect v4 best practices for the Effect Patterns codebase and adjacent projects.

## Layout

```text
effect/
  SKILL.md                  # routing surface agents load first
  EXAMPLES.md               # compact v4 examples
  references/               # topic references loaded on demand
```

The `effect` skill is intentionally v4-only. It uses the [Effect Patterns](https://github.com/PaulJPhilp/EffectPatterns) content corpus as source material, but the installed skill keeps guidance curated and split by topic so agents do not need to load hundreds of source files.

## CLI install

Install the Effect skill into a specific agent:

```bash
bunx @pekochan069/effect-skills install --target codex
```

By default, native agent skills install globally. Install into the current project instead with `--scope project`:

```bash
bunx @pekochan069/effect-skills install --target codex --scope project
```

Run the interactive checkbox installer to select one or more agents:

```bash
bunx @pekochan069/effect-skills install
```

In the checkbox prompt, first select agents, then select one install scope for native skill targets. Press Ctrl-C to cancel without installing. For scripts and non-TTY environments, pass `--target`; add `--scope project` when the install should be local to the current project.

Replace an existing Effect skill install intentionally:

```bash
bunx @pekochan069/effect-skills install --target codex --force
```

Supported v1 targets:

- `codex` - installs the full `skills/effect` skill directory for Codex, globally or under the current project's `.codex/skills`.
- `claude` - installs the full `skills/effect` skill directory for Claude Code, globally or under the current project's `.claude/skills`.
- `opencode` - installs the full `skills/effect` skill directory for OpenCode, globally or under the current project's `.opencode/skills`.
- `cursor` - installs a Cursor project rule under `.cursor/rules`.

The installer refuses to overwrite an existing destination unless `--force` is passed. Project scope is resolved from the current working directory. Depending on the target agent, restart or reload the agent after installing so it discovers the new guidance.

## Skills-manager install

Install this repository with your skills manager, for example:

```bash
skills add https://github.com/pekochan069/effect-skills
```

## Read more

This skill is based on `https://github.com/PaulJPhilp/EffectPatterns`

The `skills add ... -l` command validates the local path and lists the installable skill without modifying an agent installation.

Before installing locally, check:

- `skills/effect/SKILL.md` has frontmatter with a specific "Use when..." description.
- `skills/effect/SKILL.md` stays concise and links to topic references instead of embedding the corpus.
- `docs/content-coverage.md` lists every source category from `content/published/patterns/`.
- Executable TypeScript examples validate against the installed `effect` package; illustrative test-runner examples are marked.
- Topic reference links resolve locally.
