import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge@2.2.0";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}