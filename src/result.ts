export type TargetName = "codex" | "claude" | "opencode" | "cursor";

export type InstallRequest = {
  readonly type: "install";
  readonly targets: readonly TargetName[];
  readonly force: boolean;
  readonly interactive: boolean;
};

export type ParseResult =
  | InstallRequest
  | {
      readonly type: "error";
      readonly message: string;
      readonly usage: string;
    };
