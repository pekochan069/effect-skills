# Effect v4 Examples

These examples are v4-native.

For deeper guidance, open the topic files under [references/](references/).

## Service Definition

```ts
import { Context, Effect, Layer } from "effect";

export class Users extends Context.Service<
  Users,
  {
    readonly find: (id: string) => Effect.Effect<{ readonly id: string }>;
  }
>()("Users", {
  make: Effect.succeed({
    find: (id) => Effect.succeed({ id }),
  }),
}) {
  static readonly layer = Layer.effect(Users)(Users.make);
}
```

Use the service by yielding the class inside `Effect.gen`.

```ts
const getUser = (id: string) =>
  Effect.gen(function* () {
    const users = yield* Users;
    return yield* users.find(id);
  });
```

## Service Dependencies

```ts
import { Context, Effect, Layer } from "effect";

class AppConfig extends Context.Service<
  AppConfig,
  {
    readonly logPrefix: string;
  }
>()("AppConfig") {
  static readonly layer = Layer.succeed(AppConfig)({ logPrefix: "api" });
}

class Logger extends Context.Service<
  Logger,
  {
    readonly info: (message: string) => Effect.Effect<void>;
  }
>()("Logger", {
  make: Effect.gen(function* () {
    const config = yield* AppConfig;
    return {
      info: (message) => Effect.log(`[${config.logPrefix}] ${message}`),
    };
  }),
}) {
  static readonly layer = Layer.effect(Logger)(Logger.make).pipe(Layer.provide(AppConfig.layer));
}
```

Compose application layers near the edge of the program.

```ts
const AppLayer = Layer.mergeAll(AppConfig.layer, Logger.layer, Users.layer);

Effect.runPromise(getUser("u_123").pipe(Effect.provide(AppLayer)));
```

## Errors

```ts
import { Data, Effect } from "effect";

class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id: string;
}> {}

class DatabaseUnavailable extends Data.TaggedError("DatabaseUnavailable")<{
  readonly cause: unknown;
}> {}

const loadUser = (
  id: string,
): Effect.Effect<{ readonly id: string }, UserNotFound | DatabaseUnavailable> =>
  id === "" ? Effect.fail(new UserNotFound({ id })) : Effect.succeed({ id });

const handled = loadUser("").pipe(
  Effect.catchTag("UserNotFound", (error) =>
    Effect.succeed({ id: error.id, missing: true as const }),
  ),
);
```

Use `Effect.catch` only when every remaining expected error should be handled the same way.

```ts
const response = loadUser("u_123").pipe(
  Effect.map((user) => ({ status: 200 as const, user })),
  Effect.catch((error) => Effect.succeed({ status: 500 as const, reason: error._tag })),
);
```

## Fibers

```ts
import { Effect, Fiber } from "effect";

const program = Effect.gen(function* () {
  const fiber = yield* Effect.forkChild(Effect.sleep("100 millis").pipe(Effect.as("done")));

  return yield* Fiber.join(fiber);
});
```

Use detached fibers only for work that must outlive the parent scope and has its own failure reporting.

```ts
const startHeartbeat = Effect.forever(
  Effect.log("heartbeat").pipe(Effect.andThen(Effect.sleep("30 seconds"))),
).pipe(Effect.forkDetach);
```

## Ref And Deferred

```ts
import { Deferred, Effect, Ref } from "effect";

const program = Effect.gen(function* () {
  const counter = yield* Ref.make(0);
  yield* Ref.update(counter, (n) => n + 1);
  const value = yield* Ref.get(counter);

  const ready = yield* Deferred.make<number>();
  yield* Deferred.succeed(ready, value);
  return yield* Deferred.await(ready);
});
```

## Runtime Execution

```ts
import { Effect } from "effect";

const main = Effect.log("started");

Effect.runPromise(main);
```

When an effect needs services and must be forked from an existing effect, capture the current context.

```ts
const forkWithCurrentServices = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const services = yield* Effect.context<R>();
    return Effect.runForkWith(services)(effect);
  });
```

## Schema

```ts
import { Schema, Struct } from "effect";

const User = Schema.Struct({
  id: Schema.String,
  email: Schema.optionalKey(Schema.String),
  roles: Schema.Array(Schema.String),
  status: Schema.Literals(["active", "disabled"]),
});

const UserPatch = User.mapFields(Struct.map(Schema.optional));
const PublicUser = User.mapFields(Struct.pick(["id", "status"]));

const decodeUser = Schema.decodeUnknownEffect(User);
```

Use sync decoding only at places where throwing on invalid data is acceptable.

```ts
const user = Schema.decodeUnknownSync(User)({
  id: "u_123",
  roles: ["admin"],
  status: "active",
});
```

## Tests

Illustrative: this pattern requires a test runner such as Vitest, which is intentionally not a dependency of this skill repo. Build tests by providing small layers rather than branching inside services.

```ts
import { Effect, Layer } from "effect";
import { expect, it } from "vitest";

const TestUsers = Layer.succeed(Users)({
  find: (id) => Effect.succeed({ id }),
});

it("loads a user", async () => {
  const result = await Effect.runPromise(getUser("u_123").pipe(Effect.provide(TestUsers)));

  expect(result).toEqual({ id: "u_123" });
});
```
