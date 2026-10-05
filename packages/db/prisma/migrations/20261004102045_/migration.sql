-- DropIndex
DROP INDEX "projects_isVisible_isActive_idx";

-- DropIndex
DROP INDEX "projects_status_idx";

-- CreateIndex
CREATE INDEX "projects_isVisible_isActive_status_createdAt_idx" ON "projects"("isVisible", "isActive", "status", "createdAt");

-- CreateIndex
CREATE INDEX "projects_minimumInvestment_idx" ON "projects"("minimumInvestment");

-- CreateIndex
CREATE INDEX "projects_createdAt_id_idx" ON "projects"("createdAt", "id");
