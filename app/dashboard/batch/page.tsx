"use client";

import { Suspense } from "react";
import { BatchGenerator } from "@/components/batch-generator";
import { Skeleton } from "@/components/ui/skeleton";

export default function BatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Skeleton className="h-8 w-32" />
        </div>
      }
    >
      <BatchGenerator />
    </Suspense>
  );
}
