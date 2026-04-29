import chalk from "chalk";
import { Effect, FileSystem, Option, Path, Ref } from "effect";
import { Command, Flag } from "effect/unstable/cli";

import { installTargets, type InstallResult, type InstallSelection } from "./install";
import { selectTargets } from "./interactive";
import type { TargetName } from "./result";
import type { InstallEnvironment, InstallScope } from "./targets";

const targetNames = ["codex", "claude", "opencode", "cursor"] as const;
const scopeNames = ["global", "project"] as const;

const targetFlag = Flag.choice("target", targetNames).pipe(
  Flag.optional,
  Flag.withDescription("Agent to install Effect guidance into"),
);
const forceFlag = Flag.boolean("force").pipe(
  Flag.withDescription("Replace an existing Effect guidance install"),
);
const scopeFlag = Flag.choice("scope", scopeNames).pipe(
  Flag.optional,
  Flag.withDescription("Install globally or into the current project"),
);

const rootCommandForHelp = Command.make("effect-skills").pipe(
  Command.withDescription("Install Effect guidance for coding agents"),
);

export type CliOptions = {
  readonly args: readonly string[];
  readonly env: InstallEnvironment;
  readonly skillSource: string;
  readonly isTty: boolean;
  readonly selectTargets?: () => Promise<readonly InstallSelection[]> | readonly InstallSelection[];
};

export type CliResult =
  | {
      readonly status: "ok";
      readonly results: readonly InstallResult[];
      readonly output: string;
    }
  | {
      readonly status: "error";
      readonly message: string;
      readonly output: string;
    };

export function runCli(options: CliOptions): Effect.Effect<CliResult, never, Command.Environment> {
  return Effect.gen(function* () {
    if (isHelpRequest(options.args)) {
      return {
        status: "ok",
        results: [],
        output: renderCommandHelp(),
      };
    }

    const preflightError = getPreflightCommandError(options.args);
    if (preflightError !== undefined) {
      return preflightError;
    }

    const resultRef = yield* Ref.make<CliResult | undefined>(undefined);
    const command = makeRootCommand(options, resultRef);
    const run = Command.runWith(command, { version: "0.0.0" });

    yield* run(options.args).pipe(Effect.catch(() => Effect.void));

    const result = yield* Ref.get(resultRef);
    if (result !== undefined) {
      return result;
    }

    return {
      status: "error",
      message: "Invalid command.",
      output: [
        chalk.red(`Invalid command: ${options.args.join(" ")}`),
        `Supported targets: ${targetNames.join(", ")}`,
        renderCommandHelp(),
      ].join("\n"),
    };
  });
}

function makeRootCommand(options: CliOptions, resultRef: Ref.Ref<CliResult | undefined>) {
  const installCommand = Command.make(
    "install",
    {
      target: targetFlag,
      force: forceFlag,
      scope: scopeFlag,
    },
    (config) =>
      executeInstallCommand(options, {
        target: Option.getOrUndefined(config.target),
        force: config.force,
        scope: Option.getOrUndefined(config.scope) ?? "global",
      }).pipe(Effect.flatMap((result) => Ref.set(resultRef, result))),
  ).pipe(Command.withDescription("Install Effect guidance into a supported coding agent"));

  return Command.make("effect-skills").pipe(
    Command.withDescription("Install Effect guidance for coding agents"),
    Command.withSubcommands([installCommand]),
  );
}

function executeInstallCommand(
  options: CliOptions,
  request: {
    readonly target: TargetName | undefined;
    readonly force: boolean;
    readonly scope: InstallScope;
  },
): Effect.Effect<CliResult, never, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    if (request.target !== undefined) {
      const results = yield* installTargets({
        targets: [{ target: request.target, scope: request.scope }],
        force: request.force,
        env: options.env,
        skillSource: options.skillSource,
      });

      return formatCliResult(results);
    }

    if (!options.isTty) {
      const message = "No target provided. Use --target in non-interactive environments.";
      return {
        status: "error",
        message,
        output: chalk.red(message),
      };
    }

    const selector = options.selectTargets ?? selectTargets;
    const selectedTargets = yield* Effect.tryPromise(() => Promise.resolve(selector())).pipe(
      Effect.catch(() =>
        Effect.succeed<readonly InstallSelection[] | "cancelled">("cancelled" as const),
      ),
    );

    if (selectedTargets === "cancelled") {
      const message = "Interactive install cancelled.";
      return {
        status: "error",
        message,
        output: chalk.red(message),
      };
    }

    if (selectedTargets.length === 0) {
      return {
        status: "ok",
        results: [],
        output: chalk.yellow("No targets selected. Nothing installed."),
      };
    }

    const results = yield* installTargets({
      targets: selectedTargets,
      force: request.force,
      env: options.env,
      skillSource: options.skillSource,
    });

    return formatCliResult(results);
  });
}

function formatCliResult(results: readonly InstallResult[]): CliResult {
  const output = formatInstallResults(results);
  const failed = results.find((result) => result.status === "failed");

  if (failed !== undefined) {
    return {
      status: "error",
      message: "One or more installs failed.",
      output,
    };
  }

  return {
    status: "ok",
    results,
    output,
  };
}

export function formatInstallResults(results: readonly InstallResult[]): string {
  if (results.length === 0) {
    return chalk.yellow("No targets selected. Nothing installed.");
  }

  return results
    .map((result) => {
      const prefix =
        result.status === "installed"
          ? chalk.green("installed")
          : result.status === "skipped"
            ? chalk.yellow("skipped")
            : chalk.red("failed");

      return `${prefix} ${result.target} (${result.scope}): ${result.destination} ${result.message}`;
    })
    .join("\n");
}

function isHelpRequest(args: readonly string[]): boolean {
  return args.length === 0 || args.includes("--help") || args.includes("-h");
}

function getPreflightCommandError(args: readonly string[]): CliResult | undefined {
  if (args[0] !== "install") {
    return {
      status: "error",
      message: "Invalid command.",
      output: [chalk.red(`Invalid command: ${args.join(" ")}`), renderCommandHelp()].join("\n"),
    };
  }

  const targetFlagIndex = args.indexOf("--target");
  if (targetFlagIndex !== -1) {
    const target = args[targetFlagIndex + 1];
    if (target === undefined || target.startsWith("-")) {
      return {
        status: "error",
        message: "--target requires a value",
        output: [chalk.red("--target requires a value"), renderCommandHelp()].join("\n"),
      };
    }

    if (!targetNames.includes(target as TargetName)) {
      return {
        status: "error",
        message: `Unsupported target: ${target}`,
        output: [
          chalk.red(`Unsupported target: ${target}`),
          `Supported targets: ${targetNames.join(", ")}`,
          renderCommandHelp(),
        ].join("\n"),
      };
    }
  }

  const scopeFlagIndex = args.indexOf("--scope");
  if (scopeFlagIndex === -1) {
    return undefined;
  }

  const scope = args[scopeFlagIndex + 1];
  if (scope === undefined || scope.startsWith("-")) {
    return {
      status: "error",
      message: "--scope requires a value",
      output: [chalk.red("--scope requires a value"), renderCommandHelp()].join("\n"),
    };
  }

  if (!scopeNames.includes(scope as InstallScope)) {
    return {
      status: "error",
      message: `Unsupported scope: ${scope}`,
      output: [
        chalk.red(`Unsupported scope: ${scope}`),
        `Supported scopes: ${scopeNames.join(", ")}`,
        renderCommandHelp(),
      ].join("\n"),
    };
  }

  return undefined;
}

function renderCommandHelp(): string {
  const help = (
    rootCommandForHelp.pipe(Command.withSubcommands([installCommandForHelp])) as unknown as {
      readonly buildHelpDoc: (path: readonly string[]) => {
        readonly description: string;
        readonly usage: string;
        readonly subcommands?: readonly {
          readonly commands: readonly {
            readonly name: string;
            readonly description: string;
            readonly shortDescription?: string | undefined;
          }[];
        }[];
      };
    }
  ).buildHelpDoc(["effect-skills"]);

  const lines = [
    help.description,
    "",
    "Usage:",
    `  ${help.usage}`,
    "",
    "Subcommands:",
    ...(help.subcommands ?? []).flatMap((group) =>
      group.commands.map((command) => {
        const description = command.shortDescription ?? command.description;
        return `  ${command.name}${description ? `  ${description}` : ""}`;
      }),
    ),
  ];

  return lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}

const installCommandForHelp = Command.make("install", {
  target: targetFlag,
  force: forceFlag,
  scope: scopeFlag,
}).pipe(Command.withDescription("Install Effect guidance into a supported coding agent"));
