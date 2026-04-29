import { Effect, Path } from "effect";

import type { TargetName } from "./result";

export type InstallEnvironment = {
  readonly home: string;
  readonly cwd: string;
};

export type TargetKind = "native-skill" | "cursor-rule";

export type Target = {
  readonly name: TargetName;
  readonly label: string;
  readonly description: string;
  readonly kind: TargetKind;
  readonly destinationSegments: (env: InstallEnvironment) => readonly string[];
};

export const supportedTargets: readonly Target[] = [
  {
    name: "codex",
    label: "Codex",
    description: "Install as a Codex user skill.",
    kind: "native-skill",
    destinationSegments: (env) => [env.home, ".codex", "skills", "effect"],
  },
  {
    name: "claude",
    label: "Claude Code",
    description: "Install as a Claude Code personal skill.",
    kind: "native-skill",
    destinationSegments: (env) => [env.home, ".claude", "skills", "effect"],
  },
  {
    name: "opencode",
    label: "OpenCode",
    description: "Install as an OpenCode global skill.",
    kind: "native-skill",
    destinationSegments: (env) => [env.home, ".config", "opencode", "skills", "effect"],
  },
  {
    name: "cursor",
    label: "Cursor",
    description: "Install as a Cursor project rule.",
    kind: "cursor-rule",
    destinationSegments: (env) => [env.cwd, ".cursor", "rules", "effect-skills.mdc"],
  },
];

export function getTarget(name: string): Target | undefined {
  return supportedTargets.find((target) => target.name === name);
}

export function resolveTargetDestination(
  target: Target,
  env: InstallEnvironment,
): Effect.Effect<string, never, Path.Path> {
  return Effect.gen(function* () {
    const path = yield* Path.Path;
    return path.join(...target.destinationSegments(env));
  });
}
