-- Monthly rate settings become per project.
-- Hand-edited: the generated SQL made project_id immediately required, which
-- cannot run while global rows exist.

-- 1) Add the column nullable so existing rows survive the backfill.
ALTER TABLE "monthly_rate_settings" ADD COLUMN "project_id" UUID;

-- 1b) Drop the old global unique index BEFORE the fan-out: it still enforces
--     one row per month, so inserting the same month for several projects
--     would raise 23505. Its replacement is created in step 4.
DROP INDEX "monthly_rate_settings_period_month_key";

-- 2) Fan each global (project-less) row out to every existing project,
--    keeping the same month, rate, active flag and set timestamp.
--    Source columns are table-qualified: "projects" also has an "isActive"
--    column, so the bare name made the reference ambiguous (P3006).
INSERT INTO "monthly_rate_settings" ("id", "period_month", "rate_percent", "isActive", "set_at", "project_id")
SELECT gen_random_uuid(), "monthly_rate_settings"."period_month", "monthly_rate_settings"."rate_percent", "monthly_rate_settings"."isActive", "monthly_rate_settings"."set_at", "projects"."id"
FROM "monthly_rate_settings"
CROSS JOIN "projects"
WHERE "monthly_rate_settings"."project_id" IS NULL;

-- Drop the now-superseded project-less rows. (If no projects exist they cannot
-- be kept: project_id is about to become required.)
DELETE FROM "monthly_rate_settings" WHERE "project_id" IS NULL;

-- 3) Enforce ownership.
ALTER TABLE "monthly_rate_settings" ALTER COLUMN "project_id" SET NOT NULL;

ALTER TABLE "monthly_rate_settings"
    ADD CONSTRAINT "monthly_rate_settings_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) One rate per project per month (was one rate per month globally; the old
--    index was dropped in step 1b).
CREATE UNIQUE INDEX "monthly_rate_settings_project_id_period_month_key"
    ON "monthly_rate_settings"("project_id", "period_month");

CREATE INDEX "monthly_rate_settings_period_month_idx"
    ON "monthly_rate_settings"("period_month");
