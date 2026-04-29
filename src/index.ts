#!/usr/bin/env node

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Path } from "effect";

import { runCli } from "./cli";

const program = Effect.gen(function* () {
  const path = yield* Path.Path;
  const skillSource = yield* path.fromFileUrl(new URL("../skills/effect", import.meta.url));
  const result = yield* runCli({
    args: process.argv.slice(2),
    env: {
      home: process.env.HOME ?? "",
      cwd: process.cwd(),
    },
    skillSource,
    isTty: process.stdin.isTTY === true,
  });

  yield* Effect.sync(() => {
    const stream = result.status === "error" ? process.stderr : process.stdout;
    stream.write(`${result.output}\n`);
  });

  if (result.status === "error") {
    yield* Effect.sync(() => {
      process.exitCode = 1;
    });
  }
});

NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)));
