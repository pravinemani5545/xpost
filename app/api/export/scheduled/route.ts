import { createServerClient } from "@/lib/supabase/server";
import { generateScheduledMd } from "@/lib/export";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: tweets } = await supabase
    .from("tweets")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true });

  const md = generateScheduledMd(tweets ?? []);

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": 'attachment; filename="scheduled.md"',
    },
  });
}
