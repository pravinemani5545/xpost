"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browser";
import { useTweets } from "@/hooks/use-tweets";
import { TweetComposer } from "@/components/tweet-composer";
import { DayGroup } from "@/components/day-group";
import { NextUpBanner } from "@/components/next-up-banner";
import { StatsSidebar } from "@/components/stats-sidebar";
import { AIWriterModal } from "@/components/ai-writer-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { groupByDay } from "@/lib/utils";
import { toast } from "sonner";

function DashboardContent() {
  const { tweets, loading, refetch } = useTweets();
  const [aiOpen, setAiOpen] = useState(false);
  const [composerContent, setComposerContent] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("x_connected") === "true") {
      toast.success("X account connected");
    }
    if (searchParams.get("error")) {
      toast.error("Failed to connect X account");
    }
  }, [searchParams]);

  const scheduledTweets = useMemo(
    () => tweets.filter((t) => t.status === "scheduled"),
    [tweets]
  );

  const nextUp = useMemo(() => {
    const now = new Date();
    return (
      scheduledTweets.find((t) => new Date(t.scheduled_at) > now) ?? null
    );
  }, [scheduledTweets]);

  const dayGroups = useMemo(
    () => groupByDay(scheduledTweets),
    [scheduledTweets]
  );

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="border-b border-border p-6 lg:border-b-0 lg:border-r lg:p-8">
        <StatsSidebar tweets={tweets} onSignOut={handleSignOut} />
      </div>

      <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-3xl">
        <TweetComposer
          key={composerContent}
          onTweetCreated={refetch}
          onOpenAI={() => setAiOpen(true)}
          initialContent={composerContent}
        />

        <Separator className="bg-border" />

        <NextUpBanner tweet={nextUp} />

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : dayGroups.size === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              No scheduled tweets yet. Write your first one above.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(dayGroups.entries()).map(([date, dayTweets]) => (
              <DayGroup
                key={date}
                date={date}
                tweets={dayTweets}
                onRefetch={refetch}
              />
            ))}
          </div>
        )}

        <AIWriterModal
          open={aiOpen}
          onOpenChange={setAiOpen}
          onSelect={(content) => {
            setComposerContent(content);
            setAiOpen(false);
          }}
        />
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Skeleton className="h-8 w-32" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
