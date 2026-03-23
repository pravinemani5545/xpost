"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import type { XConnection } from "@/types";

export function useXConnection() {
  const [connection, setConnection] = useState<XConnection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("x_connections")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setConnection(data);
      setLoading(false);
    }
    fetch();
  }, []);

  return { connection, loading };
}
