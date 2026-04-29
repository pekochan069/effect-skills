import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { installTargets } from "../install";

const testLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "effect-skills-test-"));
}

describe("installTargets", () => {
  test("copies the complete Effect skill for native targets", async () => {
    const home = await tempDir();
    const cwd = await tempDir();

    const results = await runInstall({
      targets: [{ target: "codex", scope: "global" }],
      force: false,
      env: { home, cwd },
      skillSource: path.resolve("skills/effect"),
    });

    expect(results).toEqual([
      expect.objectContaining({
        target: "codex",
        status: "installed",
      }),
    ]);

    const destination = path.join(home, ".codex", "skills", "effect");
    await expect(stat(path.join(destination, "SKILL.md"))).resolves.toBeDefined();
    await expect(stat(path.join(destination, "EXAMPLES.md"))).resolves.toBeDefined();
    await expect(stat(path.join(destination, "references"))).resolves.toBeDefined();

    const skill = await readFile(path.join(destination, "SKILL.md"), "utf8");
    expect(skill).toContain("Effect v4");
  });

  test("does not overwrite an existing destination without force", async () => {
    const home = await tempDir();
    const cwd = await tempDir();
    const destination = path.join(home, ".claude", "skills", "effect");
    await mkdir(destination, { recursive: true });
    await writeFile(path.join(destination, "SKILL.md"), "existing user content");

    const results = await runInstall({
      targets: [{ target: "claude", scope: "global" }],
      force: false,
      env: { home, cwd },
      skillSource: path.resolve("skills/effect"),
    });

    expect(results).toEqual([
      expect.objectContaining({
        target: "claude",
        status: "skipped",
      }),
    ]);
    await expect(readFile(path.join(destination, "SKILL.md"), "utf8")).resolves.toBe(
      "existing user content",
    );
  });

  test("replaces only the selected destination when force is enabled", async () => {
    const home = await tempDir();
    const cwd = await tempDir();
    const destination = path.join(home, ".claude", "skills", "effect");
    const sibling = path.join(home, ".claude", "skills", "other");
    await mkdir(destination, { recursive: true });
    await mkdir(sibling, { recursive: true });
    await writeFile(path.join(destination, "SKILL.md"), "old effect content");
    await writeFile(path.join(sibling, "SKILL.md"), "other skill content");

    const results = await runInstall({
      targets: [{ target: "claude", scope: "global" }],
      force: true,
      env: { home, cwd },
      skillSource: path.resolve("skills/effect"),
    });

    expect(results).toEqual([
      expect.objectContaining({
        target: "claude",
        status: "installed",
      }),
    ]);
    await expect(readFile(path.join(destination, "SKILL.md"), "utf8")).resolves.toContain(
      "Effect v4",
    );
    await expect(readFile(path.join(sibling, "SKILL.md"), "utf8")).resolves.toBe(
      "other skill content",
    );
  });

  test("writes a Cursor project rule", async () => {
    const home = await tempDir();
    const cwd = await tempDir();

    const results = await runInstall({
      targets: [{ target: "cursor", scope: "project" }],
      force: false,
      env: { home, cwd },
      skillSource: path.resolve("skills/effect"),
    });

    expect(results).toEqual([
      expect.objectContaining({
        target: "cursor",
        status: "installed",
      }),
    ]);

    const rule = await readFile(path.join(cwd, ".cursor", "rules", "effect-skills.mdc"), "utf8");
    expect(rule).toContain("Effect v4");
    expect(rule).toContain("globs:");
  });

  test("copies native skills into the current project when project scoped", async () => {
    const home = await tempDir();
    const cwd = await tempDir();

    const results = await runInstall({
      targets: [{ target: "opencode", scope: "project" }],
      force: false,
      env: { home, cwd },
      skillSource: path.resolve("skills/effect"),
    });

    expect(results).toEqual([
      expect.objectContaining({
        target: "opencode",
        scope: "project",
        status: "installed",
      }),
    ]);

    await expect(
      stat(path.join(cwd, ".opencode", "skills", "effect", "SKILL.md")),
    ).resolves.toBeDefined();
    await expect(
      stat(path.join(home, ".config", "opencode", "skills", "effect")),
    ).rejects.toThrow();
  });

  test("force replaces only the selected project destination", async () => {
    const home = await tempDir();
    const cwd = await tempDir();
    const projectDestination = path.join(cwd, ".codex", "skills", "effect");
    const globalDestination = path.join(home, ".codex", "skills", "effect");
    const sibling = path.join(cwd, ".codex", "skills", "other");
    await mkdir(projectDestination, { recursive: true });
    await mkdir(globalDestination, { recursive: true });
    await mkdir(sibling, { recursive: true });
    await writeFile(path.join(projectDestination, "SKILL.md"), "old project content");
    await writeFile(path.join(globalDestination, "SKILL.md"), "global content");
    await writeFile(path.join(sibling, "SKILL.md"), "other skill content");

    const results = await runInstall({
      targets: [{ target: "codex", scope: "project" }],
      force: true,
      env: { home, cwd },
      skillSource: path.resolve("skills/effect"),
    });

    expect(results).toEqual([
      expect.objectContaining({
        target: "codex",
        scope: "project",
        status: "installed",
      }),
    ]);
    await expect(readFile(path.join(projectDestination, "SKILL.md"), "utf8")).resolves.toContain(
      "Effect v4",
    );
    await expect(readFile(path.join(globalDestination, "SKILL.md"), "utf8")).resolves.toBe(
      "global content",
    );
    await expect(readFile(path.join(sibling, "SKILL.md"), "utf8")).resolves.toBe(
      "other skill content",
    );
  });

  test("reports missing skill source without creating a partial install", async () => {
    const home = await tempDir();
    const cwd = await tempDir();

    const results = await runInstall({
      targets: [{ target: "codex", scope: "global" }],
      force: false,
      env: { home, cwd },
      skillSource: path.join(cwd, "missing-skill"),
    });

    expect(results).toEqual([
      expect.objectContaining({
        target: "codex",
        status: "failed",
      }),
    ]);

    await expect(stat(path.join(home, ".codex", "skills", "effect"))).rejects.toThrow();
  });

  test("reports missing skill source without creating a partial project install", async () => {
    const home = await tempDir();
    const cwd = await tempDir();

    const results = await runInstall({
      targets: [{ target: "codex", scope: "project" }],
      force: false,
      env: { home, cwd },
      skillSource: path.join(cwd, "missing-skill"),
    });

    expect(results).toEqual([
      expect.objectContaining({
        target: "codex",
        scope: "project",
        status: "failed",
      }),
    ]);

    await expect(stat(path.join(cwd, ".codex", "skills", "effect"))).rejects.toThrow();
  });
});

function runInstall(options: Parameters<typeof installTargets>[0]) {
  return Effect.runPromise(installTargets(options).pipe(Effect.provide(testLayer)));
}
