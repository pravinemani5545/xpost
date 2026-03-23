"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { Check, Copy, Pencil, Trash2 } from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { Tweet } from "@/types";
import { useState } from "react";

interface TweetCardProps {
  tweet: Tweet;
  onRefetch: () => void;
}

export function TweetCard({ tweet, onRefetch }: TweetCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleDelete() {
    const res = await fetch(`/api/tweets/${tweet.id}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      toast.success("Tweet deleted");
      onRefetch();
    } else {
      toast.error("Failed to delete tweet");
    }
  }

  async function handleMarkPosted() {
    const res = await fetch(`/api/tweets/${tweet.id}/mark-posted`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      toast.success("Marked as posted");
      onRefetch();
    } else {
      toast.error("Failed to mark as posted");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(tweet.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group flex items-start gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:border-border/80">
      <div className="flex-1 space-y-1.5">
        <p className="text-sm leading-relaxed">{tweet.content}</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            {formatTime(tweet.scheduled_at)}
          </span>
          <StatusBadge status={tweet.status} />
          {tweet.category && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {tweet.category}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
          {copied ? (
            <Check className="h-3 w-3 text-primary" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
        {tweet.status === "scheduled" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleMarkPosted}
              title="Mark as posted"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
