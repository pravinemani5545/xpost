import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { refreshTokenIfNeeded } from "@/lib/x/oauth";
import { postTweet } from "@/lib/x/post";

export async function POST(request: Request) {
  // Validate CRON_SECRET FIRST — before any processing
  const secret = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Query due tweets
  const { data: tweets, error } = await supabase
    .from("tweets")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(10);

  if (error || !tweets?.length) {
    return NextResponse.json({
      processed: 0,
      posted: 0,
      failed: 0,
      message: error ? "Query failed" : "No tweets due",
    });
  }

  // Process all tweets with Promise.allSettled
  const results = await Promise.allSettled(
    tweets.map(async (tweet) => {
      try {
        // Get fresh access token
        const accessToken = await refreshTokenIfNeeded(tweet.user_id);

        // Post to X
        const xTweetId = await postTweet(accessToken, tweet.content);

        // Update status to posted
        await supabase
          .from("tweets")
          .update({
            status: "posted",
            posted_at: new Date().toISOString(),
            x_tweet_id: xTweetId,
          })
          .eq("id", tweet.id);

        return { id: tweet.id, status: "posted" as const };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";

        // Update status to failed
        await supabase
          .from("tweets")
          .update({
            status: "failed",
            error_message: errorMessage,
          })
          .eq("id", tweet.id);

        return { id: tweet.id, status: "failed" as const };
      }
    })
  );

  const posted = results.filter(
    (r) => r.status === "fulfilled" && r.value.status === "posted"
  ).length;
  const failed = results.length - posted;

  return NextResponse.json({
    processed: results.length,
    posted,
    failed,
  });
}
