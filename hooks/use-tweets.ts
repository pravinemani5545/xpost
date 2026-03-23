"use client";

import { useCallback, useEffect, useState } from "react";
import type { Tweet } from "@/types";

export function useTweets() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTweets = useCallback(async () => {
    try {
      const res = await fetch("/api/tweets");
      if (res.ok) {
        const data = await res.json();
        setTweets(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTweets();
  }, [fetchTweets]);

  return { tweets, loading, refetch: fetchTweets };
}
