import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TimeSlot } from "@/types";
import { TIME_SLOT_HOURS } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function getScheduledAtForSlot(
  date: Date,
  slot: Exclude<TimeSlot, "custom">
): string {
  const d = new Date(date);
  d.setHours(TIME_SLOT_HOURS[slot], 0, 0, 0);
  return d.toISOString();
}

export function groupByDay<T extends { scheduled_at: string }>(
  items: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = new Date(item.scheduled_at).toISOString().split("T")[0];
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }
  return groups;
}

export function getRelativeDay(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}
