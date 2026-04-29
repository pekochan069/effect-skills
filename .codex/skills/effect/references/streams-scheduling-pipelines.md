# Streams, Scheduling, And Pipelines

Use this reference for `Stream`, data pipelines, batching, retries, schedules, sinks, backpressure, and long-running poll/process loops.

Source categories represented here:
- `content/published/patterns/streams/`
- `content/published/patterns/scheduling/`
- `content/published/patterns/building-data-pipelines/`
- `content/published/rules/by-use-case/streams.md`
- `content/published/rules/by-use-case/scheduling.md`
- `content/published/rules/by-use-case/building-data-pipelines.md`

## Streams

- Use `Stream` when values arrive over time, when processing can be chunked, or when resource-safe streaming matters.
- Keep stream construction, transformation, and execution separate.
- Use sinks when the terminal operation has its own accumulation or output semantics.
- Use resource-aware streams for files, HTTP bodies, subscriptions, and database cursors.

## Pipelines

- Add backpressure before adding retries.
- Batch work when downstream systems prefer bulk operations.
- Preserve enough context to send failed items to a dead-letter queue.
- Keep fan-out explicit: one stream to many consumers needs a queue or pubsub strategy, not hidden shared mutable arrays.

## Scheduling

- Use `Schedule` for retry, repeat, polling, and periodic jobs.
- Make stop conditions explicit.
- Add jitter around repeated external calls to avoid synchronized spikes.
- Keep schedule policy near the adapter or workflow that owns the external dependency.

```ts
import { Effect, Schedule } from "effect"

const pollUntilComplete = getStatus.pipe(
  Effect.repeat({
    schedule: Schedule.spaced("2 seconds"),
    until: (status) => status === "complete"
  })
)
```

## Error Handling In Pipelines

- Decide whether an item failure should fail the whole stream, skip one item, retry, or dead-letter.
- Log enough identifying data for replay without leaking secrets.
- Keep retry budgets bounded.

## Avoid

- Loading a large dataset into memory when a stream can process incrementally.
- Retrying an entire pipeline when only one item failed.
- Polling with hand-written recursive timers when `Schedule` expresses the lifecycle.
- Hiding backpressure behind a promise pool with unbounded input.
