-- Existing demo opportunities were seeded before trend provenance was linked
-- in the canonical feed. Keep this idempotent and limited to the stable demo
-- workspace so re-running migrations cannot alter creator-owned opportunities.
UPDATE "opportunities" AS opportunity
SET
  "trend_cluster_id" = CASE "opportunity"."position"
    WHEN 1 THEN '01989f00-0000-7000-8000-000000000211'::uuid
    WHEN 2 THEN '01989f00-0000-7000-8000-000000000212'::uuid
    WHEN 3 THEN '01989f00-0000-7000-8000-000000000213'::uuid
  END,
  "updated_at" = now()
WHERE "opportunity"."workspace_id" = '01989f00-0000-7000-8000-000000000002'::uuid
  AND "opportunity"."batch_id" = '01989f00-0000-7000-8000-000000000004'::uuid
  AND "opportunity"."position" BETWEEN 1 AND 3
  AND "opportunity"."trend_cluster_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "trend_clusters" AS cluster
    WHERE cluster."id" = CASE "opportunity"."position"
      WHEN 1 THEN '01989f00-0000-7000-8000-000000000211'::uuid
      WHEN 2 THEN '01989f00-0000-7000-8000-000000000212'::uuid
      WHEN 3 THEN '01989f00-0000-7000-8000-000000000213'::uuid
    END
      AND cluster."workspace_id" = "opportunity"."workspace_id"
  );
