import type { Target } from "./targets";

export type RenderOptions = {
  readonly skillSource: string;
};

export type InstallArtifact =
  | {
      readonly type: "copy-directory";
      readonly source: string;
    }
  | {
      readonly type: "write-file";
      readonly contents: string;
    };

export function renderInstallArtifact(target: Target, options: RenderOptions): InstallArtifact {
  if (target.kind === "native-skill") {
    return {
      type: "copy-directory",
      source: options.skillSource,
    };
  }

  return {
    type: "write-file",
    contents: renderCursorRule(),
  };
}

function renderCursorRule(): string {
  const displaySource = "skills/effect/SKILL.md";

  return [
    "---",
    "description: Effect v4 guidance for TypeScript projects",
    "globs:",
    '  - "**/*.{ts,tsx,mts,cts}"',
    "alwaysApply: false",
    "---",
    "",
    "# Effect v4",
    "",
    "Use this rule when writing, reviewing, or debugging Effect v4 code.",
    `The canonical skill source is ${displaySource}.`,
    "",
    "- Prefer imports from `effect` and use v4-native APIs.",
    "- Define dependencies with `Context.Service` and provide layers at the boundary.",
    "- Model expected failures with tagged errors and recover with specific handlers.",
    "- Use Schema decode APIs at trust boundaries.",
    "- Verify Effect changes with typecheck and focused tests.",
    "",
    `Generated from ${displaySource}.`,
    "",
  ].join("\n");
}
