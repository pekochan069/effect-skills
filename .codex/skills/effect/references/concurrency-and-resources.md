# Concurrency And Resources

Use this reference for fibers, queues, pubsub, deferred coordination, refs, scopes, pools, timeouts, and resource safety.

Source categories represented here:
- `content/published/patterns/concurrency/`
- `content/published/patterns/resource-management/`
- `content/published/rules/by-use-case/concurrency.md`
- `content/published/rules/by-use-case/resource-management.md`

## Fibers

- Use `Effect.forkChild` for work that belongs to the parent scope.
- Use `Effect.forkDetach` only for work that must outlive the parent and has explicit failure reporting.
- Join with `Fiber.join` when failures should propagate.
- Observe with `Fiber.await` when you need the `Exit`.
- Avoid fire-and-forget unless a supervisor, queue, or logging path owns the result.

```ts
import { Effect, Fiber } from "effect"

const program = Effect.gen(function*() {
  const fiber = yield* Effect.forkChild(loadReport)
  return yield* Fiber.join(fiber)
})
```

## Shared State And Coordination

- Use `Ref` for safe mutable state inside effects.
- Use `Deferred` for one-shot coordination between fibers.
- Use `Queue` for work distribution and backpressure.
- Use `PubSub` for broadcast.
- Use semaphores or bounded queues when concurrency must be limited.

```ts
import { Deferred, Effect } from "effect"

const waitForReady = Effect.gen(function*() {
  const ready = yield* Deferred.make<void>()
  yield* Deferred.succeed(ready, undefined)
  return yield* Deferred.await(ready)
})
```

## Parallelism

- Use `Effect.all` for independent fixed sets.
- Use `Effect.forEach(items, f, { concurrency })` for collections.
- Use racing and timeouts when only the first result matters.
- Keep cancellation and interruption behavior explicit around external resources.

## Resource Safety

- Use `Effect.acquireRelease` for bracketed resources.
- Use scopes for complex lifecycle graphs.
- Use layers for shared resources.
- Release resources in reverse acquisition order by keeping them inside Effect scopes.
- Use pools for expensive resources with bounded reuse.

## Timeouts And Retries

- Time out external calls at adapter boundaries.
- Combine retries with idempotency and observability.
- Avoid retrying operations with non-idempotent side effects unless the side effect is guarded.

## Avoid

- Forking a fiber and ignoring the handle.
- Using process globals for shared state.
- Creating unbounded queues for producer/consumer flows with unknown volume.
- Acquiring resources in plain promises without finalizers.
