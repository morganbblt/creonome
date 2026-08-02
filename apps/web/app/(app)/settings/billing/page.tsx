import { mockBilling } from "../../../../src/features/billing/mock-billing";
import styles from "./billing.module.css";

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export default function BillingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>PLAN &amp; INVOICES</p>
          <h1>Billing</h1>
        </div>
        <div
          className={styles.balance}
          aria-label={`${mockBilling.creditBalance} credits available`}
        >
          <span>{mockBilling.creditBalance}</span> credits
        </div>
      </header>

      <p className={styles.notice} role="status">
        {mockBilling.notice}
      </p>

      <section className={styles.panel} aria-labelledby="plans-heading">
        <h2 id="plans-heading" className={styles.srOnly}>
          Plans
        </h2>
        <div className={styles.plans}>
          {mockBilling.plans.map((plan) => (
            <article
              className={`${styles.plan} ${plan.current ? styles.currentPlan : ""}`}
              key={plan.id}
            >
              <div className={styles.planTitle}>
                <h3>{plan.name}</h3>
                {plan.current ? (
                  <span className={styles.currentBadge}>CURRENT</span>
                ) : null}
              </div>
              <p className={styles.price}>
                <span>{plan.monthlyPriceInEuro} €</span> / month
              </p>
              <p className={styles.features}>
                {plan.creditsPerMonth} credits / month
                <br />
                {plan.storageInGb} GB library
                <br />
                {plan.members} members{plan.id === "label" ? " · roles" : ""}
              </p>
              <button
                type="button"
                disabled
                title="Payments are disabled in demo mode"
              >
                {plan.current ? "Cancel plan" : "Upgrade"}
              </button>
            </article>
          ))}
        </div>

        <div className={styles.invoices}>
          <div className={styles.sectionTitle}>
            <h2>INVOICES</h2>
            <span>VAT invoices, downloadable</span>
            <button
              type="button"
              disabled
              title="Payments are disabled in demo mode"
            >
              Billing details
            </button>
          </div>
          <div className={styles.invoiceList}>
            {mockBilling.invoices.map((invoice) => (
              <div className={styles.invoice} key={invoice.id}>
                <time>{invoice.issuedOn}</time>
                <strong>{invoice.label}</strong>
                <span>{euro.format(invoice.amountInEuro)}</span>
                <button type="button" disabled title="Demo invoice">
                  PDF
                </button>
              </div>
            ))}
          </div>
          <div className={styles.card}>
            <span className={styles.cardMark} aria-hidden="true" />
            <strong>
              {mockBilling.paymentMethod.brand} ••••{" "}
              {mockBilling.paymentMethod.lastFour}
            </strong>
            <span>exp {mockBilling.paymentMethod.expires}</span>
            <button
              type="button"
              disabled
              title="Payments are disabled in demo mode"
            >
              Change
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
