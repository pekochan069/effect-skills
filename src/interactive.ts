import checkbox from "@inquirer/checkbox";

import type { InstallSelection } from "./install";
import type { TargetName } from "./result";
import { supportedTargets, type InstallScope } from "./targets";

export async function selectTargets(): Promise<readonly InstallSelection[]> {
  const selectedTargets = await checkbox<TargetName>(
    {
      message: "Select agents to install Effect skills into",
      choices: supportedTargets.map((target) => ({
        name: target.label,
        value: target.name,
        description: target.description,
      })),
      required: false,
    },
    {
      input: process.stdin,
      output: process.stdout,
    },
  );

  const nativeTargets = selectedTargets.filter((targetName) => {
    const target = supportedTargets.find((item) => item.name === targetName);
    return target?.kind === "native-skill";
  });

  if (nativeTargets.length === 0) {
    return toInstallSelections(selectedTargets, "project");
  }

  const [scope] = await checkbox<InstallScope>(
    {
      message: "Select install scope for native skills",
      choices: [
        {
          name: "Global",
          value: "global",
          description: "Install into user-level agent skill directories.",
          checked: true,
        },
        {
          name: "Project",
          value: "project",
          description: "Install into the current project's agent skill directories.",
        },
      ],
      required: true,
      validate: (selected) => selected.length === 1 || "Select exactly one scope.",
      shortcuts: {
        all: null,
        invert: null,
      },
    },
    {
      input: process.stdin,
      output: process.stdout,
    },
  );

  const selectedScope = scope ?? "global";

  return toInstallSelections(selectedTargets, selectedScope);
}

export function toInstallSelections(
  selectedTargets: readonly TargetName[],
  scope: InstallScope,
): readonly InstallSelection[] {
  return selectedTargets.map((target) => ({
    target,
    scope: target === "cursor" ? "project" : scope,
  }));
}
