import type { Metadata } from "next";
import { demoLibraryItems } from "../../../src/features/management/demo-management";
import styles from "../management.module.css";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <h1>Library</h1><span className={styles.filterActive}>All 38</span><span className={styles.filter}>Rushes 21</span><span className={styles.filter}>Stems 9</span><span className={styles.filter}>Exports 5</span><span className={styles.filter}>Docs 3</span>
          <span className={styles.libraryMeta} style={{ marginLeft: "auto" }}>4.2 GB of 20 GB</span><button className={styles.buttonPrimary} type="button">Upload</button>
        </div>
        <div className={styles.libraryGrid}>
          {demoLibraryItems.map((item) => (
            <article className={styles.libraryItem} key={item.name}>
              <div className={`${styles.libraryVisual} ${styles[item.kind]}`}>{item.kind.toUpperCase()}</div>
              <strong>{item.name}</strong><span className={styles.libraryMeta}>{item.detail}</span>
            </article>
          ))}
          <article className={styles.libraryItem}><div className={`${styles.libraryVisual} ${styles.export}`}>DROP HERE</div><span className={styles.libraryMeta}>mp4 mov wav pdf</span></article>
        </div>
      </section>
    </main>
  );
}
