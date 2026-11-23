-- Investments are paid in a single manual payment: installments are not
-- supported, and payments have no due date (staff mark a payment overdue
-- by hand), so both columns are dropped.
ALTER TABLE "incoming_payments" DROP COLUMN "installment_number",
DROP COLUMN "due_date";
