import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoice",
  description: "Invoice preview",
};

export default function InvoiceRenderLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This layout just wraps children - no html/body tags needed
  // The root layout handles that, and LayoutWrapper will skip the sidebar for this route
  return <>{children}</>;
}

