import type { Metadata } from "next";
import { BillingWorkspace } from "@/src/features/billing/billing-workspace";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return <BillingWorkspace />;
}
