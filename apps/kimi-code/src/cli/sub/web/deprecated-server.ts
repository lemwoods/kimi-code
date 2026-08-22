/**
 * Deprecated `kimi server` shim.
 *
 * The `kimi server` command tree was replaced by `kimi web` (a foreground
 * server opened in the browser). Any `kimi server …` invocation — bare or
 * with any legacy subcommand/flags — lands here, prints the deprecation
 * notice, and exits 1. The shim itself is scheduled for removal in the next
 * major version of Kimi Code.
 *
 * One subcommand stays functional: `kimi server kill`, the cleanup path for
 * background servers started by pre-0.28.0 builds (recorded in the legacy
 * single-instance lock, which the instance registry never sees).
 */

import type { Command } from 'commander';

import { registerLegacyKillCommand } from './legacy-kill';

export const DEPRECATED_SERVER_NOTICE =
  '`kimi server` 已弃用，不再可用。\n' +
  '请改用 `kimi web` —— 它在前台运行本地服务器并打开 web UI（`--no-open` 可跳过）。\n' +
  '要停止 0.28.0 之前版本启动的服务器，请使用 `kimi server kill`。\n' +
  '此提示将在 lcode 的下一个主版本中移除。\n';

export function registerDeprecatedServerCommand(program: Command): void {
  const server = program
    .command('server')
    .description('已弃用 —— 请改用 `kimi web`。')
    // Swallow every legacy subcommand/flag (`run`, `kill`, `--port`, …) so
    // they all land in the same notice instead of a commander parse error.
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(() => {
      process.stderr.write(DEPRECATED_SERVER_NOTICE);
      process.exit(1);
    });
  registerLegacyKillCommand(server);
}
