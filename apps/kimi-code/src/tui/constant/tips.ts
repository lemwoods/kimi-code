export interface ToolbarTip {
  readonly text: string;
  /**
   * Long/important tips render on their own. They never pair with a
   * neighbour and never appear as the second half of someone else's pair.
   */
  readonly solo?: boolean;
  /**
   * Rotation weight: a higher value makes the tip recur more often. Defaults
   * to 1. Used to give newer/important features more airtime.
   */
  readonly priority?: number;
}

/**
 * Subset of toolbar tips shown behind the composing spinner.
 */
export const WORKING_TIPS: readonly ToolbarTip[] = [
  { text: 'ctrl-s 添加指导，无需等待当前回合结束', priority: 2, solo: true },
  { text: '/tasks 查看后台任务的进度和状态', priority: 2 },
  { text: '/init：生成 AGENTS.md', priority: 2 },
  { text: '试试 /dance 彩蛋' },
  {
    text: '/plugins：管理插件 —— 试试 "Kimi Datasource" 获取可靠的金融、经济、学术数据',
    solo: true,
    priority: 3,
  },
  { text: '让 Kimi 安排任务，例如 "5 点提醒我"', solo: true, priority: 3 },
  { text: '/sessions 浏览并恢复之前的会话', solo: true },
  { text: '/goal 用于有明确终点的多步骤工作', priority: 2, solo: true  },
  { text: '/goal next 在当前目标继续运行时排队后续工作', solo: true },
  { text: '/web：使用 Web UI 获得更好的体验', solo: true },
  { text: '@：提及文件', priority: 2 },
  { text: '! 运行 shell 命令', priority: 2 },
];

export const ALL_TIPS: readonly ToolbarTip[] = [
  ...WORKING_TIPS,
  { text: 'shift+enter：换行' },
  { text: 'ctrl+c：取消' },
  { text: '/theme 切换终端 UI 主题' },
  { text: '/auto 让 Kimi 处理审批并无人值守地继续' },
  { text: '/yolo 跳过大部分审批用于可信的批量工作，仅在信任的仓库使用' },
  { text: '/help：显示命令' },
  { text: '/compact 在上下文变长时压缩', priority: 2 },
  { text: 'ctrl-o 隐藏或显示工具输出，在简洁聊天视图和完整执行详情间切换', priority: 2 },
  { text: 'shift-tab 进入 Plan 模式，在 Kimi 修改文件前审查方案。', priority: 2 },
  { text: '/model：切换模型', priority: 2 },
];
