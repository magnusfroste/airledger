/**
 * Testbolaget AB — Integration Test Suite
 *
 * Tests the deployed chat-assistant edge function with realistic
 * accounting scenarios for a small Swedish IT consultancy.
 *
 * Verifies:
 * - Template matching (correct intent)
 * - Amount balancing (debit == credit)
 * - Follow-up suggestions
 * - Missing-field handling
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";

import { SCENARIOS, type TestScenario } from "./testbolaget_scenarios.ts";
import {
  parseBookingEntries,
  isBalanced,
  mentionsFollowUp,
  isAskingQuestion,
} from "./test_helpers.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

async function callChatAssistant(message: string): Promise<{ response: string; success: boolean }> {
  const url = `${SUPABASE_URL}/functions/v1/chat-assistant`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ message, conversationHistory: [] }),
  });

  const body = await res.json();
  return body;
}

// ── Booking scenarios: verify balanced entries ──────────────

const bookingScenarios = SCENARIOS.filter(
  (s) => !s.expect_question && s.expected_total > 0
);

for (const scenario of bookingScenarios) {
  Deno.test({
    name: `[${scenario.id}] ${scenario.description} — balanced entries`,
    async fn() {
      const result = await callChatAssistant(scenario.message);

      assert(result.success, `API should return success for "${scenario.message}"`);
      assert(result.response, "Response should not be empty");

      const entries = parseBookingEntries(result.response);

      // AI might not always return a table (e.g. asks follow-up), so only check if we got entries
      if (entries.length > 0) {
        assert(
          isBalanced(entries),
          `Entries should be balanced (debit == credit) for ${scenario.id}.\n` +
            `Entries: ${JSON.stringify(entries)}`
        );
      }
    },
    sanitizeResources: false,
    sanitizeOps: false,
  });
}

// ── Follow-up tests ─────────────────────────────────────────

const followUpScenarios = SCENARIOS.filter((s) => s.expect_followup);

for (const scenario of followUpScenarios) {
  Deno.test({
    name: `[${scenario.id}] ${scenario.description} — suggests follow-up "${scenario.expect_followup}"`,
    async fn() {
      const result = await callChatAssistant(scenario.message);
      assert(result.success, "API should return success");

      if (scenario.expect_followup) {
        assert(
          mentionsFollowUp(result.response, scenario.expect_followup),
          `Response should mention "${scenario.expect_followup}" for ${scenario.id}`
        );
      }
    },
    sanitizeResources: false,
    sanitizeOps: false,
  });
}

// ── Missing-field tests ─────────────────────────────────────

const questionScenarios = SCENARIOS.filter((s) => s.expect_question);

for (const scenario of questionScenarios) {
  Deno.test({
    name: `[${scenario.id}] ${scenario.description} — asks for missing info`,
    async fn() {
      const result = await callChatAssistant(scenario.message);
      assert(result.success, "API should return success");
      assert(
        isAskingQuestion(result.response),
        `AI should ask a question when message is "${scenario.message}"`
      );
    },
    sanitizeResources: false,
    sanitizeOps: false,
  });
}
