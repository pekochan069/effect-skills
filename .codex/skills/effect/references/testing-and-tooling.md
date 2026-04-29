# Testing And Tooling

Use this reference for tests, test layers, clocks, linting, type errors, CI, debugging, and agent-facing Effect workflows.

Source categories represented here:
- `content/published/patterns/testing/`
- `content/published/patterns/tooling-and-debugging/`
- `content/published/rules/by-use-case/testing.md`
- `content/published/rules/by-use-case/tooling-and-debugging.md`
- `content/published/rules/by-use-case/project-setup--execution.md`

## Testing Effects

- Test workflows by running effects at the boundary with test layers.
- Prefer small layer variants over conditionals inside services.
- Use real Effect services for integration tests when cross-layer behavior matters.
- Use deterministic clocks, refs, queues, and in-memory services for time and concurrency.

```ts
import { Effect, Layer } from "effect"
import { expect, it } from "vitest"

const UsersTest = Layer.succeed(Users)({
  find: (id) => Effect.succeed({ id, name: "Ada" })
})

it("loads a user", async () => {
  const result = await Effect.runPromise(
    loadUserName("u_1").pipe(Effect.provide(UsersTest))
  )

  expect(result).toBe("Ada")
})
```

## Test Coverage Shape

- Unit tests: pure transformation and single-service workflows.
- Integration tests: route -> workflow -> adapter boundaries, especially when middleware, callbacks, or layers interact.
- Error tests: tagged failures, invalid input, downstream failure, timeout, retry exhaustion.
- Concurrency tests: queue bounds, cancellation, duplicated work, and resource finalization.

## Tooling

- Keep TypeScript strict enough to preserve `Effect<A, E, R>` signals.
- Treat the `R` channel as a dependency checklist: if a test fails to compile because a service is missing, provide the layer rather than weakening the type.
- Use linting to catch floating promises, ignored fibers, and unsafe casts.
- Prefer generated indexes and validation scripts when skill/documentation coverage would otherwise drift.

## Debugging

- Read the full `Effect<A, E, R>` type before guessing what failed.
- Inspect `Cause` when defects or interruption matter.
- Add spans and annotations around boundaries, not every expression.
- Narrow failing workflows by replacing live layers with small test layers.

## Skill Repo Validation

- `effect/SKILL.md` has frontmatter with a clear "Use when..." description.
- `effect/SKILL.md` stays below 100 lines where practical.
- Topic files under `effect/references/` are linked from `SKILL.md` or `content-coverage.md`.
- `effect/references/content-coverage.md` is refreshed after source corpus changes.
- Scripts run with Node or Bun without adding new dependencies.

## Avoid

- Mocking every layer in a test that is meant to prove integration.
- Deleting error types just to make tests easier.
- Letting generated documentation drift without a coverage check.
- Treating compiler errors in the `R` channel as noise; they usually identify missing services.
