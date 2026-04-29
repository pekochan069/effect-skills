# Schema And Data

Use this reference for Effect v4 `Schema`, parsing, encoded/type distinctions, domain validation, structural data, and collection helpers.

Source categories represented here:
- `content/published/patterns/schema/`
- `content/published/patterns/domain-modeling/define-contracts-with-schema.mdx`
- `content/published/patterns/domain-modeling/parse-with-schema-decode.mdx`
- `content/published/patterns/core-concepts/data-*.mdx`
- `content/published/rules/by-use-case/domain-modeling.md`
- `content/published/rules/by-use-case/value-handling.md`

## Schema Constructors

Use v4 constructor shapes.

```ts
import { Schema, Struct } from "effect"

const User = Schema.Struct({
  id: Schema.String,
  email: Schema.optionalKey(Schema.String),
  roles: Schema.Array(Schema.String),
  status: Schema.Literals(["active", "disabled"])
})

type User = typeof User.Type
```

- `Schema.optionalKey(A)` means the key may be absent.
- `Schema.optional(A)` means the key may be absent and `undefined` is accepted.
- `Schema.Union([A, B])` models alternatives.
- `Schema.Record(keySchema, valueSchema)` models dynamic maps.

## Decode At Boundaries

- Use `Schema.decodeUnknownEffect(schema)` when invalid input should stay in the Effect error channel.
- Use `Schema.decodeUnknownSync(schema)` only when throwing is acceptable.
- Use option, result, or exit decoders when the caller wants data rather than failed effects.

```ts
const decodeUser = Schema.decodeUnknownEffect(User)
```

## Transform Fields

Use `Struct` helpers with `mapFields` to derive related shapes.

```ts
const PublicUser = User.mapFields(Struct.pick(["id", "status"]))
const UserPatch = User.mapFields(Struct.map(Schema.optional))
```

## Discriminated Data

Use tagged fields for events, commands, and domain states that need exhaustive handling.

```ts
const Created = Schema.Struct({
  _tag: Schema.Literal("Created"),
  id: Schema.String
})

const Deleted = Schema.Struct({
  _tag: Schema.Literal("Deleted"),
  id: Schema.String,
  reason: Schema.String
})

const UserEvent = Schema.Union([Created, Deleted])
```

## Data Helpers

- Use Effect data structures when value equality, immutability, or structural comparison matters.
- Use `Chunk` for high-throughput immutable collections.
- Use `Option` and `Either` to model local absence and branchable validation results.
- Use branded types when a primitive needs a domain guarantee.

## Avoid

- Treating a TypeScript interface as validation.
- Parsing at every layer instead of once at the boundary.
- Using loose records for data that has a known shape.
- Using sync decoding in request handlers unless the framework boundary expects thrown errors.
