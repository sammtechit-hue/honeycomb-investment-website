# Browser checklist

A click-through of the secure-web screens built on `feature/verficationpage`.
The automated tests already cover what the server sends back: counts,
filters, permissions and the bank file's contents. This list covers what only
a browser shows: forms, buttons, inline editors, downloads, layout on a
phone, and console errors.

Tick items as you go. Note anything odd next to the item.

## Before you start

- [ ] The test stack is running: web on <http://localhost:3102>, API on port
      3101, Postgres on port 5544.
- [ ] Reset the payout data so the payout screens start from a known state.
      In Git Bash (the database password is in the test stack's
      `api.env.sh`):

      ```sh
      S=C:/Users/Naim/AppData/Local/Temp/claude/9adf623d7161d5ae
      export PGPASSWORD=$(grep -o 'tester:[^@]*' $S/7538874e-6805-4dc4-87fa-390070d2a5b6/scratchpad/api.env.sh | cut -d: -f2)
      "C:/Program Files/PostgreSQL/18/bin/psql.exe" -h localhost -p 5544 -U tester -d ip_test \
        -f $S/5e33d6ba-e117-4fea-905d-e9acc04f04cd/scratchpad/payout-fixtures.sql
      ```

      These are temporary folders. If they've been cleared, ask Claude to
      rebuild the test stack.
- [ ] Open the browser's developer tools and keep the **Console** tab visible.
      Any red error on any page counts as a failure.
- [ ] Use two browser profiles (or one normal and one private window) so you
      can be signed in as staff and as an investor at the same time.

**Logins** (password in brackets):

| Who | Sign in at | Login |
|---|---|---|
| Admin | `/staff/login` | `admin@honeycomb.test` (`Demo@1234`) |
| Moderator | `/staff/login` | `moderator@honeycomb.test` (`Demo@1234`) |
| Approved investor, no profit | `/login` | `01700000002` (`Demo@1234`) |
| Investor A (City Bank) | `/login` | `01792122452` (`Flow@Test1234`) |
| Investor B (other bank) | `/login` | `01794438244` (`Flow@Test1234`) |

Sign-in is limited to 10 attempts a minute. If a login suddenly fails, wait a
minute.

**On every page**, also check:
- [ ] No console errors.
- [ ] At phone width (developer tools → device toolbar, 375 px wide): no
      sideways scrolling of the whole page. Wide tables scroll inside their
      card, the nav still opens, and forms stack into one column.

---

## 1. Investor application

Use a new phone number and email for signup (for example `0170000xxxx` with
digits you haven't used).

- [ ] `/signup`: submit empty. Each required field shows its own message.
      Fill it in and submit; you land on the application.
- [ ] `/verification` step 1, **Personal info**: leave a required field
      empty and press Next. You stay on the step and the field is marked.
- [ ] Steps 2–4, **Nominee**, **Bank details**, **Investment**: Back and
      Next keep what you typed. The step indicator shows where you are.
- [ ] **Bank details**: switch between City Bank and another bank. The
      fields that change make sense, and nothing you typed is lost
      unexpectedly.
- [ ] **Investment**: the project list, amount and payout schedule. An amount
      under the project's minimum is refused with a clear message.
- [ ] Step 5, **Documents**: upload NID front, NID back and a photo. Each
      shows a preview. A file that's too large or the wrong type is refused
      with a message. Replacing a file works.
- [ ] Submit. The page now shows the application under review, with nothing
      editable.
- [ ] Reload the page: still under review, same details.
- [ ] Try `/dashboard`: you're sent back to the application.

**Sending it back (admin, second window):**
- [ ] `/admin` → "Investors to verify" → open the new investor.
- [ ] Reject with a 3-character reason: refused (needs 5–500 characters).
      Reject with a proper reason: confirm step, then the status changes.
- [ ] Investor window, reload `/verification`: the reason is shown with a way
      to edit the application.
- [ ] `/verification/edit`: everything you entered is filled in. Change one
      field and resubmit. It's under review again.

**Approving it (admin):**
- [ ] Open the investor again. The page no longer shows the earlier
      rejection (resubmitting clears the reason); **History** still lists
      "Investor status changed" with the reason in its before/after. Enter
      the NID number, approve, and confirm.
- [ ] Investor window, reload: you're taken to `/dashboard`.

## 2. Investor portal

Sign in as **Investor A**.

- [ ] `/dashboard`: four stat cards, "My investments" and "Recent profit".
      The "Invest" button shows only for an approved account.
- [ ] `/dashboard/investments`: list, and open one. The pay page
      (`/dashboard/investments/[id]/pay`) shows only for an investment that
      still needs a payment.
- [ ] `/dashboard/invest`: the form checks the minimum amount, and the
      payout schedule must fit the investment period.
- [ ] `/dashboard/profile`, `/profile/edit`, `/profile/bank`: after saving,
      the page says clearly whether the change applies now or waits for
      staff approval.
- [ ] `/dashboard/security`: change password. A wrong current password gives
      a message, not an error page.

**Profit and payouts** (after resetting the payout data, see above):
- [ ] `/dashboard/profit`: "Next payout" lists both investments as
      "Ready: it goes into the next payout window." Under the table: "Payouts
      go to your City Bank Limited account ending 0123", with a Profile link
      that works.
- [ ] "Payouts" says there are none yet. The monthly rows all say
      "Awaiting payout".
- [ ] The year and investment selects, then Apply: the URL and the tables
      change together.
- [ ] Sign in as **Investor B**: the quarterly investment says "2 of 3
      months built up. Paid after 1 month more."
- [ ] Sign in as `01700000002`: every card shows its empty state, with no
      broken layout.

Keep Investor A open; section 4 comes back to it.

## 3. Admin: investors, investments, payments

Sign in as **Admin**.

- [ ] `/admin` overview: three sections (Investors and payments, Payouts,
      Referrals). Every card opens a list that shows what it counted.
- [ ] `/admin/investors`: search and status filter. Open an investor: the
      Profile, Investments and Referrals cards, and a **History** button.
- [ ] `/admin/investments`: open a pending one and activate it (confirm
      step). The status badge updates without a full reload.
- [ ] `/admin/payments`: confirm a pending payment.
- [ ] `/admin/change-requests`: open one, approve one and reject one.

## 4. Admin: payouts

Start after resetting the payout data.

- [ ] `/admin/payouts/items`, "Monthly profit run" card: on any day but
      the cycle day it shows the next run date and a greyed-out button. To
      try the real button, set the cycle day to today's date in
      `/admin/settings` first (and set it back afterwards). Then press the
      button: a confirm step appears with the cycle and the number of
      investments, Cancel closes it, and confirming shows how many rows were
      created. "Already run for this cycle" and "Recent runs" appear.
- [ ] `/admin/payouts/items`: press the prepare button. A message says 3
      created and 1 skipped, with the reason ("needs 3 cycles, has 2").
      Press it again: nothing new.
- [ ] The items list shows "Not in a batch" on each. The account name
      `=Rahim "Test" Uddin` shows exactly like that.
- [ ] Filters: "Not in a batch", "BEFTN only", search "Karim". Clear resets
      them.
- [ ] Item notes: open the editor, type a staff note and a note for the
      investor, save. Cancel closes without saving.
- [ ] `/admin/payouts`: open a window for **November 2026**. Pick a month
      that already has a window: a warning shows, but you can still save. An
      end date before the start date is refused in the form.
- [ ] On the window page: change the last payout day. Then create a **CBL**
      batch.
- [ ] Batch page: the "Add CBL items" table lists only Karim's two items.
      Select all shows the selected total (৳ 2,700). Add them.
- [ ] Download the bank file. A `.csv` file downloads with a sensible name.
      Open it in Excel: a header row and two item rows in the right
      columns, amounts with 2 decimals.
- [ ] "Mark as sent to bank": a confirm step warns that items can't be added
      or removed after this. Confirm. The add-items table disappears.
- [ ] Investor A window, reload `/dashboard/profit`: both payouts say
      "Being paid", with "Being paid now" lines under "Next payout".
- [ ] Admin: "Confirm payment" (a confirm step says it can't be undone).
      The batch shows "Paid".
- [ ] Investor A, reload: both payouts "Paid", and "Profit paid" is ৳ 2,700
      on the profit page and on `/dashboard`.
- [ ] Create a **BEFTN** batch, add Rahim's item, then remove it again. It
      goes back to "Not in a batch". Delete the empty draft batch.
- [ ] `/admin/payouts/batches`: the status and bank-file filters.
- [ ] `/admin` overview: the payout cards match what you just did.

## 5. Admin: referrals

- [ ] `/admin/referrals`: the "Bonus not recorded" and "Bonus recorded"
      filters.
- [ ] Bonus editor:
  - [ ] A rate over 100 or with 3 decimals is refused.
  - [ ] "Use it" fills in the suggested amount.
  - [ ] Saving updates the row.
  - [ ] Emptying a saved amount isn't accepted (the API can't clear it).
- [ ] `/admin/referrals/codes`: change a code's "valid through" date. A date
      before today is refused.
- [ ] From an investor's page, follow "Has referred": the list shows only
      the people they referred, with "Show everyone".

## 6. Admin: projects, rates, settings

- [ ] `/admin/projects/new`: create a project. The form refuses an end date
      before the start, and a target below the minimum investment.
- [ ] Project page: edit details, set a monthly rate, and use **History**.
- [ ] `/admin/rates`: set and change a rate.
- [ ] `/admin/settings`: the counting delay accepts 1–28 only.

## 7. Admin: audit log

- [ ] `/admin/audit`: the newest entry is your own latest action or sign-in,
      in Bangladesh time.
- [ ] Each filter (search, action, record type, from/to date). An end date
      before the start shows "Dates ignored".
- [ ] Click a staff name: only their actions, with "Show everyone".
- [ ] Open an entry for a change (for example "Payout window changed"):
  - [ ] The changed field is shown with before and after.
  - [ ] "unchanged fields" opens and closes.
  - [ ] The raw JSON sections open and close.
- [ ] The "Every entry for this record" link and the record link both work.
      An entry for a deleted project has no record link.
- [ ] **History** buttons on investor, investment, project, payout window
      and batch pages open the right record's history.

## 7a. Admin: ROI calculator leads

The test database has 230 made-up leads ("Test Lead 001" to "230"): 130 not
followed up and 100 followed up.

- [ ] The sidebar has **ROI leads**. The overview has a "ROI leads to follow
      up" card with the right count, and it opens the "Not followed up" list.
- [ ] `/admin/leads`: newest first, 20 a page. Phone and email are links;
      clicking the phone opens the dialer (or asks to).
- [ ] Filters: "Not followed up" and "Followed up", search by name, email and
      phone (try `+880 1711-223344` style too), a min/max amount, and each
      sort. A minimum above the maximum shows "Amount range not applied".
      Clear resets everything.
- [ ] **Mark followed up** on a row: the button says "Saving…", then the row
      shows "Followed up" with **Undo**. In the "Not followed up" view the
      row leaves the list. **Undo** puts it back. The overview count changes
      with each.
- [ ] Click **Mark followed up** twice quickly: only one change happens.
- [ ] On a phone-width window the table scrolls sideways and the filters
      stack.

## 8. Moderator

Sign in as **Moderator**.

- [ ] **ROI leads** is in the nav, and marking a lead followed up works.

- [ ] The nav has no "Audit log". Opening `/admin/audit` directly shows "Only
      admins can see the audit log", not an error page.
- [ ] No **History** buttons on record pages.
- [ ] The payout screens work for reading. Creating or editing a payout
      window and deleting a batch aren't offered.
- [ ] Projects, rates and settings are read-only.

## 9. Sessions

- [ ] Leave an admin tab idle past the session length (or delete the access
      cookie in developer tools), then click a link. You're signed back in
      silently, or sent to sign in and then back to the same page.
- [ ] Sign out from the menu. The browser's back button doesn't show admin
      data.
- [ ] An investor opening any `/admin` URL is refused. A staff account
      opening `/dashboard` is refused.

---

## Found problems

| Page | What you did | What happened | What you expected |
|---|---|---|---|
| | | | |
