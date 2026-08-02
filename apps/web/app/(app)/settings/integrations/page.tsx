import type { Metadata } from "next";
import styles from "../../management.module.css";

export const metadata: Metadata = { title: "Integrations" };

const providers = [
  {
    name: "TikTok",
    mark: "TT",
    description:
      "TikTok insights and publishing connections are planned after the MVP.",
  },
  {
    name: "Instagram",
    mark: "IG",
    description:
      "Instagram insights and publishing connections are planned after the MVP.",
  },
] as const;

export default function IntegrationsPage() {
  return (
    <main className={styles.compactPage}>
      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <h1>Integrations</h1>
        </div>
        <div className={styles.providerList}>
          {providers.map((provider) => (
            <article className={styles.providerCard} key={provider.name}>
              <div className={styles.providerHead}>
                <span className={styles.providerIcon}>{provider.mark}</span>
                <div>
                  <h2>{provider.name}</h2>
                  <span className={styles.providerMeta}>
                    Optional social connection
                  </span>
                </div>
                <span className={styles.status}>Coming soon</span>
              </div>
              <p>{provider.description}</p>
              <div className={styles.actions}>
                <button className={styles.buttonPrimary} type="button" disabled>
                  Connect
                </button>
                <span className={styles.hint}>
                  Not included in the current MVP.
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
