/**
 * Service name → DI token registry for the in-process dispatcher. Only leaf
 * modules are imported (tokens + types) — never the engine root barrel, so
 * hosting klient in-process does not force the full registration side effects
 * beyond what the host already bootstrapped.
 */

import type { ServiceIdentifier } from '@lcode-cli/agent-core-v2/_base/di/instantiation';
import { ISessionIndex } from '@lcode-cli/agent-core-v2/app/sessionIndex/sessionIndex';
import { IWorkspaceService } from '@lcode-cli/agent-core-v2/app/workspace/workspace';
import { IConfigService } from '@lcode-cli/agent-core-v2/app/config/config';
import { IModelService } from '@lcode-cli/agent-core-v2/kosong/model/model';
import { IModelCatalog } from '@lcode-cli/agent-core-v2/kosong/model/catalog';
import { IProviderDiscoveryService } from '@lcode-cli/agent-core-v2/app/kosongConfig/discovery';
import { IProviderService } from '@lcode-cli/agent-core-v2/kosong/provider/provider';
import {
  IAuthSummaryService,
  IOAuthService,
} from '@lcode-cli/agent-core-v2/app/auth/auth';
import { IFlagService } from '@lcode-cli/agent-core-v2/app/flag/flag';
import { IPluginService } from '@lcode-cli/agent-core-v2/app/plugin/plugin';
import { ICapabilityService } from '@lcode-cli/agent-core-v2/app/capability/capability';
import { IBootstrapService } from '@lcode-cli/agent-core-v2/app/bootstrap/bootstrap';
import { IEventService } from '@lcode-cli/agent-core-v2/app/event/event';
import { IFileService } from '@lcode-cli/agent-core-v2/app/file/fileService';
import { IHostFolderBrowser } from '@lcode-cli/agent-core-v2/app/hostFolderBrowser/hostFolderBrowser';
import { IWorkspaceInstanceManager } from '@lcode-cli/agent-core-v2/workspace/workspaceInstance/workspaceInstanceManager';
import { ISessionManager } from '@lcode-cli/agent-core-v2/app/sessionManager/sessionManager';
import { ISessionMetadata } from '@lcode-cli/agent-core-v2/session/sessionMetadata/sessionMetadata';
import { ISessionInteractionService } from '@lcode-cli/agent-core-v2/session/interaction/interaction';
import { ISessionApprovalService } from '@lcode-cli/agent-core-v2/session/approval/approval';
import { ISessionQuestionService } from '@lcode-cli/agent-core-v2/session/question/question';
import { ISessionSkillCatalog } from '@lcode-cli/agent-core-v2/session/sessionSkillCatalog/skillCatalog';
import { ISessionTitleService } from '@lcode-cli/agent-core-v2/session/sessionTitle/sessionTitle';
import { IAgentPromptService } from '@lcode-cli/agent-core-v2/agent/prompt/prompt';
import { IAgentSkillService } from '@lcode-cli/agent-core-v2/agent/skill/skill';
import { IAgentLoopService } from '@lcode-cli/agent-core-v2/agent/loop/loop';
import { IAgentPermissionModeService } from '@lcode-cli/agent-core-v2/agent/permissionMode/permissionMode';
import { IAgentCommandService } from '@lcode-cli/agent-core-v2/agent/command/agentCommand';
import { IAgentRuntimeBindingService } from '@lcode-cli/agent-core-v2/agent/runtimeBinding/runtimeBinding';
import { IAgentContextMemoryService } from '@lcode-cli/agent-core-v2/agent/contextMemory/contextMemory';
import { ISessionTokenCountingService } from '@lcode-cli/agent-core-v2/session/tokenCounting/sessionTokenCounting';
import { IAgentActivityView } from '@lcode-cli/agent-core-v2/agent/activityView/activityView';
import { IAgentPlanService } from '@lcode-cli/agent-core-v2/features/plan/plan';
import { IAgentProfileService } from '@lcode-cli/agent-core-v2/agent/profile/profile';
import { IAgentShellCommandService } from '@lcode-cli/agent-core-v2/agent/shellCommand/shellCommand';
import { IAgentTaskService } from '@lcode-cli/agent-core-v2/agent/task/task';
import { ISessionUsageService } from '@lcode-cli/agent-core-v2/session/usage/sessionUsage';
import { IAgentMcpService } from '@lcode-cli/agent-core-v2/agent/mcp/mcp';
import { IAgentFullCompactionService } from '@lcode-cli/agent-core-v2/agent/fullCompaction/fullCompaction';

/** Wire service name (decorator id string) → token. */
export const serviceTokens: Readonly<Record<string, ServiceIdentifier<unknown>>> = {
  sessionIndex: ISessionIndex,
  workspaceService: IWorkspaceService,
  configService: IConfigService,
  modelService: IModelService,
  modelResolver: IModelCatalog,
  providerDiscovery: IProviderDiscoveryService,
  providerService: IProviderService,
  oauthService: IOAuthService,
  authSummaryService: IAuthSummaryService,
  flagService: IFlagService,
  pluginService: IPluginService,
  capabilityService: ICapabilityService,
  hostFolderBrowser: IHostFolderBrowser,
  bootstrapService: IBootstrapService,
  fileService: IFileService,
  workspaceInstanceManager: IWorkspaceInstanceManager,
  sessionManager: ISessionManager,
  sessionMetadata: ISessionMetadata,
  sessionInteractionService: ISessionInteractionService,
  sessionApprovalService: ISessionApprovalService,
  sessionQuestionService: ISessionQuestionService,
  sessionSkillCatalog: ISessionSkillCatalog,
  sessionTitleService: ISessionTitleService,
  agentPromptService: IAgentPromptService,
  agentSkillService: IAgentSkillService,
  agentLoopService: IAgentLoopService,
  agentPermissionModeService: IAgentPermissionModeService,
  agentCommandService: IAgentCommandService,
  agentRuntimeBindingService: IAgentRuntimeBindingService,
  agentContextMemoryService: IAgentContextMemoryService,
  agentTokenCountingService: ISessionTokenCountingService,
  agentActivityView: IAgentActivityView,
  agentShellCommandService: IAgentShellCommandService,
  agentProfileService: IAgentProfileService,
  agentUsageService: ISessionUsageService,
  agentPlanService: IAgentPlanService,
  agentTaskService: IAgentTaskService,
  agentMcpService: IAgentMcpService,
  agentFullCompactionService: IAgentFullCompactionService,
};

export { IEventService };
