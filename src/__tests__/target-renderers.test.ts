import { describe, expect, test } from "bun:test";

import { NodePath } from "@effect/platform-node";
import { Effect } from "effect";

import { renderInstallArtifact } from "../target-renderers";
import { getTarget, resolveTargetDestination, supportedTargets } from "../targets";

describe("target registry", () => {
  test("lists the supported v1 targets", () => {
    expect(supportedTargets.map((target) => target.name)).toEqual([
      "codex",
      "claude",
      "opencode",
      "cursor",
    ]);
  });

  test("resolves documented destinations from fake environment paths", async () => {
    const env = { home: "/home/tester", cwd: "/workspace/project" };

    await expect(resolveDestination("codex", env, "global")).resolves.toBe(
      "/home/tester/.codex/skills/effect",
    );
    await expect(resolveDestination("claude", env, "global")).resolves.toBe(
      "/home/tester/.claude/skills/effect",
    );
    await expect(resolveDestination("opencode", env, "global")).resolves.toBe(
      "/home/tester/.config/opencode/skills/effect",
    );
    await expect(resolveDestination("cursor", env, "global")).resolves.toBe(
      "/workspace/project/.cursor/rules/effect-skills.mdc",
    );
  });

  test("resolves native project destinations from fake environment paths", async () => {
    const env = { home: "/home/tester", cwd: "/workspace/project" };

    await expect(resolveDestination("codex", env, "project")).resolves.toBe(
      "/workspace/project/.codex/skills/effect",
    );
    await expect(resolveDestination("claude", env, "project")).resolves.toBe(
      "/workspace/project/.claude/skills/effect",
    );
    await expect(resolveDestination("opencode", env, "project")).resolves.toBe(
      "/workspace/project/.opencode/skills/effect",
    );
    await expect(resolveDestination("cursor", env, "project")).resolves.toBe(
      "/workspace/project/.cursor/rules/effect-skills.mdc",
    );
  });

  test("renders native targets as full skill directory copies", () => {
    const target = getTarget("claude");

    expect(target).toBeDefined();
    if (target) {
      expect(renderInstallArtifact(target, { skillSource: "/repo/skills/effect" })).toEqual({
        type: "copy-directory",
        source: "/repo/skills/effect",
      });
    }
  });

  test("renders Cursor as an MDC project rule", () => {
    const target = getTarget("cursor");

    expect(target).toBeDefined();
    if (target) {
      const artifact = renderInstallArtifact(target, {
        skillSource: "/repo/skills/effect",
      });

      expect(artifact.type).toBe("write-file");
      if (artifact.type === "write-file") {
        expect(artifact.contents).toContain("---");
        expect(artifact.contents).toContain("Effect v4");
        expect(artifact.contents).toContain("skills/effect/SKILL.md");
      }
    }
  });

  test("does not render local source paths into Cursor rules", () => {
    const target = getTarget("cursor");

    expect(target).toBeDefined();
    if (target) {
      const artifact = renderInstallArtifact(target, {
        skillSource: "/tmp/private-checkout/skills/effect",
      });

      expect(artifact.type).toBe("write-file");
      if (artifact.type === "write-file") {
        expect(artifact.contents).not.toContain("/tmp/private-checkout");
      }
    }
  });
});

function resolveDestination(
  targetName: string,
  env: { readonly home: string; readonly cwd: string },
  scope: "global" | "project",
) {
  const target = getTarget(targetName);
  if (target === undefined) {
    throw new Error(`Missing target ${targetName}`);
  }

  return Effect.runPromise(
    resolveTargetDestination(target, env, scope).pipe(Effect.provide(NodePath.layer)),
  );
}
