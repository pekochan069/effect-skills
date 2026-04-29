import { Effect, FileSystem, Path } from "effect";

import type { TargetName } from "./result";
import { renderInstallArtifact } from "./target-renderers";
import type { InstallEnvironment, InstallScope } from "./targets";
import { getTarget, resolveTargetDestination } from "./targets";

export type InstallSelection = {
  readonly target: TargetName;
  readonly scope: InstallScope;
};

export type InstallOptions = {
  readonly targets: readonly InstallSelection[];
  readonly force: boolean;
  readonly env: InstallEnvironment;
  readonly skillSource: string;
};

export type InstallResult = {
  readonly target: TargetName;
  readonly scope: InstallScope;
  readonly status: "installed" | "skipped" | "failed";
  readonly destination: string;
  readonly message: string;
};

export function installTargets(
  options: InstallOptions,
): Effect.Effect<readonly InstallResult[], never, FileSystem.FileSystem | Path.Path> {
  return Effect.forEach(options.targets, (selection) =>
    Effect.gen(function* () {
      const target = getTarget(selection.target);
      if (target === undefined) {
        return {
          target: selection.target,
          scope: selection.scope,
          status: "failed",
          destination: "",
          message: `Unsupported target: ${selection.target}`,
        } satisfies InstallResult;
      }

      const scope = target.kind === "cursor-rule" ? "project" : selection.scope;
      const destination = yield* resolveTargetDestination(target, options.env, scope);

      return yield* Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const exists = yield* fs.exists(destination);

        if (!options.force && exists) {
          return {
            target: target.name,
            scope,
            status: "skipped",
            destination,
            message: "Destination already exists. Re-run with --force to replace it.",
          } satisfies InstallResult;
        }

        const artifact = renderInstallArtifact(target, {
          skillSource: options.skillSource,
        });

        if (artifact.type === "copy-directory") {
          yield* copyDirectory(artifact.source, destination, options.force);
        } else {
          yield* writeTextFile(destination, artifact.contents, options.force);
        }

        return {
          target: target.name,
          scope,
          status: "installed",
          destination,
          message: `Installed ${target.label} guidance.`,
        } satisfies InstallResult;
      }).pipe(
        Effect.catch((error) =>
          Effect.succeed({
            target: target.name,
            scope,
            status: "failed",
            destination,
            message: error instanceof Error ? error.message : String(error),
          } satisfies InstallResult),
        ),
      );
    }),
  );
}

function copyDirectory(
  source: string,
  destination: string,
  force: boolean,
): Effect.Effect<void, unknown, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    if (force) {
      yield* fs.remove(destination, { recursive: true, force: true });
    }

    yield* fs.makeDirectory(path.dirname(destination), { recursive: true });
    yield* fs.copy(source, destination, { overwrite: false });
  });
}

function writeTextFile(
  destination: string,
  contents: string,
  force: boolean,
): Effect.Effect<void, unknown, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    if (force) {
      yield* fs.remove(destination, { force: true });
    }

    yield* fs.makeDirectory(path.dirname(destination), { recursive: true });
    yield* fs.writeFileString(destination, contents);
  });
}
