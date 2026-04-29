# HTTP, API, Platform, And Observability

Use this reference for HTTP clients and servers, API boundaries, middleware, validation, auth, platform services, logging, metrics, and tracing.

Source categories represented here:
- `content/published/patterns/building-apis/`
- `content/published/patterns/making-http-requests/`
- `content/published/patterns/platform/`
- `content/published/patterns/observability/`
- `content/published/rules/by-use-case/building-apis.md`
- `content/published/rules/by-use-case/making-http-requests.md`
- `content/published/rules/by-use-case/platform.md`
- `content/published/rules/by-use-case/observability.md`

## API Boundaries

- Decode request input at the boundary.
- Keep route handlers thin: parse input, call an Effect workflow, encode the response.
- Map domain and infrastructure errors to transport responses in one boundary layer.
- Keep auth and rate limiting explicit middleware or services, not scattered checks.
- Generate OpenAPI or contract docs from the same schemas when possible.

## HTTP Clients

- Wrap HTTP clients as services.
- Set timeouts and retry policy at adapter boundaries.
- Decode response bodies with `Schema`.
- Preserve request IDs and trace context when calling downstream services.

```ts
import { Context, Effect, Schema } from "effect"

class HttpJson extends Context.Service<HttpJson, {
  readonly get: (url: string) => Effect.Effect<unknown, Error>
}>()("HttpJson") {}

const getUser = (url: string) =>
  Effect.gen(function*() {
    const http = yield* HttpJson
    const body = yield* http.get(url)
    return yield* Schema.decodeUnknownEffect(User)(body)
  })
```

## Platform Services

- Prefer platform services for filesystem, path, process, HTTP, and runtime integration when the package is already part of the project.
- Keep platform-specific code at the edge so core workflows remain testable.
- Wrap platform resources in layers when they are shared dependencies.

## Observability

- Use structured logs with operation context.
- Use `Effect.withSpan` around meaningful operations, not every tiny helper.
- Annotate spans with stable low-cardinality attributes.
- Add metrics around external calls, queues, retries, and user-visible latency.
- For MCP stdio tools, write diagnostics to stderr and reserve stdout for protocol data.

## Avoid

- Returning raw thrown errors to HTTP clients.
- Mixing request parsing, domain behavior, and response formatting in one large handler.
- Logging secrets in structured context.
- Adding retries without timeouts and span/log visibility.
