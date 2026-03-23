export async function GET() {
  return Response.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
    supabase_anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "MISSING",
    supabase_service: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
    gemini: process.env.GEMINI_API_KEY ? "set" : "MISSING",
    x_client: process.env.X_CLIENT_ID ? "set" : "MISSING",
    x_secret: process.env.X_CLIENT_SECRET ? "set" : "MISSING",
    cron: process.env.CRON_SECRET ? "set" : "MISSING",
    app_url: process.env.NEXT_PUBLIC_APP_URL ? "set" : "MISSING",
  });
}
