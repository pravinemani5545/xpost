"use client";

import { useMemo } from "react";
import { useTweets } from "@/hooks/use-tweets";
import { TweetCard } from "@/components/tweet-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PostedPage() {
  const { tweets, loading, refetch } = useTweets();

  const postedTweets = useMemo(
    () =>
      tweets
        .filter((t) => t.status === "posted")
        .sort(
          (a, b) =>
            new Date(b.posted_at ?? b.scheduled_at).getTime() -
            new Date(a.posted_at ?? a.scheduled_at).getTime()
        ),
    [tweets]
  );

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/dashboard" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl">Posted Archive</h1>
          <p className="text-xs text-muted-foreground font-mono">
            {postedTweets.length} tweets posted
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : postedTweets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">
            No posted tweets yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {postedTweets.map((tweet) => (
            <TweetCard key={tweet.id} tweet={tweet} onRefetch={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
