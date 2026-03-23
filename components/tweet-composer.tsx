"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Sparkles } from "lucide-react";
import type { TimeSlot } from "@/types";

interface TweetComposerProps {
  onTweetCreated: () => void;
  onOpenAI: () => void;
  initialContent?: string;
}

export function TweetComposer({
  onTweetCreated,
  onOpenAI,
  initialContent = "",
}: TweetComposerProps) {
  const [content, setContent] = useState(initialContent);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("9AM");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const charCount = content.length;
  const charColor =
    charCount > 280
      ? "text-destructive"
      : charCount >= 260
        ? "text-[#ff5f5f]"
        : "text-muted-foreground";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || charCount > 280) return;

    setSubmitting(true);

    // Build scheduled_at from date + time slot
    const timeSlotHours: Record<string, number> = {
      "9AM": 9,
      "12PM": 12,
      "3PM": 15,
      "6PM": 18,
      "9PM": 21,
    };

    const scheduledDate = new Date(date);
    const hours = timeSlot === "custom" ? 9 : timeSlotHours[timeSlot];
    scheduledDate.setHours(hours, 0, 0, 0);

    try {
      const res = await fetch("/api/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          scheduled_at: scheduledDate.toISOString(),
          time_slot: timeSlot,
          category: category || null,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.status === 409) {
        toast.error("A tweet is already scheduled for that time");
        return;
      }

      if (!res.ok) {
        toast.error("Failed to schedule tweet");
        return;
      }

      toast.success("Tweet scheduled");
      setContent("");
      setCategory("");
      onTweetCreated();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] resize-none bg-card border-border font-sans text-sm"
          maxLength={300}
        />
        <span className={`absolute bottom-2 right-2 font-mono text-[10px] ${charColor}`}>
          {charCount}/280
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-[140px] bg-card border-border font-mono text-xs"
        />

        <Select
          value={timeSlot}
          onValueChange={(v) => v && setTimeSlot(v as TimeSlot)}
        >
          <SelectTrigger className="w-[100px] bg-card border-border font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="9AM">9:00 AM</SelectItem>
            <SelectItem value="12PM">12:00 PM</SelectItem>
            <SelectItem value="3PM">3:00 PM</SelectItem>
            <SelectItem value="6PM">6:00 PM</SelectItem>
            <SelectItem value="9PM">9:00 PM</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-[120px] bg-card border-border text-xs"
        />

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenAI}
            className="text-muted-foreground hover:text-primary"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            AI
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || charCount > 280 || submitting}
          >
            <Send className="mr-1 h-3 w-3" />
            {submitting ? "Scheduling..." : "Schedule"}
          </Button>
        </div>
      </div>
    </form>
  );
}
