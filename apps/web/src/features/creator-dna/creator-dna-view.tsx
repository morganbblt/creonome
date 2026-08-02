"use client";

import type {
  CreatorDna,
  CreatorDnaTrait,
  MemoryCandidatesResponse,
} from "@creonome/contracts";
import styles from "./creator-dna.module.css";
import { MemoryControl } from "./memory-control";

function categoryLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function evidenceLabels(evidence: CreatorDnaTrait["evidence"]): string[] {
  return Object.values(evidence)
    .flatMap((value) =>
      typeof value === "string"
        ? [value]
        : Array.isArray(value)
          ? value.filter((item): item is string => typeof item === "string")
          : [],
    )
    .slice(0, 3);
}

export function CreatorDnaView({
  dna,
  memories,
}: {
  dna: CreatorDna;
  memories: MemoryCandidatesResponse | null;
}) {
  function exportJson() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(dna, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `creonome-creator-dna-v${dna.version}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p>ARTISTIC &amp; CREATIVE MODEL</p>
            <h1>Creator DNA</h1>
            <span>
              {dna.confirmed ? "Confirmed" : "Review required"} · version{" "}
              {dna.version}
            </span>
          </div>
          <button type="button" onClick={exportJson}>
            Export JSON
          </button>
        </header>

        <div className={styles.content}>
          <section className={styles.summary} aria-label="Creator DNA summary">
            <span>MODEL SUMMARY</span>
            <blockquote>{dna.summary}</blockquote>
            <div>
              <strong>{dna.traits.length}</strong>
              <small>evidence-backed traits</small>
            </div>
          </section>

          <div className={styles.legend}>
            <span>LIVE TRAITS · NEON</span>
            <p>
              Confidence measures the strength of current evidence, not creative
              quality.
            </p>
          </div>

          <div className={styles.grid}>
            {dna.traits.map((trait, index) => {
              const confidence =
                trait.confidence === null
                  ? null
                  : Math.round(trait.confidence * 100);
              const evidence = evidenceLabels(trait.evidence);
              return (
                <article className={styles.card} key={trait.id}>
                  <header>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <em>{categoryLabel(trait.category)}</em>
                  </header>
                  <h2>{trait.label}</h2>
                  <p>{trait.value}</p>
                  <div className={styles.confidence}>
                    <span style={{ width: `${confidence ?? 0}%` }} />
                  </div>
                  <strong>
                    {confidence === null
                      ? "Unscored"
                      : `${confidence}% confidence`}
                  </strong>
                  {evidence.length ? (
                    <ul aria-label={`Evidence for ${trait.label}`}>
                      {evidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <small>
                      Evidence is stored as structured workspace metadata.
                    </small>
                  )}
                </article>
              );
            })}
          </div>

          <MemoryControl initialMemories={memories} />
        </div>
      </section>
    </main>
  );
}
