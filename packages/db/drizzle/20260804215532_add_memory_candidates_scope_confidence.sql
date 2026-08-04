-- P1.4: memory_candidates previously had no real scope column -- the app
-- reverse-engineered it from `kind` at read time (memory-candidates.service),
-- which meant "idea"-scoped candidates could never resolve correctly since
-- `kind` only ever held "project" or "creator" for existing rows.
--
-- Backfill policy for existing rows: `kind` and `scope` were conflated by
-- every current write site, so for legacy rows whose `kind` already holds a
-- valid scope value ("idea" | "project" | "creator") we carry that value
-- over verbatim. Any row whose `kind` is something else (i.e. not a
-- recognized scope literal) is ambiguous and defaults to "creator", the
-- broadest/safest scope, per the task's stated backfill policy.
ALTER TABLE "memory_candidates" ADD COLUMN "scope" text DEFAULT 'creator' NOT NULL;--> statement-breakpoint
ALTER TABLE "memory_candidates" ADD COLUMN "confidence" numeric(4, 3) DEFAULT '0.5' NOT NULL;--> statement-breakpoint
UPDATE "memory_candidates" SET "scope" = "kind" WHERE "kind" in ('idea', 'project', 'creator');--> statement-breakpoint
ALTER TABLE "memory_candidates" ADD CONSTRAINT "memory_candidates_scope_check" CHECK ("memory_candidates"."scope" in ('idea', 'project', 'creator'));--> statement-breakpoint
ALTER TABLE "memory_candidates" ADD CONSTRAINT "memory_candidates_confidence_check" CHECK ("memory_candidates"."confidence" >= 0 and "memory_candidates"."confidence" <= 1);