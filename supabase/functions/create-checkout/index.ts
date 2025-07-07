import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { tier } = await req.json();
    if (!tier || !['premium', 'professional'].includes(tier)) {
      throw new Error("Invalid subscription tier");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    console.log('Creating checkout session for tier:', tier);
    console.log('User email:', user.email);
    
    // Check if we're in test mode by trying to detect test key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const isTestMode = stripeKey.startsWith('sk_test_');
    console.log('Stripe test mode detected:', isTestMode);
    
    // For test mode, create products on-the-fly instead of using predefined price IDs
    let priceId: string;
    
    if (isTestMode) {
      console.log('Creating test product and price');
      // Create product and price dynamically for test mode
      const product = await stripe.products.create({
        name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
        description: `${tier} subscription plan`,
      });
      
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier === 'premium' ? 9900 : 19900, // 99 or 199 SEK
        currency: 'sek',
        recurring: {
          interval: 'month',
        },
      });
      
      priceId = price.id;
      console.log('Created test price:', priceId);
    } else {
      // Use predefined price IDs for live mode
      const priceIds = {
        premium: "price_1RiNIzHTXSpIB5InKK9y0IFw", // 99 SEK
        professional: "price_1RiNJFHTXSpIB5InJZrgxuRw" // 199 SEK
      };
      
      priceId = priceIds[tier as keyof typeof priceIds];
      if (!priceId) {
        throw new Error(`Invalid tier: ${tier}`);
      }
      console.log('Using live price:', priceId);
    }

    console.log('Creating Stripe checkout session');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/`,
      cancel_url: `${req.headers.get("origin")}/`,
    });
    
    console.log('Checkout session created successfully:', session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error in create-checkout:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});