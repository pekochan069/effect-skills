# Services And Layers

Use this reference for Effect v4 dependency injection, service design, layer composition, configuration, and application runtime boundaries.

Source categories represented here:
- `content/published/patterns/core-concepts/understand-layers-for-dependency-injection.mdx`
- `content/published/patterns/core-concepts/access-config-in-context.mdx`
- `content/published/patterns/core-concepts/provide-config-layer.mdx`
- `content/published/patterns/resource-management/scoped-service-layer.mdx`
- `content/published/rules/by-use-case/core-concepts.md`
- `content/published/rules/by-use-case/resource-management.md`

## Service Shape

Use `Context.Service` for Effect v4 services. Put construction in `make`; expose layers explicitly.

```ts
import { Context, Effect, Layer } from "effect"

class Config extends Context.Service<Config, {
  readonly apiBaseUrl: string
}>()("Config") {
  static readonly layer = Layer.succeed(Config)({
    apiBaseUrl: "http://localhost:3000"
  })
}

class ApiClient extends Context.Service<ApiClient, {
  readonly getJson: (path: string) => Effect.Effect<unknown>
}>()("ApiClient", {
  make: Effect.gen(function*() {
    const config = yield* Config
    return {
      getJson: (path) =>
        Effect.tryPromise(() => fetch(`${config.apiBaseUrl}${path}`).then((r) => r.json()))
    }
  })
}) {
  static readonly layer = Layer.effect(ApiClient)(ApiClient.make).pipe(
    Layer.provide(Config.layer)
  )
}
```

## Layer Composition

- Build small layers near their service definitions.
- Compose application layers at the edge with `Layer.merge`, `Layer.mergeAll`, and `Layer.provide`.
- Provide the full layer once near the route, CLI command, server entry, test, or worker boundary.
- Prefer service variants such as `layer`, `layerLive`, `layerTest`, and `layerMemory` over hidden conditionals inside a service.

```ts
const AppLayer = Layer.mergeAll(
  Config.layer,
  ApiClient.layer,
  Logger.layer
)
```

## Configuration

- Use `Config` or a service backed by `Config` for environment-derived values.
- Decode and validate configuration at startup boundaries.
- Avoid reading environment variables from business logic.

## Scoped Resources

- Use `Effect.acquireRelease` for one resource used inside one workflow.
- Use a layer when the resource is a dependency shared across workflows.
- Use `Layer.launch` or `ManagedRuntime.make` for long-lived applications that need scoped resources to remain open.
- Use `Effect.provide(program, layer)` for one-off programs.

## Repo-Specific Boundaries

- In the Effect Patterns source repo, the API server owns HTTP and database access.
- The MCP transport owns protocol handling and calls the API over HTTP; it should not import Next.js, database code, or workspace packages.
- MCP stdio diagnostics must go to stderr so stdout remains protocol-safe.

## Avoid

- Constructing live dependencies inside domain functions.
- Providing layers repeatedly in the middle of a call graph.
- Using a global singleton where a layer variant would keep tests isolated.
- Letting resource acquisition escape a scope without a matching finalizer.
