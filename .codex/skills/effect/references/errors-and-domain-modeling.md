# Errors And Domain Modeling

Use this reference for expected failures, domain types, `Option`/`Either`, tagged errors, validation boundaries, and business workflows.

Source categories represented here:
- `content/published/patterns/domain-modeling/`
- `content/published/patterns/error-management/`
- `content/published/patterns/core-concepts/combinator-error-handling.mdx`
- `content/published/rules/by-use-case/domain-modeling.md`
- `content/published/rules/by-use-case/error-handling.md`
- `content/published/rules/by-use-case/error-management.md`

## Model The Domain First

- Use small domain types for values that have rules.
- Use `Schema` and brands when a value must be parsed or validated at a boundary.
- Use `Option` for expected absence.
- Use tagged errors for named domain failures.
- Use `Either` when you need an error-or-value data result instead of an effectful workflow.

## Tagged Errors

Use `Data.TaggedError` for expected failures that callers should handle.

```ts
import { Data, Effect } from "effect"

class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id: string
}> {}

class EmailAlreadyUsed extends Data.TaggedError("EmailAlreadyUsed")<{
  readonly email: string
}> {}

const findUser = (id: string): Effect.Effect<User, UserNotFound> =>
  usersById.get(id) ?? Effect.fail(new UserNotFound({ id }))
```

Recover specifically before catching broadly.

```ts
const response = findUser("u_123").pipe(
  Effect.catchTag("UserNotFound", (error) =>
    Effect.succeed({ status: "missing" as const, id: error.id })
  )
)
```

## Error Boundaries

- Let domain logic fail honestly.
- Map infrastructure errors into domain or adapter errors at adapter boundaries.
- Convert errors to HTTP responses, CLI exit codes, or tool results at the outer boundary.
- Use `Effect.catch` only when one handler truly applies to every remaining expected failure.
- Use `Effect.catchCause` when you need defects, interruption, or the full cause tree.

## Validation

- Validate untrusted input at boundaries.
- Keep parsed/validated domain values inside the system.
- Accumulate validation issues when users need complete feedback.
- Stop early when the next step cannot run safely without the first valid value.

## Business Logic

Use `Effect.gen` for workflows where each decision depends on prior results.

```ts
const registerUser = (input: unknown) =>
  Effect.gen(function*() {
    const userInput = yield* decodeRegistration(input)
    yield* ensureEmailAvailable(userInput.email)
    const user = yield* createUser(userInput)
    yield* sendWelcomeEmail(user)
    return user
  })
```

## Avoid

- Throwing exceptions for expected domain failures.
- Collapsing every failure into `Error` too early.
- Switching on error messages.
- Catching and replacing failures deep in domain logic just to make types look simpler.
- Using nullable values after an input boundary has enough context to decode them.
