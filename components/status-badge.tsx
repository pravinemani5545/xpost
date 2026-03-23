import { Badge } from "@/components/ui/badge";
import type { TweetStatus } from "@/types";

const STATUS_STYLES: Record<TweetStatus, string> = {
  scheduled: "bg-[#5fb8ff]/10 text-[#5fb8ff] border-[#5fb8ff]/20",
  posted: "bg-[#c8f55a]/10 text-[#c8f55a] border-[#c8f55a]/20",
  failed: "bg-[#ff5f5f]/10 text-[#ff5f5f] border-[#ff5f5f]/20",
};

export function StatusBadge({ status }: { status: TweetStatus }) {
  return (
    <Badge
      variant="outline"
      className={`font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  );
}
