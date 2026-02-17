import { Agent, AgentContext, AgentResult } from './types.ts';
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
 * Execute the appropriate agent for a given context.
 */
export async function routeToAgent(ctx: AgentContext): Promise<AgentResult> {
  const agent = getAgentForIntent(ctx.intent.intent);
  console.log(`[Router] ${ctx.intent.intent} → ${agent.name}`);
  return agent.execute(ctx);
}
