
import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "Enterprise Intelligence Platform",
  description:
    "Enterprise Knowledge Graph and secure context retrieval platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
