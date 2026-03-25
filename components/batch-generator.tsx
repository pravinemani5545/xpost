"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  Check,
  Copy,
  Calendar,
  Loader2,
} from "lucide-react";
import type { BatchGeneratedItem, ContentType, TimeSlot } from "@/types";

const CONTENT_TYPE_CONFIG: Record<
  ContentType,
  { label: string; description: string; defaultMaxLength: number }
> = {
  tweet: {
    label: "Tweet",
    description: "Short posts for your X timeline",
    defaultMaxLength: 280,
  },
  article: {
    label: "Article / Thread Starter",
    description: "Long-form posts or thread openers",
    defaultMaxLength: 1500,
  },
  reply: {
    label: "Reply",
    description: "Engaging replies to other accounts",
    defaultMaxLength: 280,
  },
};

export function BatchGenerator() {
  const router = useRouter();

  // Form state
  const [writingStyle, setWritingStyle] = useState("");
  const [styleLoading, setStyleLoading] = useState(true);
  const [styleSaving, setStyleSaving] = useState(false);
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState<ContentType>("tweet");
  const [tone, setTone] = useState<string>("");
  const [count, setCount] = useState(10);
  const [maxLength, setMaxLength] = useState(280);

  // Results state
  const [items, setItems] = useState<BatchGeneratedItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Schedule state
  const [scheduleDate, setScheduleDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [scheduleSlot, setScheduleSlot] = useState<TimeSlot>("9AM");

  // Load saved writing style
  useEffect(() => {
    fetch("/api/writing-style")
      .then((r) => r.json())
      .then((data) => setWritingStyle(data.style ?? ""))
      .catch(() => {})
      .finally(() => setStyleLoading(false));
  }, []);

  // Update max length when content type changes
  useEffect(() => {
    setMaxLength(CONTENT_TYPE_CONFIG[contentType].defaultMaxLength);
  }, [contentType]);

  // Auto-set count to match number of tweets in reply mode
  const replyTweetCount = contentType === "reply"
    ? topic.split("\n").filter((l) => l.trim()).length
    : 0;

  useEffect(() => {
    if (contentType === "reply" && replyTweetCount > 0) {
      setCount(Math.min(replyTweetCount, 100));
    }
  }, [contentType, replyTweetCount]);

  const saveStyle = useCallback(async () => {
    if (writingStyle.length < 10) return;
    setStyleSaving(true);
    try {
      await fetch("/api/writing-style", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: writingStyle }),
      });
      toast.success("Writing style saved");
    } catch {
      toast.error("Failed to save writing style");
    } finally {
      setStyleSaving(false);
    }
  }, [writingStyle]);

  async function handleGenerate() {
    if (writingStyle.length < 10) {
      toast.error("Please describe your writing style first (min 10 chars)");
      return;
    }
    if (topic.length < 10) {
      toast.error("Topic must be at least 10 characters");
      return;
    }

    setGenerating(true);
    setItems([]);
    setSelected(new Set());

    try {
      const res = await fetch("/api/ai/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          writing_style: writingStyle,
          content_type: contentType,
          tone: tone || undefined,
          count,
          max_length: maxLength,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (res.status === 429) {
        toast.error("Rate limit reached. Try again in an hour.");
        return;
      }

      if (!res.ok) {
        toast.error("Generation failed. Try again.");
        return;
      }

      const data = await res.json();
      setItems(data.items ?? []);

      if (data.items?.length > 0) {
        toast.success(`Generated ${data.items.length} posts`);
      } else {
        toast.error("No posts generated. Try a different topic.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function selectAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((_, i) => i)));
    }
  }

  async function copyToClipboard(content: string, index: number) {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  async function handleScheduleSelected() {
    if (selected.size === 0) {
      toast.error("Select at least one post to schedule");
      return;
    }

    setScheduling(true);
    const selectedItems = Array.from(selected).map((i) => items[i]);

    const timeSlotHours: Record<string, number> = {
      "9AM": 9,
      "12PM": 12,
      "3PM": 15,
      "6PM": 18,
      "9PM": 21,
    };

    // Schedule each selected item across time slots
    const slots = ["9AM", "12PM", "3PM", "6PM", "9PM"];
    const results = await Promise.allSettled(
      selectedItems.map(async (item, idx) => {
        const dayOffset = Math.floor(idx / slots.length);
        const slotIdx = idx % slots.length;
        const slot = scheduleSlot === "custom" ? slots[slotIdx] : (idx === 0 ? scheduleSlot : slots[(slots.indexOf(scheduleSlot) + idx) % slots.length]);

        const scheduledDate = new Date(scheduleDate);
        scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
        const hours = timeSlotHours[slot] ?? 9;
        scheduledDate.setHours(hours, 0, 0, 0);

        const res = await fetch("/api/tweets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: item.content.slice(0, 280),
            scheduled_at: scheduledDate.toISOString(),
            time_slot: slot,
            category: null,
          }),
        });

        if (res.status === 409) {
          throw new Error(`Slot taken: ${slot} on ${scheduledDate.toLocaleDateString()}`);
        }
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (succeeded > 0) {
      toast.success(`Scheduled ${succeeded} tweets`);
    }
    if (failed > 0) {
      toast.error(`${failed} failed (time slots may overlap)`);
    }

    setScheduling(false);
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Dashboard
          </Button>
          <Separator orientation="vertical" className="h-5 bg-border" />
          <h1 className="font-heading text-xl">Batch Generate</h1>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 p-6">
        {/* Writing Style Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg">Writing Style</h2>
              <p className="text-xs text-muted-foreground">
                Describe how you write — tone, vocabulary, sentence structure,
                quirks. Saved for future use.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={saveStyle}
              disabled={styleSaving || writingStyle.length < 10}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              {styleSaving ? "Saving..." : "Save Style"}
            </Button>
          </div>
          {styleLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Textarea
              placeholder="e.g. I write in short, punchy sentences. I use analogies from engineering. I avoid jargon but go deep on technical concepts. My tone is direct and slightly contrarian..."
              value={writingStyle}
              onChange={(e) => setWritingStyle(e.target.value)}
              className="min-h-[100px] resize-none bg-card border-border text-sm"
            />
          )}
        </section>

        <Separator className="bg-border" />

        {/* Generation Config */}
        <section className="space-y-4">
          <h2 className="font-heading text-lg">Generation Settings</h2>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                {contentType === "reply"
                  ? "Tweets to Reply To"
                  : "Topic / Research Area"}
              </Label>
              <Textarea
                placeholder={
                  contentType === "reply"
                    ? "Paste tweets here, one per line. Each line = one tweet you want to generate a reply for.\n\ne.g.\nAI won't replace developers, but developers who use AI will replace those who don't.\nThe best code is no code at all. Every line you write is a liability.\nShipping fast is a competitive advantage most teams underestimate."
                    : "What should the posts be about? Be specific — include key ideas, angles, or references you want covered..."
                }
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={`resize-none bg-card border-border text-sm ${
                  contentType === "reply" ? "min-h-[160px] font-mono text-xs" : "min-h-[80px]"
                }`}
              />
              {contentType === "reply" && topic.trim() && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {topic.split("\n").filter((l) => l.trim()).length} tweet{topic.split("\n").filter((l) => l.trim()).length !== 1 ? "s" : ""} detected
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Content Type */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Content Type
                </Label>
                <Select
                  value={contentType}
                  onValueChange={(v) =>
                    v && setContentType(v as ContentType)
                  }
                >
                  <SelectTrigger className="bg-card border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTENT_TYPE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {CONTENT_TYPE_CONFIG[contentType].description}
                </p>
              </div>

              {/* Tone */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Tone
                </Label>
                <Select
                  value={tone}
                  onValueChange={(v) => setTone(v ?? "")}
                >
                  <SelectTrigger className="bg-card border-border text-xs">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="contrarian">Contrarian</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Count — hidden in reply mode (auto-set from tweet count) */}
              {contentType !== "reply" && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Count ({count})
                  </Label>
                  <Input
                    type="range"
                    min={1}
                    max={100}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="h-9 bg-card border-border accent-primary cursor-pointer"
                  />
                </div>
              )}

              {/* Max Length */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Max Length
                </Label>
                <Input
                  type="number"
                  min={50}
                  max={4000}
                  value={maxLength}
                  onChange={(e) => setMaxLength(Number(e.target.value))}
                  className="bg-card border-border font-mono text-xs"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  characters per post
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={
              generating ||
              writingStyle.length < 10 ||
              topic.length < 10
            }
            className="w-full sm:w-auto"
          >
            {generating ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Generating {count} posts...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3 w-3" />
                Generate {count} Posts
              </>
            )}
          </Button>
        </section>

        {/* Loading State */}
        {generating && (
          <div className="space-y-3">
            {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {/* Results */}
        {items.length > 0 && !generating && (
          <>
            <Separator className="bg-border" />

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-lg">
                    Results ({items.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selected.size} selected
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  {selected.size === items.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>

              {/* Results Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => toggleSelect(i)}
                    className={`group relative w-full text-left rounded-md border p-3 transition-colors space-y-2 ${
                      selected.has(i)
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    {/* Selection indicator */}
                    <div
                      className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-sm border text-[10px] transition-colors ${
                        selected.has(i)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card"
                      }`}
                    >
                      {selected.has(i) && <Check className="h-3 w-3" />}
                    </div>

                    <p className="pr-8 text-sm leading-relaxed">
                      {item.content}
                    </p>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {item.hook_type}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        ·
                      </span>
                      <span
                        className={`font-mono text-[10px] ${
                          item.estimated_engagement === "high"
                            ? "text-[var(--color-status-posted)]"
                            : item.estimated_engagement === "medium"
                              ? "text-[var(--color-status-scheduled)]"
                              : "text-muted-foreground"
                        }`}
                      >
                        {item.estimated_engagement}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        · {item.content.length} chars
                      </span>

                      {/* Copy button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(item.content, i);
                        }}
                        className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      >
                        {copiedIndex === i ? (
                          <Check className="h-3 w-3 text-[var(--color-status-posted)]" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </button>
                ))}
              </div>

              {/* Schedule Controls */}
              {selected.size > 0 && (
                <div className="sticky bottom-0 rounded-md border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Schedule {selected.size} post{selected.size > 1 ? "s" : ""} starting:
                    </span>

                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-[140px] bg-background border-border font-mono text-xs"
                    />

                    <Select
                      value={scheduleSlot}
                      onValueChange={(v) =>
                        v && setScheduleSlot(v as TimeSlot)
                      }
                    >
                      <SelectTrigger className="w-[100px] bg-background border-border font-mono text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9AM">9:00 AM</SelectItem>
                        <SelectItem value="12PM">12:00 PM</SelectItem>
                        <SelectItem value="3PM">3:00 PM</SelectItem>
                        <SelectItem value="6PM">6:00 PM</SelectItem>
                        <SelectItem value="9PM">9:00 PM</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={handleScheduleSelected}
                      disabled={scheduling}
                      size="sm"
                      className="ml-auto"
                    >
                      {scheduling ? (
                        <>
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        `Schedule ${selected.size}`
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Posts will be distributed across time slots. If more than 5, they spill into the next day.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
