/**
 * `kimi web rotate-token` — generate a new persistent server token.
 *
 * Rewrites `<KIMI_CODE_HOME>/server.token` (0600, atomic). The previous token
 * stops working immediately: a running server re-reads the file on its next
 * auth check, so rotation takes effect without a restart.
 */

import { getLiveServerInstance, rotateServerToken } from '@lcode-cli/kap-server';
import chalk from 'chalk';
import type { Command } from 'commander';

import { darkColors } from '#/tui/theme/colors';
import { getDataDir } from '#/utils/paths';

import { accessUrlLines, splitTokenFragment } from './access-urls';

export function registerRotateTokenCommand(server: Command): void {
  server
    .command('rotate-token')
    .description(
      '生成新的持久服务器 token；之前的 token 立即失效。',
    )
    .action(async () => {
      try {
        const token = await rotateServerToken(getDataDir());
        process.stdout.write(
          '之前的 token 现已失效。正在运行的服务器会自动使用新 token。\n',
        );

        // Token in the middle: indented and set off by blank lines (no color
        // highlight), so it is easy to spot without dominating the output.
        process.stdout.write(`\n  ${chalk.bold('新的服务器 token：')} ${token}\n\n`);

        // Re-print the access links with the new token so the user can
        // reconnect immediately. When a server is running its bind host/port
        // come from the instance registry; otherwise there is nothing to
        // connect to yet.
        const instance = await getLiveServerInstance();
        if (instance !== undefined) {
          for (const { label, url: href } of accessUrlLines(instance.host, instance.port, token)) {
            // De-emphasize the `#token=…` fragment so the host/port stands out.
            const [base, frag] = splitTokenFragment(href);
            const rendered =
              frag === ''
                ? chalk.hex(darkColors.accent)(base)
                : chalk.hex(darkColors.accent)(base) + chalk.hex(darkColors.textDim)(frag);
            process.stdout.write(`  ${chalk.dim(label)}${rendered}\n`);
          }
        }
      } catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
    });
}
