import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { BunServices } from "@effect/platform-bun";
import { Effect } from "effect";

import { runCli } from "../cli";

const testLayer = BunServices.layer;

describe("runCli command parsing", () => {
  test("renders Effect CLI help for the top-level command", () => {
    const result = Effect.runSync(
      runCli({
        args: ["--help"],
        env: { home: "/fake-home", cwd: "/fake-cwd" },
        skillSource: path.resolve("skills/effect"),
        isTty: false,
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("ok");
    expect(result.output).toContain("effect-skills");
    expect(result.output).toContain("install");
  });

  test("rejects unsupported targets with usage", () => {
    const result = Effect.runSync(
      runCli({
        args: ["install", "--target", "unknown"],
        env: { home: "/fake-home", cwd: "/fake-cwd" },
        skillSource: path.resolve("skills/effect"),
        isTty: false,
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("error");
    expect(result.output).toContain("unknown");
    expect(result.output).toContain("codex");
    expect(result.output).toContain("cursor");
  });

  test("rejects a target flag without a value", () => {
    const result = Effect.runSync(
      runCli({
        args: ["install", "--target"],
        env: { home: "/fake-home", cwd: "/fake-cwd" },
        skillSource: path.resolve("skills/effect"),
        isTty: false,
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("error");
    expect(result.output).toContain("target");
  });

  test("rejects a scope flag without a value", () => {
    const result = Effect.runSync(
      runCli({
        args: ["install", "--target", "codex", "--scope"],
        env: { home: "/fake-home", cwd: "/fake-cwd" },
        skillSource: path.resolve("skills/effect"),
        isTty: false,
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("error");
    expect(result.output).toContain("scope");
  });

  test("rejects unsupported scopes with usage", () => {
    const result = Effect.runSync(
      runCli({
        args: ["install", "--target", "codex", "--scope", "workspace"],
        env: { home: "/fake-home", cwd: "/fake-cwd" },
        skillSource: path.resolve("skills/effect"),
        isTty: false,
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("error");
    expect(result.output).toContain("workspace");
    expect(result.output).toContain("global");
    expect(result.output).toContain("project");
  });
});

describe("runCli", () => {
  test("runs interactive multi-target installs with an injected selector", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "effect-skills-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "effect-skills-cwd-"));

    const result = await Effect.runPromise(
      runCli({
        args: ["install"],
        env: { home, cwd },
        skillSource: path.resolve("skills/effect"),
        isTty: true,
        selectTargets: () => [
          { target: "codex", scope: "global" },
          { target: "claude", scope: "project" },
        ],
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.results.map((item) => item.target)).toEqual(["codex", "claude"]);
      expect(result.results.map((item) => item.scope)).toEqual(["global", "project"]);
      expect(result.results.every((item) => item.status === "installed")).toBe(true);
    }
  });

  test("rejects interactive installs in non-TTY environments", async () => {
    const result = await Effect.runPromise(
      runCli({
        args: ["install"],
        env: { home: "/fake-home", cwd: "/fake-cwd" },
        skillSource: path.resolve("skills/effect"),
        isTty: false,
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("error");
    expect(result.output).toContain("--target");
  });

  test("treats an intentionally empty interactive selection as a successful no-op", async () => {
    const result = await Effect.runPromise(
      runCli({
        args: ["install"],
        env: { home: "/fake-home", cwd: "/fake-cwd" },
        skillSource: path.resolve("skills/effect"),
        isTty: true,
        selectTargets: () => [],
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("ok");
    expect(result.output).toContain("No targets selected");
  });

  test("cancels interactive installs without creating artifacts when selection fails", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "effect-skills-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "effect-skills-cwd-"));

    const result = await Effect.runPromise(
      runCli({
        args: ["install"],
        env: { home, cwd },
        skillSource: path.resolve("skills/effect"),
        isTty: true,
        selectTargets: () => Promise.reject(new Error("User force closed the prompt")),
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("error");
    expect(result.output).toContain("cancelled");
    await expect(stat(path.join(home, ".codex", "skills", "effect"))).rejects.toThrow();
    await expect(stat(path.join(home, ".claude", "skills", "effect"))).rejects.toThrow();
    await expect(stat(path.join(cwd, ".cursor", "rules", "effect-skills.mdc"))).rejects.toThrow();
  });

  test("reports direct install outcomes", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "effect-skills-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "effect-skills-cwd-"));

    const result = await Effect.runPromise(
      runCli({
        args: ["install", "--target", "cursor"],
        env: { home, cwd },
        skillSource: path.resolve("skills/effect"),
        isTty: false,
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("ok");
    expect(result.output).toContain("cursor (project):");
    expect(result.output).toContain(".cursor/rules/effect-skills.mdc");
  });

  test("direct installs default to global scope", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "effect-skills-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "effect-skills-cwd-"));

    const result = await Effect.runPromise(
      runCli({
        args: ["install", "--target", "codex"],
        env: { home, cwd },
        skillSource: path.resolve("skills/effect"),
        isTty: false,
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("ok");
    expect(result.output).toContain("codex (global):");
    expect(result.output).toContain(path.join(home, ".codex", "skills", "effect"));
  });

  test("direct installs can target the current project", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "effect-skills-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "effect-skills-cwd-"));

    const result = await Effect.runPromise(
      runCli({
        args: ["install", "--target", "codex", "--scope", "project"],
        env: { home, cwd },
        skillSource: path.resolve("skills/effect"),
        isTty: false,
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("ok");
    expect(result.output).toContain("codex (project):");
    expect(result.output).toContain(path.join(cwd, ".codex", "skills", "effect"));
  });

  test("returns a top-level error when a selected install fails", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "effect-skills-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "effect-skills-cwd-"));

    const result = await Effect.runPromise(
      runCli({
        args: ["install", "--target", "codex"],
        env: { home, cwd },
        skillSource: path.join(cwd, "missing-skill"),
        isTty: false,
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe("error");
    expect(result.output).toContain("codex (global):");
    expect(result.output).toContain("NotFound");
  });
});

describe("README", () => {
  test("documents direct, interactive, force, and supported target usage", async () => {
    const readme = await readFile("README.md", "utf8");

    expect(readme).toContain("bunx @pekochan069/effect-skills install --target codex");
    expect(readme).toContain("--scope project");
    expect(readme).toContain("bunx @pekochan069/effect-skills install");
    expect(readme).toContain("--force");
    expect(readme).toContain("`cursor`");
  });
});
