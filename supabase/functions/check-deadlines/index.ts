import { serve } from "https://deno.land/std@0.214.0/http/server.ts";

serve(async () => {
  const targetEndpoint = Deno.env.get("CHECK_DEADLINES_ENDPOINT");
  const cronSecret = Deno.env.get("SUPABASE_CRON_SECRET");

  if (!targetEndpoint) {
    console.error("Missing CHECK_DEADLINES_ENDPOINT secret.");
    return new Response("Missing configuration", { status: 500 });
  }

  try {
    const response = await fetch(targetEndpoint, {
      method: "GET",
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
    });

    const text = await response.text();
    return new Response(text, { status: response.status });
  } catch (error) {
    console.error("Failed to reach check-deadlines endpoint:", error);
    return new Response("Failed to reach check-deadlines endpoint", {
      status: 500,
    });
  }
});

