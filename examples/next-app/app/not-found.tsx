"use client";
import { env } from "../runtime-env/client";
export default function NotFound() {
  return <p id="missing">{env.APP_NAME}</p>;
}
