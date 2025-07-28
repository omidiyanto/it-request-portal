import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatInTimeZone } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Get timezone from environment variable or use UTC as default
export const getAppTimeZone = (): string => {
  return import.meta.env.VITE_TIMEZONE || "UTC";
};

// Format date with app timezone
export const formatWithTimeZone = (
  date: Date | number | string,
  formatStr: string = "PPpp"
): string => {
  if (!date) return "-";
  return formatInTimeZone(new Date(date), getAppTimeZone(), formatStr);
};

// Get current date in app timezone
export const getCurrentDateInAppTimeZone = (): Date => {
  const now = new Date();
  const timeZoneOffset = new Date().getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timeZoneOffset);
};
