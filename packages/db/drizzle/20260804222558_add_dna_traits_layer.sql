-- P1.1: dna_traits previously had no real layer column -- the Creator DNA
-- bible's four-layer model (declared/observed/learned/forbidden, §11.1) only
-- had two of its four layers implemented, and even those two ("declared" vs
-- "observed") lived solely inside the untyped evidence.provenance JSONB
-- field rather than a first-class, queryable, constrained column. "Learned"
-- and "forbidden" had no representation at all.
--
-- Backfill policy for existing rows (documented judgment call): every
-- pre-existing row was written by the onboarding pipeline, which only ever
-- produced two kinds of trait --
--   - boundary-category traits (the free-text "boundaries" list), which are
--     the hard constraints the product already enforces via
--     QualityGateService's boundary check -- these become the new
--     "forbidden" layer.
--   - every other category, which carried "declared" or "observed" in
--     evidence.provenance -- that value is promoted verbatim to the new
--     column.
-- Anything that matches neither rule (e.g. a manually-inserted row with no
-- provenance) falls back to the column default, "observed", the safest/
-- least-consequential layer (it is never treated as a hard constraint and
-- carries a lower confidence prior than "declared").
ALTER TABLE "dna_traits" ADD COLUMN "layer" text DEFAULT 'observed' NOT NULL;--> statement-breakpoint
UPDATE "dna_traits" SET "layer" = 'forbidden' WHERE "category" = 'boundary';--> statement-breakpoint
UPDATE "dna_traits" SET "layer" = 'declared' WHERE "category" != 'boundary' AND "evidence"->>'provenance' = 'declared';--> statement-breakpoint
UPDATE "dna_traits" SET "layer" = 'observed' WHERE "category" != 'boundary' AND "evidence"->>'provenance' = 'observed';--> statement-breakpoint
CREATE INDEX "dna_traits_version_layer_idx" ON "dna_traits" USING btree ("dna_version_id","layer");--> statement-breakpoint
ALTER TABLE "dna_traits" ADD CONSTRAINT "dna_traits_layer_check" CHECK ("dna_traits"."layer" in ('declared', 'observed', 'learned', 'forbidden'));
