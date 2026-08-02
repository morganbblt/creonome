export type BillingPlan = {
  id: "studio" | "label";
  name: string;
  monthlyPriceInEuro: number;
  creditsPerMonth: number;
  storageInGb: number;
  members: number;
  current: boolean;
};

export type MockInvoice = {
  id: string;
  issuedOn: string;
  label: string;
  amountInEuro: number;
};

export const mockBilling = {
  mode: "mock" as const,
  notice: "Demo data — payments are not enabled for the hackathon.",
  creditBalance: 60,
  plans: [
    {
      id: "studio",
      name: "Studio",
      monthlyPriceInEuro: 29,
      creditsPerMonth: 60,
      storageInGb: 20,
      members: 2,
      current: true,
    },
    {
      id: "label",
      name: "Label",
      monthlyPriceInEuro: 89,
      creditsPerMonth: 220,
      storageInGb: 100,
      members: 6,
      current: false,
    },
  ] satisfies BillingPlan[],
  invoices: [
    {
      id: "inv-demo-2026-08",
      issuedOn: "1 Aug 2026",
      label: "Studio · monthly",
      amountInEuro: 29,
    },
    {
      id: "inv-demo-pack-20",
      issuedOn: "18 Jul 2026",
      label: "Credit pack · 20",
      amountInEuro: 12,
    },
    {
      id: "inv-demo-2026-07",
      issuedOn: "1 Jul 2026",
      label: "Studio · monthly",
      amountInEuro: 29,
    },
  ] satisfies MockInvoice[],
  paymentMethod: {
    brand: "Visa",
    lastFour: "4417",
    expires: "09/28",
  },
};
