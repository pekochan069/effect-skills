import { describe, expect, test } from "vitest";

import { toInstallSelections } from "../interactive";

describe("interactive install selection", () => {
  test("applies one selected scope to native agent selections", () => {
    expect(toInstallSelections(["codex", "claude"], "project")).toEqual([
      { target: "codex", scope: "project" },
      { target: "claude", scope: "project" },
    ]);
  });

  test("keeps Cursor project-scoped when native agents use global scope", () => {
    expect(toInstallSelections(["codex", "cursor"], "global")).toEqual([
      { target: "codex", scope: "global" },
      { target: "cursor", scope: "project" },
    ]);
  });
});
