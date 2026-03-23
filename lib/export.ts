import type { Tweet } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";

export function generateScheduledMd(tweets: Tweet[]): string {
  const lines: string[] = [
    "# Scheduled Tweets",
    `Generated: ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`,
    `Total: ${tweets.length}`,
    "",
  ];

  // Group by day
  const byDay = new Map<string, Tweet[]>();
  for (const tweet of tweets) {
    const key = new Date(tweet.scheduled_at).toISOString().split("T")[0];
    const existing = byDay.get(key) || [];
    existing.push(tweet);
    byDay.set(key, existing);
  }

  let dayNum = 1;
  for (const [date, dayTweets] of byDay) {
    lines.push(
      `## Day ${dayNum} — ${formatDate(date)}`
    );
    for (const tweet of dayTweets) {
      const time = formatTime(tweet.scheduled_at);
      const preview =
        tweet.content.length > 60
          ? `${tweet.content.slice(0, 60)}...`
          : tweet.content;
      lines.push(`- [ ] **${time}** — ${preview}`);
    }
    lines.push("");
    dayNum++;
  }

  return lines.join("\n");
}

export function generatePostedMd(tweets: Tweet[]): string {
  const lines: string[] = [
    "# Posted Tweets Archive",
    `Total posted: ${tweets.length}`,
    "> These tweets have been sent. Never repeat them.",
    "",
  ];

  for (const tweet of tweets) {
    const dateStr = tweet.posted_at
      ? `${formatDate(tweet.posted_at)} · ${formatTime(tweet.posted_at)}`
      : formatDate(tweet.scheduled_at);
    lines.push(`### ${dateStr}`);
    lines.push("```");
    lines.push(tweet.content);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}
