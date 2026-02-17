/**
 * Testbolaget AB — Integration Test Suite
 *
 * Authenticates via TEST_USER_EMAIL + TEST_USER_PASSWORD secrets,
 * or SUPABASE_SERVICE_ROLE_KEY to auto-create a test user.
 */

// Try loading .env (works locally, silently skipped in CI)
try {
  await import("https://deno.land/std@0.224.0/dotenv/load.ts");
} catch { /* ignore */ }

import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { SCENARIOS } from "./testbolaget_scenarios.ts";
import {
  parseBookingEntries,
  isBalanced,
  mentionsFollowUp,
  isAskingQuestion,
} from "./test_helpers.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TEST_EMAIL = Deno.env.get("TEST_USER_EMAIL");
const TEST_PASSWORD = Deno.env.get("TEST_USER_PASSWORD");

let accessToken: string | null = null;

async function getAccessToken(): Promise<string> {
  if (accessToken) return accessToken;

  const anon = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

  // Strategy 1: Use test credentials directly
  if (TEST_EMAIL && TEST_PASSWORD) {
    const { data, error } = await anon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (data?.session) {
      accessToken = data.session.access_token;
      return accessToken;
    }
    throw new Error(`Sign in with TEST_USER creds failed: ${error?.message}`);
  }

  // Strategy 2: Auto-create test user via service role
  if (SERVICE_ROLE_KEY) {
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const autoEmail = "testbolaget@test.local";
    const autoPass = "Testbolaget2026!";

    // Try sign in first
    const { data: signIn } = await anon.auth.signInWithPassword({
      email: autoEmail, password: autoPass,
    });
    if (signIn?.session) {
      accessToken = signIn.session.access_token;
      return accessToken;
    }

    // Create
    await admin.auth.admin.createUser({
      email: autoEmail, password: autoPass, email_confirm: true,
    });

    const { data: newSignIn, error } = await anon.auth.signInWithPassword({
      email: autoEmail, password: autoPass,
    });
    if (error || !newSignIn?.session) throw new Error(`Auto sign in failed: ${error?.message}`);
    accessToken = newSignIn.session.access_token;
    return accessToken;
  }

  throw new Error("No auth strategy available");
}

async function callChatAssistant(message: string): Promise<{ response: string; success: boolean }> {
  const token = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ message, conversationHistory: [] }),
  });
  return await res.json();
}

// ── Guard ───────────────────────────────────────────
const canRun = !!(SUPABASE_URL && SUPABASE_ANON_KEY && (TEST_EMAIL || SERVICE_ROLE_KEY));

if (!canRun) {
  Deno.test("⚠️ Skipping — need TEST_USER_EMAIL+PASSWORD or SERVICE_ROLE_KEY", () => {
    console.warn("Available:", {
      url: !!SUPABASE_URL, anon: !!SUPABASE_ANON_KEY,
      testUser: !!TEST_EMAIL, serviceRole: !!SERVICE_ROLE_KEY,
    });
  });
} else {
  // ── Booking scenarios ───────────────────────────────
  for (const s of SCENARIOS.filter((s) => !s.expect_question && s.expected_total > 0)) {
    Deno.test({
      name: `[${s.id}] ${s.description} — balanced`,
      async fn() {
        const r = await callChatAssistant(s.message);
        assert(r.success, `Fail for "${s.message}"`);
        const entries = parseBookingEntries(r.response);
        if (entries.length > 0) assert(isBalanced(entries), `Unbalanced: ${JSON.stringify(entries)}`);
      },
      sanitizeResources: false, sanitizeOps: false,
    });
  }

  // ── Follow-ups ──────────────────────────────────────
  for (const s of SCENARIOS.filter((s) => s.expect_followup)) {
    Deno.test({
      name: `[${s.id}] ${s.description} — follow-up "${s.expect_followup}"`,
      async fn() {
        const r = await callChatAssistant(s.message);
        assert(r.success, "Fail");
        assert(mentionsFollowUp(r.response, s.expect_followup!), `Missing "${s.expect_followup}"`);
      },
      sanitizeResources: false, sanitizeOps: false,
    });
  }

  // ── Missing-field ───────────────────────────────────
  for (const s of SCENARIOS.filter((s) => s.expect_question)) {
    Deno.test({
      name: `[${s.id}] ${s.description} — asks question`,
      async fn() {
        const r = await callChatAssistant(s.message);
        assert(r.success, "Fail");
        assert(isAskingQuestion(r.response), `No question for "${s.message}"`);
      },
      sanitizeResources: false, sanitizeOps: false,
    });
  }
}
