"use client";
import { usePathname } from "next/navigation";
export default function Root({ children }: { children: React.ReactNode }) {
  if (usePathname() === "/client-root-error")
    throw new Error("Intentional client root failure");
  return children;
}
