"use client";

import { Button } from "@/components/ui/button";
import { useXConnection } from "@/hooks/use-x-connection";
import { Unlink, Zap } from "lucide-react";

export function XConnectButton() {
  const { connection, loading } = useXConnection();

  if (loading) {
    return (
      <Button variant="secondary" size="sm" disabled>
        Loading...
      </Button>
    );
  }

  if (connection) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          @{connection.x_username}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={async () => {
            const supabase = (await import("@/lib/supabase/browser")).createBrowserClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("x_connections").delete().eq("user_id", user.id);
              window.location.reload();
            }
          }}
        >
          <Unlink className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        window.location.href = "/api/auth/x/connect";
      }}
    >
      <Zap className="mr-1 h-3 w-3" />
      Connect X
    </Button>
  );
}
