# Core Concepts

Use this reference for first-principles Effect v4 work: creating effects, composing pipelines, sequencing with generators, running programs, handling optional values, and reading type signatures.

Source categories represented here:
- `content/published/patterns/core-concepts/`
- `content/published/patterns/getting-started/`
- `content/published/rules/by-use-case/core-concepts.md`
- `content/published/rules/by-use-case/getting-started.md`
- `content/published/rules/by-use-case/value-handling.md`

## Defaults

- Effects are lazy descriptions. Constructing an effect does nothing until it reaches a runtime boundary such as `Effect.runPromise`, `Effect.runSync`, `Effect.runFork`, or `Effect.runForkWith`.
- Prefer `Effect.gen` for business workflows with multiple dependent steps. Keep short, linear transformations in `pipe`.
- Use `Effect.sync` for synchronous side effects, `Effect.try` for synchronous side effects that can throw, and `Effect.tryPromise` for promises.
- Keep pure data transformations outside `Effect` unless they need services, failure, tracing, interruption, or scheduling.
- Read `Effect<A, E, R>` as "succeeds with A, fails with E, requires R."

## Construction

```ts
import { Effect } from "effect"

const readConfig = Effect.sync(() => process.env.API_URL ?? "http://localhost:3000")

const fetchJson = (url: string) =>
  Effect.tryPromise({
    try: () => fetch(url).then((response) => response.json() as Promise<unknown>),
    catch: (cause) => new Error(`request failed: ${String(cause)}`)
  })

const program = Effect.gen(function*() {
  const url = yield* readConfig
  return yield* fetchJson(url)
})
```

## Composition

- Use `Effect.map` when the next step is pure.
- Use `Effect.flatMap` or `Effect.gen` when the next step returns another effect.
- Use `Effect.zip` when both results matter structurally, and `Effect.andThen` when the second effect should run after the first.
- Use `Effect.all` for independent effects, with concurrency options when useful.
- Use `Effect.forEach` for collections; make concurrency explicit instead of manually building ad hoc promise loops.

```ts
const ids = ["u1", "u2", "u3"]

const loadAll = Effect.forEach(ids, loadUser, {
  concurrency: 4
})
```

## Running

- Use `Effect.runPromise` at async application boundaries.
- Use `Effect.runSync` only when the effect is known to be synchronous.
- Use `Effect.runFork` for long-running programs that should return a fiber handle.
- Use `Effect.runForkWith(services)` only when forking with an existing context captured inside an effect.

## Optional Values

- Use `Option` for absence that is expected and local.
- Use a tagged error when absence is a domain failure that callers must handle.
- Convert nullable values at the boundary; do not let `null | undefined` spread through business logic.

```ts
import { Effect, Option } from "effect"

const firstEmail = (emails: ReadonlyArray<string>) =>
  Option.fromNullable(emails[0])

const requireEmail = (emails: ReadonlyArray<string>) =>
  firstEmail(emails).pipe(
    Option.match({
      onNone: () => Effect.fail(new Error("missing email")),
      onSome: Effect.succeed
    })
  )
```

## Avoid

- Starting promises before wrapping them in `Effect.tryPromise`.
- Calling `Date.now`, `Math.random`, or environment reads deep in domain code when those values should be testable services.
- Hiding required services by constructing them inside functions that should be pure business logic.
- Returning broad `unknown` or `Error` failures when the domain can name the failure.
