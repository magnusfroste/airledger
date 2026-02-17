import { Agent, AgentContext, AgentResult, ConsultQuery, ConsultResult } from './types.ts';
import { IntentType } from '../../_shared/types.ts';
import { BookingAgent } from './booking-agent.ts';
import { ReportingAgent } from './reporting-agent.ts';
import { AdvisoryAgent } from './advisory-agent.ts';
import { DynamicAgent, AgentConfig } from './dynamic-agent.ts';

const INTENT_TO_AGENT: Record<string, string> = {
  book_expense: 'booking',
  book_sale: 'booking',
  book_payment: 'booking',
  confirm_booking: 'booking',
  opening_balance: 'booking',
  vat_report: 'reporting',
  account_balance: 'reporting',
  period_reconciliation: 'reporting',
  year_end: 'reporting',
  view_report: 'reporting',
  ask_question: 'advisory',
  analyze_image: 'advisory',
  unknown: 'advisory',
};

const agents: Record<string, Agent> = {
  booking: new BookingAgent(),
  reporting: new ReportingAgent(),
  advisory: new AdvisoryAgent(),
};

let dynamicLoaded = false;

/**
 * Load dynamic agents from agent_config table.
 * Higher priority configs override hardcoded intent mappings.
 */
export async function loadDynamicAgents(supabase: any): Promise<void> {
  if (dynamicLoaded) return;
  try {
    const { data: configs, error } = await supabase
      .from('agent_config')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error || !configs?.length) {
      dynamicLoaded = true;
      return;
    }

    for (const config of configs as AgentConfig[]) {
      // Register dynamic agent
      agents[config.agent_name] = new DynamicAgent(config);
      // Map triggers to this agent (higher priority overrides)
      for (const trigger of config.triggers) {
        INTENT_TO_AGENT[trigger] = config.agent_name;
      }
      console.log(`[Registry] Loaded dynamic agent: ${config.agent_name} (triggers: ${config.triggers.join(', ')})`);
    }
    dynamicLoaded = true;
  } catch (err) {
    console.error('[Registry] Failed to load dynamic agents:', err);
    dynamicLoaded = true;
  }
}

/**
 * Route an intent to the correct specialist agent.
 */
export function getAgentForIntent(intent: string): Agent {
  const agentName = INTENT_TO_AGENT[intent] || 'advisory';
  return agents[agentName] || agents['advisory'];
}

/**
 * Create a consult function that allows agents to query each other.
 * Max depth of 2 to prevent infinite recursion.
 */
function createConsultFn(
  parentCtx: AgentContext,
  depth: number = 0
): (agentName: string, query: ConsultQuery) => Promise<ConsultResult> {
  return async (agentName: string, query: ConsultQuery): Promise<ConsultResult> => {
    if (depth >= 2) {
      return { answer: 'Max konsultationsdjup nått.', confidence: 0, source_agent: agentName };
    }
    const agent = agents[agentName];
    if (!agent) {
      return { answer: `Agent "${agentName}" finns inte.`, confidence: 0, source_agent: agentName };
    }
    console.log(`[Consult] ${parentCtx.intent.intent} → ${agentName}: "${query.question}"`);
    const miniCtx: AgentContext = {
      ...parentCtx,
      message: query.question,
      conversationHistory: [],
      intent: { ...parentCtx.intent, intent: 'ask_question' },
      consult: createConsultFn(parentCtx, depth + 1),
    };
    const result = await agent.execute(miniCtx);
    return { answer: result.response, confidence: 1, source_agent: agentName };
  };
}

/**
 * Execute the appropriate agent for a given context, with consult support.
 */
export async function routeToAgent(ctx: AgentContext): Promise<AgentResult> {
  // Load dynamic agents on first call
  await loadDynamicAgents(ctx.supabase);

  const agent = getAgentForIntent(ctx.intent.intent);
  console.log(`[Router] ${ctx.intent.intent} → ${agent.name}`);

  // Inject consult capability
  ctx.consult = createConsultFn(ctx, 0);

  return agent.execute(ctx);
}
