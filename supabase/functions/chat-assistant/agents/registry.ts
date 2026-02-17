import { Agent, AgentContext, AgentResult, ConsultQuery, ConsultResult } from './types.ts';
import { IntentType } from '../../_shared/types.ts';
import { BookingAgent } from './booking-agent.ts';
import { ReportingAgent } from './reporting-agent.ts';
import { AdvisoryAgent } from './advisory-agent.ts';

const INTENT_TO_AGENT: Record<IntentType, string> = {
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

/**
 * Route an intent to the correct specialist agent.
 */
export function getAgentForIntent(intent: IntentType): Agent {
  const agentName = INTENT_TO_AGENT[intent] || 'advisory';
  return agents[agentName];
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
  const agent = getAgentForIntent(ctx.intent.intent);
  console.log(`[Router] ${ctx.intent.intent} → ${agent.name}`);

  // Inject consult capability
  ctx.consult = createConsultFn(ctx, 0);

  return agent.execute(ctx);
}
