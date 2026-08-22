import { CLI_COMMAND_NAME } from '#/constant/app';
import { registerMigrateCommand } from '#/migration/index';
import { Command, InvalidArgumentError, Option } from 'commander';

import type { CLIOptions } from './options';
import { registerAcpCommand } from './sub/acp';
import { registerDoctorCommand } from './sub/doctor';
import { registerExportCommand } from './sub/export';
import { registerLoginCommand } from './sub/login';
import { registerProviderCommand } from './sub/provider';
import { registerVisCommand } from './sub/vis';
import { registerWebCommand } from './sub/web';

export type MainCommandHandler = (opts: CLIOptions) => void;
export type MigrateCommandHandler = () => void;
export type PluginNodeRunnerHandler = (entry: string, args: readonly string[]) => void;
export type UpgradeCommandHandler = () => void | Promise<void>;
export type UpdateDownloadHandler = (version: string, manual: boolean) => void;

export function createProgram(
  version: string,
  onMain: MainCommandHandler,
  onMigrate: MigrateCommandHandler,
  onPluginNodeRunner: PluginNodeRunnerHandler = () => {},
  onUpgrade: UpgradeCommandHandler = () => {},
  onUpdateDownload: UpdateDownloadHandler = () => {},
): Command {
  const program = new Command(CLI_COMMAND_NAME)
    .description('下一代 Agent 的起点')
    .version(version, '-V, --version')
    .allowUnknownOption(false)
    .configureHelp({ helpWidth: 100 })
    .helpOption('-h, --help', '显示帮助')
    .usage('[options] [command]')
    .addHelpText('after', '\n文档：https://moonshotai.github.io/kimi-code/\n');

  program
    .addOption(
      new Option(
        '-S, --session [id]',
        '恢复会话。带 ID 时恢复指定会话，不带 ID 时交互式选择。',
      ).argParser((val: string | boolean) => (val === true ? '' : (val as string))),
    )
    .addOption(
      new Option('-r, --resume [id]')
        .hideHelp()
        .argParser((val: string | boolean) => (val === true ? '' : (val as string))),
    )
    .option('-c, --continue', '继续当前工作目录的上一个会话。', false)
    .addOption(new Option('-C').hideHelp().default(false))
    .option('-y, --yolo', '自动批准常规工具调用；agent 仍可能提问。', false)
    .option('--auto', '以自动权限模式启动：完全自主，agent 不会提问。', false)
    .addOption(
      new Option(
        '-m, --model <model>',
        '本次调用使用的 LLM 模型别名，默认使用 config.toml 中的 default_model。',
      ),
    )
    .addOption(
      new Option(
        '-p, --prompt <prompt>',
        '以非交互方式运行单个 prompt 并输出响应。',
      ),
    )
    .addOption(
      new Option(
        '--output-format <format>',
        'prompt 模式的输出格式，默认 text。',
      ).choices(['text', 'stream-json']),
    )
    .addOption(
      new Option(
        '--skills-dir <dir>',
        '从此目录加载 skills，而非自动发现的用户和项目目录。可重复指定。',
      )
        .argParser((value: string, previous: string[] | undefined) => [...(previous ?? []), value])
        .default([]),
    )
    .addOption(
      new Option(
        '--agent <name>',
        '新会话使用的 Agent 配置。自定义配置从 agent 目录发现或通过 --agent-file 加载。不能与 --session/--continue 同时使用。',
      )
        .argParser((value: string, previous: string | undefined) => {
          if (previous !== undefined) {
            throw new InvalidArgumentError('--agent 只能指定一次。');
          }
          return value;
        })
        .conflicts('agentFile'),
    )
    .addOption(
      new Option(
        '--agent-file <path>',
        '从 Markdown 文件加载 agent 定义并为新会话选用。不能与 --session/--continue 同时使用。',
      )
        .argParser((value: string, previous: string[] | undefined) => {
          if ((previous?.length ?? 0) > 0) {
            throw new InvalidArgumentError('--agent-file 只能指定一次。');
          }
          return [value];
        })
        .conflicts('agent')
        .default([]),
    )
    .addOption(
      new Option(
        '--add-dir <dir>',
        '为本会话添加额外的工作目录。可重复指定。',
      )
        .argParser((value: string, previous: string[] | undefined) => [...(previous ?? []), value])
        .default([]),
    )
    .addOption(new Option('--yes').hideHelp().default(false))
    .addOption(new Option('--auto-approve').hideHelp().default(false))
    .option('--plan', '以 plan 模式启动。', false);

  registerExportCommand(program);
  registerProviderCommand(program);
  registerAcpCommand(program);
  registerWebCommand(program);
  registerLoginCommand(program);
  registerDoctorCommand(program);
  registerVisCommand(program);
  registerMigrateCommand(program, onMigrate);
  program
    .command('upgrade')
    .alias('update')
    .description('将 lcode 升级到最新版本。')
    .action(async () => {
      await onUpgrade();
    });

  program
    .command('__plugin_run_node', { hidden: true })
    .argument('<entry>')
    .argument('[args...]')
    .allowUnknownOption(true)
    .action((entry: string, args: string[]) => {
      onPluginNodeRunner(entry, args);
    });

  // Self-spawned worker for native staged updates (detached background
  // download, or foreground from `kimi upgrade` — `--manual` marks the
  // latter's stage as user-requested). Hidden: not user-facing.
  program
    .command('__update_download', { hidden: true })
    .argument('<version>')
    .option('--manual', '该阶段响应用户主动发起的升级')
    .action((targetVersion: string, options: { manual?: boolean }) => {
      onUpdateDownload(targetVersion, options.manual === true);
    });

  program.argument('[args...]').action((args: string[]) => {
    if (args.length > 0) {
      program.error(`未知命令 '${args[0]}'。参见 '${CLI_COMMAND_NAME} --help'。`);
    }

    const raw = program.opts<Record<string, unknown>>();

    const rawSession = raw['session'] ?? raw['resume'];
    const sessionValue = rawSession === true ? '' : (rawSession as string | undefined);
    const yoloValue = raw['yolo'] === true || raw['yes'] === true || raw['autoApprove'] === true;
    const autoValue = raw['auto'] === true;

    const opts: CLIOptions = {
      session: sessionValue,
      continue: raw['continue'] === true || raw['C'] === true,
      yolo: yoloValue,
      auto: autoValue,
      plan: raw['plan'] as boolean,
      model: raw['model'] as string | undefined,
      outputFormat: raw['outputFormat'] as CLIOptions['outputFormat'],
      prompt: raw['prompt'] as string | undefined,
      skillsDirs: raw['skillsDir'] as string[],
      agent: raw['agent'] as string | undefined,
      agentFiles: raw['agentFile'] as string[],
      addDirs: raw['addDir'] as string[],
    };

    onMain(opts);
  });

  return program;
}
