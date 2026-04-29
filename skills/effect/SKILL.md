---
name: effect
description: Applies Effect v4 best practices for TypeScript projects, especially the Effect Patterns repo. Use when writing, reviewing, or debugging Effect v4 code, services, layers, schemas, errors, fibers, runtimes, tests, or repo-specific Effect architecture.
---

# Effect v4

Use this skill for Effect v4 code. The target package is `effect@4.x`; keep all examples and recommendations v4-native.

## Quick Start

Before editing Effect code:

1. Check the installed version in `node_modules/effect/package.json`.
2. Prefer imports from `effect`; use `effect/unstable/*` only when the feature lives there.
3. Define dependencies with `Context.Service`.
4. Compose layers explicitly and provide once at the boundary.
5. Model expected failures as tagged values and recover with specific handlers before broad catches.
6. Verify with typecheck and the narrowest relevant tests.

## Topic Routing

- Basics, `Effect.gen`, constructors, running effects, `Option`, `Either`: [references/core-concepts.md](references/core-concepts.md)
- Services, layers, config, dependency injection, runtimes: [references/services-and-layers.md](references/services-and-layers.md)
- Tagged errors, validation boundaries, domain workflows: [references/errors-and-domain-modeling.md](references/errors-and-domain-modeling.md)
- Schema, data modeling, decoding, transformations: [references/schema-and-data.md](references/schema-and-data.md)
- Fibers, queues, pubsub, refs, scopes, pools: [references/concurrency-and-resources.md](references/concurrency-and-resources.md)
- Streams, schedules, data pipelines, polling, batching: [references/streams-scheduling-pipelines.md](references/streams-scheduling-pipelines.md)
- HTTP, APIs, platform services, observability: [references/http-api-platform-observability.md](references/http-api-platform-observability.md)
- Testing, tooling, debugging, skill validation: [references/testing-and-tooling.md](references/testing-and-tooling.md)

## Layers

- Name the primary layer `layer`; use clear variants like `layerTest`, `layerMemory`, or `layerLive`.
- Wire service dependencies with `Layer.provide`.
- Compose a full dependency graph once near the runtime, route, CLI command, or test boundary.
- v4 memoizes layers across `Effect.provide` calls, but repeated `provide` calls should still be treated as a smell.
- Use `Layer.fresh` or `Effect.provide(layer, { local: true })` only when test or resource isolation is intentional.

## Error Handling

- Use `Data.TaggedError` for expected domain failures.
- Use `Effect.catchTag`, `Effect.catchTags`, and `Effect.catchIf` for specific typed recovery.
- Use `Effect.catch` only at boundaries that intentionally handle every remaining expected failure.
- Use `Effect.catchCause` when defects, interruption, or full cause inspection matter.
- Use `Effect.catchFilter` with `Filter` for predicate-based recovery.
- Avoid `catch` in domain logic when the effect can fail honestly and be handled at a boundary.

## Fibers And Runtime

- Use `Effect.forkChild` for child fibers and `Effect.forkDetach` for detached fibers.
- Join fibers explicitly with `Fiber.join` or observe them with `Fiber.await`.
- Do not `yield*` `Ref`, `Deferred`, or `Fiber` values directly; use `Ref.get`, `Deferred.await`, and `Fiber.join`.
- Do not use `Runtime` as an execution object. Run effects with `Effect.runPromise`, `Effect.runFork`, or `Effect.runForkWith(services)`.

## Schema

- Use array-based constructors: `Schema.Union([A, B])`, `Schema.Tuple([A, B])`, `Schema.Literals(["a", "b"])`.
- Use `Schema.Record(key, value)` for maps.
- Use `Schema.optionalKey` for exact optional object properties and `Schema.optional` when `undefined` is also allowed.
- Use `Schema.decodeUnknownEffect`, `Schema.decodeUnknownSync`, or another `decodeUnknown*` API based on failure semantics.
- Use `Struct` helpers for field transforms such as pick, omit, partial, and required.

## Repo-Specific Rules

- Run commands from the project root.
- Use Bun and `workspace:*` dependencies; do not add TypeScript path aliases.
- Keep the API server and MCP transport boundaries intact: transport code calls the API over HTTP and does not import Next.js, database code, or workspace packages.
- In MCP stdio code, write diagnostic logs to stderr, never stdout.
- For cleanup or refactor work, add focused regression tests before changing behavior.

## More Examples

See [EXAMPLES.md](EXAMPLES.md) for v4-only examples for services, layers, errors, fibers, runtime execution, Schema, and tests.
