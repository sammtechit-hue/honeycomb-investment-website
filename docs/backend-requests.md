# Backend requests

Backend changes the frontend needs. The frontend team adds an entry here
instead of changing `apps/api` or `packages/db`. Newest first.

## Already changed on `feature/verficationpage`: please review

The investor application flow was built before this file existed, so these
backend changes came with it. The secure-web screens depend on them. Keep,
change or redo them as you see fit, and tell the frontend team if the API
shape changes.

**The flow:** an investor submits one application (profile, nominee, bank,
documents and their first investment). They can't change it while it's under
review. An admin approves it or sends it back with a note. If it's sent back,
the investor edits it and resubmits. Only approved investors reach the portal.

| Change | Where |
|---|---|
| New investor status `rejected`, plus `rejection_reason` and `rejected_at` on `investors` | `packages/db/prisma/schema.prisma`, migration `20261119100000_investor_application_rejection` |
| `POST /investor` now also takes `investment` (the first investment) and creates it in the same transaction | `investorApplicationInputSchema` in `packages/contracts/src/investor.ts`; `InvestorService.createInvestor` |
| New `PUT /investor/application`: resubmits a rejected application, replacing profile, nominee, bank, KYC and the first investment. Clears the NID number if a new NID card was uploaded | `InvestorService.resubmitApplication`, `ResubmitApplicationDto` |
| New `PATCH /admin/investor/:id/reject` with `{ reason }` (5–500 chars); sets status `rejected` and marks KYC rejected | admin `InvestorService.rejectApplication`, `RejectApplicationDto` |
| Admin `PATCH /admin/investor/:id` refuses `status: 'rejected'` (use the reject endpoint) and refuses any change while the application is rejected | admin `InvestorService.updateInvestor` |
| Before approval, these return 403: `POST /investor/update`, `POST /investor/bank-account`, `POST /investment`, `POST /incoming-payment` | `assertApproved` in `investor.service.ts`; checks in `investment.service.ts` and `incoming-payment.service.ts` |
| `GET /investor` also returns `rejectionReason` and `rejectedAt`; category stays hidden until approval | `INVESTOR_PROFILE_SELECT` |
| Project check and rate lookup moved into a shared helper `resolveInvestmentTerms` | `utils/common/project-investment.util.ts` |
| `investorStatusSchema` includes `rejected` | `packages/contracts/src/investor.ts` |
| `auditActionSchema` now lists all 35 actions in the Prisma `AuditAction` enum, in the same order. It was missing `monthly_rate_updated`, `business_settings_set`, `business_settings_updated`, `disbursement_batch_updated`, `payout_window_created` and `payout_window_updated`, so `GET /admin/audit-log?action=` returned 400 for them. The audit log viewer filters on them directly now | `packages/contracts/src/auditLog.ts` |
| `logStatusSchema` is `SUCCESS`, `FAILED`, `PENDING`, matching the Prisma `LogStatus` enum (it said `FAILURE`, which the database rejects). Only the unused audit-log create and update DTOs read it | `packages/contracts/src/auditLog.ts` |
| `adminNotificationTypeSchema` now lists all 8 types in the Prisma `AdminNotificationType` enum, in the same order. It was missing `investor_action`, `incoming_payments` and `monthly_profit_cycle`, so `GET /admin-notification?type=` returned 400 for them. The profit run card filters on `monthly_profit_cycle` | `packages/contracts/src/notification.ts` |

## Open requests

### Monthly profit run (found while building the "Run monthly profit" button)
The button is on `/admin/payouts/items` in secure-web, as step 1 above
"Prepare payout items". It calls `POST /admin/monthly-profit-ledger`.
Before the run, the page works out which investments will get profit and
warns about missing monthly rates, using a copy of the API's rules in
`apps/secure-web/lib/profit-run.ts`.

**Please look at these first.**
- **Nothing runs it automatically.** There's no `@Cron` for the profit run
  (the only scheduled job is the auth cleanup), so profit is calculated only
  when someone presses the button.
- **A missed day can't be made up.** The run is refused on any day but the
  cycle day ("must run on the 11th"), and it always works out the cycle from
  today's date. If nobody runs it on the 11th, that month's profit can't be
  calculated afterwards. Please schedule it on the cycle day, and allow a
  run for a past cycle (for example `POST` with `{ cycleEnd }`, admin only)
  to recover a missed one.
- **A rate set late can't be applied late.** Variable-rate investments in a
  project with no rate for the month are left out. Rerunning the same day
  after setting the rate works (tested: it adds just those investments), but
  the next day it's refused.

**Smaller things.**
- The response is only `{ created, skipped }`. Why an investment was left
  out (counting delay, missing rate, missing fixed rate) isn't returned; the
  missing-rate projects are only in an admin notification. Return the
  skipped investments with a reason, like `POST /admin/disbursement-item`
  does.
- A fixed-rate investment at 0% gets a ৳0 ledger row each month (tested).
  Variable-rate ones are refused at 0. Decide whether fixed should be too.
- With a cycle day of 1, a run on 1 December makes `cycleStart` 1 October
  (two months back), because it subtracts a month from `cycleEnd`'s month.
  Later cycles still count 30 days, so the amount is right, but the dates
  are wrong (from reading the code; not tested).
- `businessSettings.findFirst({ where: { isActive: true } })` has no
  `orderBy`, so with two active rows the run can use either. The page
  assumes the oldest.
- Moderators can run it (`@Roles(ADMIN, MODERATOR)`). The page follows the
  API. Confirm they should.

**Notifications.**
- The admin notification controller is at `/admin-notification`, not
  `/admin/admin-notification` like every other admin route.
- `adminNotificationTypeSchema` was three types behind the Prisma enum;
  fixed on this branch (see the table at the top). When you add an
  `AdminNotificationType`, add it there too.

### Audit log (found while building the admin audit log viewer)
The viewer is at `/admin/audit` in secure-web (admins only, like the API),
with a "History" link on investor, investment, project, payout window and
batch pages. It works around these for now.

- **The audit log can be written through the API.** `POST
  /admin/audit-log` and `PATCH /admin/audit-log/:id` exist. Both are stubs
  today (they echo the body and save nothing), but if they're ever filled
  in, any admin could add or rewrite entries, which defeats the log. Please
  delete both routes and their DTOs; entries should only be written by the
  services that do the work.
- **Keep the action list in step.** `auditActionSchema` in contracts is a
  hand-kept copy of the Prisma enum (it was six behind; fixed on this
  branch, see the table above). When you add an `AuditAction`, add it there
  too, or filtering on it returns 400.
- **Search doesn't cover the record name.** `search` looks at
  `targetTable`, `adminName` and action names, not `targetLabel`, so
  searching for "Riverside Farms" or an investor's name finds nothing. Add
  `targetLabel` (case-insensitive contains) to the `OR`.
- **No filters for severity, status or module**, though all three are
  sortable. A "warnings and failures only" view needs `severity` and
  `status` filters.
- **`targetId` filter must be a UUID**, but the column is `VarChar(50)`
  and business settings use `"1"`, so their history can't be filtered. Accept
  any string up to 50 characters.
- **No staff list to filter by.** `GET /admin/account` is a stub, so the
  viewer can only filter by a staff member by clicking their name in the
  log. A list of admin profiles (id, name) would allow a "Staff" filter.
- **Labels repeat the action.** `targetLabel` is "Project Updated: Riverside
  Farms" rather than the record's name. The viewer strips everything before
  the first ": ". Storing only the name would be cleaner.
- **Entries hold personal data.** Investor entries keep the whole profile
  (email, phone, address, nominee) in `oldValue`/`newValue`, and every entry
  stores IP address and browser. The viewer shows them to admins, as the
  API returns them. Worth deciding how long entries are kept.

### Investor payouts (found while building the investor's payout view)
`/dashboard/profit` and `/dashboard` in secure-web now show each month as
"Awaiting payout", "Being paid" or "Paid", group months into payouts, and
say when the next payout is due. All of it comes from the investor's own
`GET /monthly-profit-ledger` rows: `payoutStatus` plus `disbursementItemId`
(the default Prisma select happens to include it). Please keep that field
in the response, or the "Being paid" step and the payout list disappear.

What investors still can't see, because no investor endpoint returns it:
- **The note staff write for the investor.** `DisbursementItem.investorNote`
  is described as "shown to the investor", and the admin screens let staff
  write it, but no investor route returns it. Add `GET
  /disbursement-item` (scoped to the signed-in investor) with `id`,
  `amount`, `reason`, `investorNote`, `isDisbursed`, the account it went to
  (bank name and last 4 digits of the snapshot account number only), and
  the batch's `batchDate` and `status`. Leave out `remarks`, which is
  internal.
- **When a payout was paid.** Nothing records the date a batch is
  confirmed (`DisbursementBatch` has no `confirmedAt`, and items have no
  `disbursedAt`), so the investor's payout list has no date column. Add
  `confirmedAt` on the batch, set when it moves to `confirmed`.
- **No notification to the investor.** Confirming a batch doesn't create an
  investor notification. Investors would want "৳X profit paid to your
  account ending 1234".
- **The due rule is copied in the frontend.** "Paid once 3 months have
  built up" uses a copy of `CYCLES_PER_DISBURSEMENT` (monthly 1, quarterly
  3, half-yearly 6, yearly 12) in `apps/secure-web/lib/payout-progress.ts`.
  If the rule changes, change both, or return the next due date on the
  investment.
- The half-yearly and yearly crash in the Payouts section below also means
  those investors would sit at "Ready: it goes into the next payout window"
  with nothing happening.

### Referrals (found while building the admin referral screens)
The screens are at `/admin/referrals` (referrals and bonuses) and
`/admin/referrals/codes`, plus a Referrals card on each investor's admin
page.

- **Investors can't see their own code.** The investor endpoints are
  placeholders: `GET /refferal-code` returns "HelloWorld", and
  `GET /refferal-code/:id` and `GET /referral/:id` return text.
  `POST /refferal-code` creates a code but returns `data: undefined` (the
  transaction callback returns nothing), and doesn't check the investor is
  approved. The portal needs "my current code" (code, expiry, used or not).
  `GET /referral` (the people I referred) works. The route is also spelled
  `refferal-code`.
- **A code works once, and no new one follows.** `ensureReferralCode` runs
  only on approval, so once an investor's code is used they have no usable
  code (tested: the admin page shows "None ready to use"). Issue a new code in
  the signup transaction that uses the old one, or let staff issue one.
- **A replaced code gives a misleading error.** Signup checks
  `isUsed && isActive`, so an unused but inactive (replaced) code passes.
  The conditional update then matches nothing and returns 409 "This referral
  code was just used by someone else. Please retry." Retrying can never
  work. Tested. Check `isUsed || !isActive` and say the code is no longer
  valid.
- **Expiry is stored in Bangladesh clock time; the other timestamps are
  UTC.** `expiresAt` defaults to `now() AT TIME ZONE 'Asia/Dhaka' + 1 year`
  in a zoneless column, and signup compares it with `getDhakaNow()`, so it
  works (tested with a code that expired 3 hours ago by Dhaka clock).
  `createdAt` and `usedAt` are real UTC. The screens show `expiresAt`'s
  digits as they are, and send "valid through D" as `D T23:59:59` in the
  same form. If you change how it's stored, tell the frontend team.
- **Recording a bonus doesn't pay it, and there's no record of payment.**
  `Referral` has `bonusPercent` and `bonusAmount` only: no paid flag, date
  or who-recorded. The `referral_bonus` disbursement item type exists, but
  nothing creates those items, so bonuses can't go through payouts. The
  screen says payment happens outside the platform for now.
- **What is the bonus based on?** Nothing computes `bonusAmount`. The form
  shows "rate × the referred investor's activated investments to date" as a
  reference only, with a button to use it. Please confirm the rule (first
  investment only? capped? when is it due?), ideally computed by the API.
- **Bonus fields can't be cleared**, and there's no filter for "no amount
  yet" (`bonusAmount` null). The admin overview counts them as "every
  referral minus `minBonusAmount=0`", and the list's "Bonus not recorded"
  filter reads every referral (paged at 100) and filters in the page. Add
  `hasBonus=false`.
- **The list needs the referred investor's status and investment.**
  `REFERRAL_LIST_SELECT` has only names, so the page reads each referred
  investor separately (up to 20 requests). Add `status` and
  `totalInvestmentAmount` to the `referredInvestor` select.
- **The 1% rate is hard-coded** at signup (`bonusPercent: 1.0`), not read
  from settings.
- **Moderators can change bonus amounts and code expiry** (the API allows
  ADMIN and MODERATOR on both PATCH routes). The screens follow the API.
  Confirm moderators should be able to.

### ROI calculator leads (found while building the admin leads screen)
The screen is at `/admin/leads`, with a "ROI leads to follow up" card on the
admin overview.

- **No `followedUp` filter on the list.** `GET /admin/roi-calculator-lead`
  can sort by `followedUp` but not filter on it. The "Not followed up" view
  and the overview count work around this: they sort by `followedUp`, read
  pages of 100 and stop at the first lead in the other state. That costs
  one extra request per 100 open leads on every overview load. Please add
  `followedUp: queryBooleanSchema.optional()` to
  `roiCalculatorLeadQuerySchema` and the `where` in `findAll`. The frontend
  will then switch to a single request.
- **Delete doesn't delete.** `DELETE /admin/roi-calculator-lead/:id` returns
  "removed successfully" without touching the database. The screen doesn't
  offer delete. Either make it work (admins only, with an audit entry) or
  remove the route, so a later caller isn't misled.
- **Follow-up isn't audited, and there's no record of who or when.** The
  `LEAD` audit action exists in the contracts, but `update` doesn't write an
  entry, and the row has no `followedUpAt` or `followedUpBy`. If the team
  needs to know who called a lead, add those (or write an audit entry), and
  the screen will show them.
- **Sort by amount.** `sortBy` doesn't include `enteredAmount`. Sales would
  likely want the biggest leads first. Please add it, and the screen will
  offer it.

### Payouts (found while building the admin payout screens)
The screens are at `/admin/payouts` in secure-web. They work around these
for now; each workaround is noted.

**Bugs. Please fix these first.**
- **Preparing payout items fails for half-yearly and yearly investments.**
  `DisbursementItemService.createDisbursementItem` takes `rows.slice(0, 3)`
  instead of `rows.slice(0, cycles)`. When a half-yearly investment has its
  6 months, `chosenRows[cycles - 1]` is undefined, `buildReason` throws, and
  `POST /admin/disbursement-item` returns 500 (`TypeError: Cannot read
  properties of undefined (reading 'cycleEnd')`). Items made earlier in the
  same run stay saved, because each item has its own transaction. Tested on
  a local database.
- **Overdue monthly profit gets the wrong label.** For the same reason, a
  monthly investment with 3 unpaid months becomes one item for all 3 months
  (৳3,600 in the test), but its reason says one month ("11 Aug to 10 Sep").
  Decide whether a run pays every unpaid month or one period's worth, and
  make the amount and the reason agree.
- **Items can go into a batch of the other kind.** `PATCH
  /admin/disbursement-batch/items` doesn't check that each item's
  `exportFormat` matches the batch's `exportType`, so a CBL item can go into
  a BEFTN batch. The screens only offer matching items, warn on a mixed
  batch, and refuse to build its file.
- **An item's batch can be changed after the batch is sent.**
  `PATCH /admin/disbursement-item/:id` with `batchId` doesn't check the
  batch status (old or new), so an item can leave an exported batch or join
  one (from reading the code; not tested). The screens only offer removal from drafts, and add through
  `/disbursement-batch/items`, which does check.
- **Date comparison on batch update never matches.** In
  `DisbursementBatchService.update`, `batchDate.toString().slice(0, 10)` is
  "Sat Nov 21", not an ISO date, so sending any `batchDate` on an exported
  batch counts as a change and asks for a new `fileUrl` (from reading the
  code; not tested). Use `toISOString()`. The screens don't change batch dates.

**Missing endpoints.**
- **Building the bank file.** There's no CBL or BEFTN file export, only a
  `fileUrl` to store. secure-web builds a CSV at
  `/admin/payouts/batches/:id/export` from the batch's items (name, account,
  type, bank, branch, routing, amount, narration, reference). **Its columns
  are a guess, not the banks' templates.** Please build the file on the API
  in the format City Bank and the BEFTN portal accept. Store it on the batch
  (`fileUrl`) and audit-log it, so a batch's paid file is kept on record.
- **Completing a payout window.** `PayoutWindowStatus.completed` and
  `completedAt` exist, but nothing sets them. Add an endpoint, or complete
  the window once all of its batches are confirmed.
- **Reading one window or batch.** There's no `GET /admin/payout-window/:id`
  or `GET /admin/disbursement-batch/:id`, and the batch list can't filter by
  `windowId`. The screens read every window and batch (paged at 100) and
  filter in the page.
- **Items not in a batch.** `GET /admin/disbursement-item` can't filter on
  `batchId = null` or `isDisbursed`. The screens read every item and filter
  in the page. That now includes the admin overview, on every load, so this
  gets slower as items pile up (it stops at 5,000 and says the count may be
  short). Add `unbatched=true` (or `batchId=none`) and `isDisbursed`.
- **One window per month?** A comment says `periodMonth` is "the unique key",
  but there's no unique constraint, so two windows for one month are
  accepted. The form warns but allows it. Add the constraint if a month
  should have only one window.

**Smaller things.**
- Window create allows an end date on the start date; update requires the
  end after the start. The forms follow each rule.
- `POST /admin/disbursement-item` returns 404 when nothing is due. That's
  not an error; return 201 with `created: []`.
- The run's admin notification links to `/admin/disbursement-item`; the
  screen is `/admin/payouts/items`. The profit run links to
  `/admin/monthly-profit-ledger` and `/admin/monthly-rate-setting`; those
  are `/admin/rates` for rates, and there's no ledger screen yet.
- `GET /admin/monthly-profit-ledger` is a placeholder (returns
  "HelloWorld"), so there's no admin view of accrued profit yet.
- Moderators can create batches, add items, mark them sent and confirm
  payment; only deleting a batch and managing windows are admin-only. The
  screens follow the API. Confirm moderators should be able to confirm
  payouts.
- `investorNote` is `VarChar(500)` in the database but limited to 255 in
  `disbursementItemRemarkUpdateInputSchema`.

### Projects, rates and settings (found while building the admin screens)
The admin screens work around these for now; each workaround is noted.

- **The public project list includes hidden projects.** `GET /project` returns
  hidden, inactive and draft projects unless the caller passes the filters.
  The investor form filters, but anyone calling the endpoint directly can see
  hidden projects. Default it to `OPEN` + `isActive` + `isVisible`.
  `GET /project/:id` has the same issue.
- **The fixed rate can't be changed after creation.** `PATCH /admin/project/:id`
  drops `projectRate` (it's missing from the destructured fields in
  `ProjectService.updateInvestor`). The edit form shows the rate read-only.
- **Fixed-rate investments in a project with no fixed rate are stored at 0%.**
  This is the investor path (`resolveInvestmentTerms`). The staff path falls
  back to `BusinessSettings.rate`. Options: use the same fallback, refuse a
  fixed investment when the project has no rate, or add `projectRate` to the
  public project fields so the investor form can hide "Fixed rate" (it can't
  tell today).
- **Optional fields can't be cleared.** `maximumInvestment`, `targetAmount`,
  `endDate`, and `rate` in business settings can be changed but not removed;
  the API doesn't accept `null`. The forms say so instead of sending a blank.
- **Rates of 10% or more give a 500.** `ratePercent`, `projectRate` and
  `BusinessSettings.rate` are `Decimal(3,2)` (max 9.99), but `percentSchema`
  accepts up to 100. Tighten the schema, or widen the columns if rates of 10%
  or more are possible. The forms cap rates at 9.99.
- **Project names aren't unique.** `create` catches P2002 for a duplicate
  name, but there's no unique constraint, so duplicates are created.
- **Creating a project doesn't return it.** `POST /admin/project` returns only
  a message, so the form can't open the new project; it shows the list
  filtered to the new name. Return `data: { id }`.
- **Create checks less than update.** On create, `endDate > startDate` and
  `targetAmount >= minimumInvestment` aren't checked (update checks both).
  The form checks them.
- **Counting delay: 0 is allowed on create, refused on update.**
  `countingStartAfterDays` is `min(0)` on create but reuses the 1–28 day rule
  on update. The form asks for 1–28.

### Withdrawal endpoints
The investor and admin `withdrawal-request` controllers are placeholders that
return dummy text. The frontend needs:
- **Investor:** list their own requests, create one, and cancel one.
- **Admin:** list requests, approve one (with an optional notice override and reason), reject one, and mark one paid.

The schema and the ROI calculation (`roi-schedule.util.ts`) are already on
`main`.

### Auth guards on placeholder controllers
These controllers have no `JwtAuthGuard` or `RolesGuard`. None of them touches
the database yet, but each needs a guard before it does:
`admin/admin`, `admin/investment-document`, `admin/investor-kyc-document`,
`admin/withdrawal-request`, `investment-document`, `investor-bank-account`,
`investor-kyc-document`, `nominee`, `notification`, `withdrawal-request`.

### Migration history on staging
`main` deleted and renamed some older migrations (for example the
`fixed_rate_*` ones). Before deploying, run `prisma migrate status` against
staging. Databases that already applied the old migrations will report drift.
