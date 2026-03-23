import { formatTime } from "@/lib/utils";
import type { Tweet } from "@/types";
import { Clock } from "lucide-react";

export function NextUpBanner({ tweet }: { tweet: Tweet | null }) {
  if (!tweet) return null;

  const preview =
    tweet.content.length > 80
      ? `${tweet.content.slice(0, 80)}...`
      : tweet.content;

  return (
    <div className="flex items-center gap-3 rounded-md border border-[#5fb8ff]/20 bg-[#5fb8ff]/5 px-4 py-2.5">
      <Clock className="h-3.5 w-3.5 text-[#5fb8ff] shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-mono text-[10px] text-[#5fb8ff] uppercase tracking-wider">
          Next up · {formatTime(tweet.scheduled_at)}
        </span>
        <p className="text-sm text-muted-foreground truncate">{preview}</p>
      </div>
    </div>
  );
}
