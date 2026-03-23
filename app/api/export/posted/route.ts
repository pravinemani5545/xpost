import { createServerClient } from "@/lib/supabase/server";
import { generatePostedMd } from "@/lib/export";

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
    .eq("status", "posted")
    .order("posted_at", { ascending: false });

  const md = generatePostedMd(tweets ?? []);

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": 'attachment; filename="posted.md"',
    },
  });
}
