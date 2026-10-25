import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* A blocking classic script initializes getters before hydration. */}
        <script src="/runtime-env/bootstrap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
