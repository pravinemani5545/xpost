import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { XConnectButton } from "@/components/x-connect-button";
import { Download, LogOut, Sparkles } from "lucide-react";
import type { Tweet } from "@/types";

interface StatsSidebarProps {
  tweets: Tweet[];
  onSignOut: () => void;
}

export function StatsSidebar({ tweets, onSignOut }: StatsSidebarProps) {
  const total = tweets.length;
  const scheduled = tweets.filter((t) => t.status === "scheduled").length;
  const posted = tweets.filter((t) => t.status === "posted").length;
  const failed = tweets.filter((t) => t.status === "failed").length;

  return (
    <aside className="w-full space-y-6 lg:w-[260px] lg:shrink-0">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl">TweetQueue</h2>
        <p className="text-xs text-muted-foreground">
          Your content. Your schedule.
        </p>
      </div>

      <Separator className="bg-border" />

      <div className="space-y-3">
        <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Stats
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <StatBlock label="Total" value={total} />
          <StatBlock label="Scheduled" value={scheduled} color="text-[#5fb8ff]" />
          <StatBlock label="Posted" value={posted} color="text-[#c8f55a]" />
          <StatBlock label="Failed" value={failed} color="text-[#ff5f5f]" />
        </div>
      </div>

      <Separator className="bg-border" />

      <div className="space-y-2">
        <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Tools
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-muted-foreground hover:text-primary"
          render={<a href="/dashboard/batch" />}
        >
          <Sparkles className="mr-1.5 h-3 w-3" />
          Batch Generate
        </Button>
      </div>

      <Separator className="bg-border" />

      <div className="space-y-3">
        <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          X Account
        </h3>
        <XConnectButton />
      </div>

      <Separator className="bg-border" />

      <div className="space-y-2">
        <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Export
        </h3>
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-xs text-muted-foreground"
            render={<a href="/api/export/scheduled" />}
          >
            <Download className="mr-1.5 h-3 w-3" />
            scheduled.md
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-xs text-muted-foreground"
            render={<a href="/api/export/posted" />}
          >
            <Download className="mr-1.5 h-3 w-3" />
            posted.md
          </Button>
        </div>
      </div>

      <Separator className="bg-border" />

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-xs text-muted-foreground hover:text-destructive"
        onClick={onSignOut}
      >
        <LogOut className="mr-1.5 h-3 w-3" />
        Sign out
      </Button>
    </aside>
  );
}

function StatBlock({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-2.5">
      <p className={`font-mono text-lg font-bold ${color}`}>{value}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
