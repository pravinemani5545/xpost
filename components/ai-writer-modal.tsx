"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import type { TweetVariation } from "@/types";

interface AIWriterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (content: string) => void;
}

export function AIWriterModal({
  open,
  onOpenChange,
  onSelect,
}: AIWriterModalProps) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<string>("");
  const [variations, setVariations] = useState<TweetVariation[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (topic.length < 10) {
      toast.error("Topic must be at least 10 characters");
      return;
    }

    setLoading(true);
    setVariations([]);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          tone: tone || undefined,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.status === 429) {
        toast.error("Rate limit reached. Try again in an hour.");
        return;
      }

      if (!res.ok) {
        toast.error("Failed to generate variations");
        return;
      }

      const data = await res.json();
      setVariations(data.variations);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(content: string) {
    onSelect(content);
    onOpenChange(false);
    setTopic("");
    setTone("");
    setVariations([]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Tweet Writer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Describe your topic (min 10 chars)..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-background border-border text-sm"
            />
            <div className="flex gap-2">
              <Select value={tone} onValueChange={(v) => setTone(v ?? "")}>
                <SelectTrigger className="w-[140px] bg-background border-border text-xs">
                  <SelectValue placeholder="Tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="contrarian">Contrarian</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleGenerate}
                disabled={loading || topic.length < 10}
                size="sm"
              >
                {loading ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {variations.length > 0 && (
            <div className="space-y-3">
              {variations.map((v, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(v.content)}
                  className="w-full text-left rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/50 space-y-2"
                >
                  <p className="text-sm leading-relaxed">{v.content}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {v.hook_type}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ·
                    </span>
                    <span
                      className={`font-mono text-[10px] ${
                        v.estimated_engagement === "high"
                          ? "text-[#c8f55a]"
                          : v.estimated_engagement === "medium"
                            ? "text-[#5fb8ff]"
                            : "text-muted-foreground"
                      }`}
                    >
                      {v.estimated_engagement} engagement
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {v.content.length}/280
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
