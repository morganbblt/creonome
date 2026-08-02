import type { Metadata } from "next";
import { demoDnaDimensions } from "../../../src/features/management/demo-management";
import styles from "../management.module.css";

export const metadata: Metadata = { title: "Creator DNA" };

export default function CreatorDnaPage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <header className={styles.dnaHeader}>
          <div><p className={styles.eyebrow}>ADN ARTISTIQUE ET CRÉATIF</p><h1>Creator DNA</h1><p className={styles.meta}>Nova Sainte · indie electronic · FR / EN · 14 dimensions renseignées</p></div>
          <button className={styles.button} type="button">Export JSON</button>
        </header>
        <div className={styles.dnaContent}>
          <div className={styles.filters}><span className={styles.filterActive}>Tout · 14</span><span className={styles.filter}>Observé 7</span><span className={styles.filter}>Déclaré 4</span><span className={styles.filter}>Appris 2</span><span className={styles.filter}>Interdit 1</span></div>
          <div className={styles.dnaSummary}>
            <div className={styles.dnaBranch}><strong>Direction artistique</strong><span>gris froids · béton · vinyle · grain 70s</span></div>
            <div className={styles.dnaBranch}><strong>Ligne éditoriale</strong><span>mémoire · nuit · intime · nostalgie</span></div>
            <div className={styles.dnaBranch}><strong>Métier</strong><span>downtempo · dub · MPC · shorts d’atelier</span></div>
            <div className={styles.dnaBranch}><strong>Limites</strong><span>pas de danse · clone vocal · face-cam</span></div>
          </div>
          <div className={styles.dnaGrid}>
            {demoDnaDimensions.map(([source, title, body]) => (
              <article data-testid="dna-dimension" className={`${styles.dnaCard} ${source === "Interdit" ? styles.forbidden : ""}`} key={title}>
                <span className={styles.dimensionSource}>{source.toUpperCase()}</span><h2>{title}</h2><p>{body}</p>
              </article>
            ))}
          </div>
          <aside className={styles.memoryPanel}><h2>Memory candidates</h2><p>Nothing enters long-term memory without your approval. New candidates from edits and finished exports will appear here.</p></aside>
        </div>
      </section>
    </main>
  );
}
