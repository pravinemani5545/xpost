import { TweetCard } from "@/components/tweet-card";
import { formatDate, getRelativeDay } from "@/lib/utils";
import type { Tweet } from "@/types";

interface DayGroupProps {
  date: string;
  tweets: Tweet[];
  onRefetch: () => void;
}

export function DayGroup({ date, tweets, onRefetch }: DayGroupProps) {
  const posted = tweets.filter((t) => t.status === "posted").length;
  const total = tweets.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <h3 className="font-heading text-lg">
          {getRelativeDay(date)}
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {formatDate(date)}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          {tweets.map((t) => (
            <div
              key={t.id}
              className={`h-1.5 w-1.5 rounded-full ${
                t.status === "posted"
                  ? "bg-[#c8f55a]"
                  : t.status === "failed"
                    ? "bg-[#ff5f5f]"
                    : "bg-[#5fb8ff]"
              }`}
            />
          ))}
          <span className="ml-1 font-mono text-[10px] text-muted-foreground">
            {posted}/{total}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} onRefetch={onRefetch} />
        ))}
      </div>
    </div>
  );
}
