import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("writing_styles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ style: data?.style ?? "" });
}

export async function PUT(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { style } = await request.json();

  if (!style || typeof style !== "string" || style.length < 10) {
    return NextResponse.json(
      { error: "Writing style must be at least 10 characters" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("writing_styles").upsert(
    { user_id: user.id, style, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
