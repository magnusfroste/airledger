import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data, error } = await supabase
      .from("system_settings")
      .select("key, value")
      .like("key", "seo_%");

    if (error) throw error;

    const settings: Record<string, string> = {};
    (data ?? []).forEach((row: { key: string; value: string }) => {
      settings[row.key.replace("seo_", "")] = row.value;
    });

    // Build JSON-LD if org data exists
    let jsonLd = null;
    if (settings.json_ld_org_name) {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": settings.json_ld_type || "SoftwareApplication",
        name: settings.json_ld_org_name,
        ...(settings.json_ld_org_url && { url: settings.json_ld_org_url }),
        ...(settings.json_ld_logo_url && {
          logo: settings.json_ld_logo_url,
          image: settings.json_ld_logo_url,
        }),
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
      };
    }

    const response = {
      title: settings.site_title || null,
      description: settings.site_description || null,
      og_title: settings.og_title || settings.site_title || null,
      og_description: settings.og_description || settings.site_description || null,
      og_image_url: settings.og_image_url || null,
      canonical_url: settings.canonical_url || null,
      robots_index: settings.robots_index !== "false",
      robots_follow: settings.robots_follow !== "false",
      json_ld: jsonLd,
      custom_head_tags: settings.custom_head_tags || null,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
