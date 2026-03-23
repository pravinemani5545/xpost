import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { UpdateTweetSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = UpdateTweetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your input and try again", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: tweet, error } = await supabase
    .from("tweets")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "scheduled")
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update tweet" },
      { status: 500 }
    );
  }

  if (!tweet) {
    return NextResponse.json({ error: "Tweet not found" }, { status: 404 });
  }

  return NextResponse.json(tweet);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("tweets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "scheduled");

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete tweet" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
