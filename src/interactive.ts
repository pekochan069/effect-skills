import checkbox from "@inquirer/checkbox";

import type { TargetName } from "./result";
import { supportedTargets } from "./targets";

export function selectTargets(): Promise<readonly TargetName[]> {
  return checkbox<TargetName>(
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
}
