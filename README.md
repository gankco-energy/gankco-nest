# GANKCO Nest: version 3.0.10 (phone notifications and emails for every bell notification)

*Built to support engineered solutions.*

## Where things live

- **Website:** nest.gankcoenergy.com, hosted on GitHub Pages from **github.com/gankco-energy/gankco-nest** (organization owned by the Nest Gmail; Ehis is also an Owner).
- **Database and sign-in:** Supabase project in the **GANKCO Energy Services** organization (Nest Gmail; Ehis also an Owner).
- **Emails:** sent by Brevo from **nest-alerts@gankcoenergy.com** as "GANKCO Nest". Sign-in emails use Supabase's custom SMTP (templates in Supabase → Authentication → Emails → Templates). Alert emails use the Brevo API key saved in Supabase Vault as `brevo_api_key`, on a schedule (pg_cron).
- **DNS (company IT):** `nest` CNAME → `gankco-energy.github.io`, plus the Brevo verification records.

## Install 3.0.10 (about 8 minutes)

3.0.9 must already be installed.

1. **Supabase → SQL Editor:** open a **New query**, paste the whole of **`26-nest-v3.0.10-upgrade.sql`**, press **Run**. It ends with **Nest 3.0.10 installed**. It is all-or-nothing and safe to run again.
2. **Supabase → Edge Functions → Deploy a new function → Via Editor:**
   - Name it exactly **`nest-push`**.
   - Delete the sample code, paste the whole of **`nest-push/index.ts`**, and press **Deploy function**.
   - Open the function's **Details** (or Settings) and switch **off** "Verify JWT with legacy secret" / "Enforce JWT verification". Save.
   - You don't add any secret or key. The function makes its own sending keys the first time it runs and keeps them inside Supabase.
3. **GitHub:** unzip **`gankco-nest-v3.0.10.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file. (New files: `sw.js` at the top level, `js/push.js`, `brand/badge-96.png`.)
4. Reload Nest (**Ctrl + Shift + R**). The footer says **v3.0.10**.
5. **Try it on your phones:**
   - **Android (Chrome):** sign in. Tap **Allow** on the "Get Nest notifications on this phone" card, then **Allow** on the phone's question. In **My account → Notifications** press **Send me a test**.
   - **iPhone:** open Nest in Safari, tap **Share → Add to Home Screen**, open Nest from the new icon, sign in, tap **Allow**, then **Send me a test**.
6. **Nest settings → Phone and email notifications** shows the emails sent today, people waiting, and whether phone sending is ready.

### What's new in 3.0.10
- **Every bell notification goes to the phone straight away**, in every app (PeopleCore, JobTrack, Purchase Order, Inventory):
  - on the lock screen and as a banner, like WhatsApp; tapping it opens that page in Nest;
  - the Nest icon shows the unread count where the phone supports it;
  - **Android:** works from Chrome. **iPhone:** only when Nest is added to the Home Screen and opened from that icon (Apple's rule).
- **Asking to allow:**
  - after signing in on a phone, a card asks to allow notifications; *Not now* asks again after 4 days;
  - on an iPhone in Safari, the card shows the Add to Home Screen steps instead;
  - computers are never asked, but can be switched on in My account.
- **Every bell notification also comes by email:**
  - one email per person every 15 minutes, listing what's new, each with an **Open** link;
  - emails for notifications already read in Nest are skipped;
  - payslips, announcements, invitations and scheduled reports keep their own emails (no second one), and JobTrack's ticket email is now part of the notification email.
- **Brevo's 300 a day:**
  - Nest keeps 30 for Supabase's sign-up and password emails and uses up to 270;
  - every Nest email counts, payslips and alerts included;
  - when the day runs out, the rest wait for the next day, the most important first (approvals, items sent back, payslips, HSE to fill);
  - anything waiting 3 days is dropped, since it's already in the bell and on the phone;
  - change the numbers in Nest settings if the Brevo plan changes.
- **My account → Notifications:** "Email me my Nest notifications" (on to start), "Notifications on this phone", your devices (with Remove), and **Send me a test**. Signing out of a phone stops its notifications.
- **Inventory, every app covered:**
  - a materials request (or item changes or kit details) waiting for approval is now told to the line's approvers the moment it's sent;
  - **a 07:30 morning summary** goes to the phone and by email, one per person and only if there's something: count opening or late, certificates and kits expiring, items overdue, receipts to confirm, requests waiting, the monthly backup;
  - people who already get Inventory's own 7:30 alert email (Monday to Friday) get only the phone summary, not a second email.
- **Date reminders** (PeopleCore → Performance settings → **Reminders**, sent at 08:00):
  - before an appraisal or review opens (staff told it's coming, HR reminded to open it) and on the opening day;
  - before it closes and on the closing day (to whoever still has a step);
  - before the objectives deadline and on it;
  - before a survey is due and on the due date.
  - Contract and probation endings and JobTrack's evening reminder now reach the phone and email too.

## Install 3.0.9 (about 3 minutes)

3.0.8 must already be installed.

1. **Supabase → SQL Editor:** open a **New query**, paste the whole of **`25-nest-v3.0.9-upgrade.sql`**, press **Run**. It ends with **Nest 3.0.9 installed**. It is all-or-nothing and safe to run again.
2. **GitHub:** unzip **`gankco-nest-v3.0.9.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
3. Reload Nest (**Ctrl + Shift + R**). The footer says **v3.0.9**.
4. **Nest settings → Apps in testing:** check the testers. Your old maintenance testers are now testers of Inventory, Purchase Order and JobTrack (and of PeopleCore only if it was already open). Put **JobTrack** in *Testing* if you want only certain people in it for now.
5. **JobTrack → JobTrack settings → Jobs:** set the **next job number** if it should not carry on from the last one, and choose who can start a job.
6. **On each job's crew**, tick **HSE** for the HSE person on board. They need JobTrack as an **Engineer**.

### What's new in 3.0.9
- **Activities with a start time only.** Each activity runs until the next one starts; the last one until **Day ended at** (left blank until the crew stops; usually 18:00). A **Now** button fills the current time, rows keep themselves in time order, and a time before the day's start counts as after midnight.
- **The Daily Operations Summary writes itself** from the activities (the work steps, without routine lines like arrival, PTW/JHA, housekeeping and departure, and without the readings at each depth). It can be edited; edits are kept unless someone presses **Rebuild from activities**.
- **The DOR is GANKCO's own sheet.** Excel and PDF follow the team's General DOR template exactly (same columns, fonts, borders, layout and logo places, client logos top left, GANKCO top right), with no Nest marks. Times are written the DOR way (6.00, 7.25, total 1.25). Long activities carry onto the next rows as the team does. The PDF is one A4 page, like printing the sheet with *fit on one page*; photos are added as extra pages only when asked. Each report has its own **Excel** button; the job's Excel holds one sheet a day, named like the team's (19-7-26).
- **HSE filled by the HSE person on board.** Tick HSE on the crew. That person is told when a report opens, sees *HSE section to fill* on the overview, and fills just that part (man-hours, TRI, LTI, HSE comment). The report **can't be sent until HSE is filled**. The lead can **Remind** them, or **Fill it myself** on their behalf (recorded as such). Jobs with no HSE person in Nest work as before.
- **WhatsApp copy in the group's format:** bold title (set per job, e.g. *Update on {well} TTSHO Operation Update - OML30*), bold date (*27th July, 2026*), activity bullets with no times, then *Weather Condition*. Copy this day, picked days or the whole well so far, and paste the latest version after each new activity. No equipment, HSE or POB. A **Weather condition** box on the report feeds it (it is not on the DOR).
- **Engineers can start a job** (JobTrack settings → Jobs: any engineer, or operations managers only). They lead the job, and the operations managers get a notification. They can add a new client by name. **Leads manage their job's crew and ticket items**, and edit its details.
- **Copy crew and ticket items from another job**, when starting a job or from the job's crew panel. POB on a new report is counted from the crew.
- **Next job number** in JobTrack settings. It can't go below a number already used, and numbers carry on into a new year (only the year changes).
- **Apps in testing** (Nest settings): PeopleCore and JobTrack can each be in *Testing* with their own testers; everyone else sees that the app is being tested. Each app's testers can also use it while it is under maintenance. This replaces the PeopleCore *under construction* switch and the single maintenance testers list.

## Install 3.0.8 (about 3 minutes)

3.0.7 must already be installed.

1. **Supabase → SQL Editor:** open a **New query**, paste the whole of **`24-nest-v3.0.8-upgrade.sql`**, press **Run**. It ends with **Nest 3.0.8 installed**. It is all-or-nothing and safe to run again.
2. **GitHub:** unzip **`gankco-nest-v3.0.8.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
3. Reload Nest (**Ctrl + Shift + R**). The footer says **v3.0.8**.
4. **Give people JobTrack** on *Nest admin → Team & access*: tick **JobTrack** and choose **Admin** (operations managers), **Engineer** (field crew) or **Viewer** (management).
5. **In JobTrack → JobTrack settings**, choose who approves tickets (if nobody is ticked, every JobTrack Admin can).

### What's new in 3.0.8: JobTrack
A new app on the home screen, right after Inventory. It holds field jobs, the Daily Operation Report, the Operations Breakdown and unpriced tickets. **There are no prices anywhere in JobTrack**: BD prices tickets in PFI & Quote (next releases).
- **Roles:** Admin (operations managers: set up jobs, clients, crew and ticket items; review reports; approve tickets), Engineer (daily reports and tickets on the jobs they're crew on; they see only those jobs), Viewer (management: sees everything, changes nothing).
- **Jobs:** numbered `GES-JT-OPR-0001-2026` and so on. Each job has a client, client PO, project, field and wells (engineers add wells as the crew moves), lead engineer, crew (Nest users, or typed names for subcontractors), equipment groups (Slickline, TTSC, Crane by default), and the ticket items it will use. Status: Planned, Mobilised, On location, Demobilised, Closed.
- **Daily Operation Report** (built for phones, in GANKCO's DOR layout):
  - one report per well per day; on a moving day, the new well gets its own report;
  - Nest counts the report number, days on well and days without LTI;
  - real clock times in the operations breakdown, with hours added up;
  - new **Equipment status** row: each group is Op, Stdby, Mob, Demob or Off for the day;
  - HSE, POB, comments, look ahead and photos;
  - **Copy for WhatsApp** makes a short summary for the operations group;
  - **No signal?** Typing is kept on the phone, and a report saved without signal is sent by itself when the phone is back online;
  - the operations manager marks reports reviewed or sends them back;
  - PDF in the DOR layout (client logos top left, GANKCO top right), and Excel for the whole job (one sheet a day, plus the Operations Breakdown).
- **Operations Breakdown:** built from the reports, day by day, with operating/standby totals per group. Excel and PDF.
- **Tickets** (`…-T01`, `…-T02`), for one well or several and the dates chosen:
  - Nest fills the lines from the job's ticket items and **counts the days from the daily reports** (operating and standby days per equipment group, days on location for feeding and accommodation, mobilisation and demobilisation);
  - any count can be changed, with a reason, which prints on the ticket;
  - lines can be picked from the ticket items list, from Inventory, or typed in (marked *New*);
  - the engineer signs (Nest signature), uploads the copy the client rep signed, and sends it; the approvers get an email from nest-alerts and a notification;
  - the approver adds *New* lines to the list (or matches them to an item) and approves, or sends the ticket back;
  - unpriced ticket as PDF (GANKCO's ticket layout) and Excel.
- **Reimbursables** (`…-R01`): FTO, community and truck in/out payments, in Naira at cost, with receipts. Engineers who make the payments enter them.
- **Ticket items:** the list of everything that can go on a ticket and how each is counted, preloaded with 105 lines from GANKCO's own TTSC, TTSHO and slickline tickets.
- **Clients:** name as shown on reports, address, and up to **3 logos** each (shown top left of the daily report, in the order you choose). A job can use its own logos instead. Heritage (NEPL/SHORELINE/HEOSL OML-30) comes set up with its three logos.
- **Settings:** equipment groups, ticket approvers, approver emails, and an evening "no daily report yet" reminder (off until switched on).
- **Elsewhere:** JobTrack is in Team & access, View as…, the maintenance lock (JobTrack can be locked on its own) and the Audit log.

## Install 3.0.7 (about 3 minutes)

3.0.6 must already be installed.

1. **Supabase → SQL Editor:** open a **New query**, paste the whole of **`23-nest-v3.0.7-upgrade.sql`**, press **Run**. It ends with **Nest 3.0.7 installed**. It is all-or-nothing and safe to run again.
2. **GitHub:** unzip **`gankco-nest-v3.0.7.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
3. Reload Nest (**Ctrl + Shift + R**). Open tabs also show a **Reload** bar. The footer says **v3.0.7**.
4. **Who gets Reports & Analytics:** HR Admin (and Super Admin) have it. To give it to anyone else, add the **Reports** permissions to their role in PeopleCore → System control → Roles.
5. **Scheduled reports are off.** HR switches them on in *Reports & Analytics → Settings* when they want reports emailed.

### What's new in 3.0.7
- **Reports & Analytics** (PeopleCore → Admin → Reports & Analytics, HR admins only), modelled on SeamlessHR's:
  - **Overview:** active staff, joined and left this year, on leave today; five staff charts (active vs inactive, length of service, gender, confirmed vs unconfirmed, generation) that can switch between donut, columns and bars, and show percentages.
  - **Report library:** 76 ready-made reports in 12 modules: SeamlessHR's company, employee, leave, exit, performance, promotion, requisition and disciplinary reports, plus competency gaps, survey response rates, probation and confirmations due, and payroll summaries (payroll ones only for people with payroll permission). Default reports can't be changed: **Duplicate** one to make it your own.
  - **Each report:** a chart and a table, filters (dates, department, location, pay group and more), click any number or bar to see the people behind it, and download as Excel, CSV or PDF.
  - **Create report:** 1 choose a module and its starting data (and related data such as contract, line manager, next of kin, bank), 2 tick the properties, 3 build it: a list, or a summary grouped by one or two things with counts, totals or averages, filters and a chart. Save it to the library.
  - **Dashboards:** each HR admin has their own, with charts and number cards.
  - **Sharing:** HR can share a report with anyone (the MD, managers…). They see it under **PeopleCore → Reports**, read-only, with the latest figures, and can download it. Private details (bank, pay, IDs, contacts) stay hidden from anyone not allowed to see private staff data; HR chooses which fields count as private in Settings.
  - **Scheduled reports** (off until HR switches them on): daily, weekly, monthly or yearly emails to chosen people. The email carries a link to the report in Nest, never the file. Pausing or deleting a schedule removes its recipients' access.
  - **Audit trail:** who viewed, exported, created, changed, shared or emailed which report, and when.
- **Payslips go out when HR says so** (Payroll → Run payroll):
  - **Closing a payroll no longer shows anything to staff.** It locks the month and marks what it paid, so Finance can download the bank and remittance schedules. Staff see nothing yet: no payslip under Pay, no email, no notification.
  - **Send payslips to staff:** a button on the closed payroll. HR presses it when ready, the same day or later. It confirms first (how many people, anyone without an email address, and a warning if PeopleCore isn't open to staff yet), then shows *Payslips sent [date] by [name]*. The payroll list shows *Payslips sent* or *Payslips not sent*.
  - **Each person gets an email from nest-alerts:** "Your payslip for November 2026 is ready", with a **View payslip** button that opens Pay in Nest, plus a notification in Nest. **The payslip is never attached to an email.** Staff view and download it only in PeopleCore → Pay.
  - **Corrections:** if HR reopens a payroll after sending, the payslip is taken back from staff until HR closes it and sends again. That email says "Your revised payslip … is ready".
  - **Past months uploaded from SeamlessHR** show under Pay straight away, without any email.
  - The email can be switched off in *Payroll → Settings* (staff then only get the Nest notification). Payrolls already emailed under 3.0.6 count as sent; any other closed payroll waits for HR to send it.
- **Every download is recorded:** each Excel, CSV and PDF downloaded anywhere in Nest goes into the Audit log as *File downloaded*, with who, which file and from which page.
- **Progress bars** on heavy downloads (all payslips in one PDF, long reports and lists).
- **Sections that open and close:** Team & access, My account, Performance settings, Payroll settings and Report settings now show their sections as bars that start closed (like Nest settings). On the PO overview, *Items bought most* starts closed.
- **The home screen arranges itself:** apps you can open come first, in the order PeopleCore, Inventory, Purchase Order, PFI & Quote; apps not open to you yet follow; an app under maintenance moves to the end and comes back when maintenance ends. When PeopleCore goes live it becomes the first tile on its own.

## Install 3.0.6 (already done, for reference)

3.0.5 and its update must already be installed.

1. **Supabase → SQL Editor:** the upgrade comes in **2 parts**. For **`22-nest-v3.0.6-upgrade-part1.sql`** and then **`part2.sql`**: open a **New query**, paste the whole file, press **Run**. Part 1 ends with *Part 1 of 2 done*; part 2 ends with **Nest 3.0.6 installed**. Each part is all-or-nothing and safe to run again. (If you ran an earlier copy of part 1, run this part 1 again: it brings the new payslip design.)
2. **GitHub:** unzip **`gankco-nest-v3.0.6.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
3. Reload Nest (**Ctrl + Shift + R**). Open tabs also show a **Reload** bar. The footer says **v3.0.6**.

### Setting up payroll (HR, once)
1. **Who can run it:** HR Admin has every payroll permission; Finance can view and download. Give anyone else what they need in *Nest admin → Roles* (module **Payroll**: view, run, reopen, settings, pay records, approve rent relief, upload past payroll, downloads).
2. **Payroll → Settings → Allowances & deductions:** check the seven allowances (Gross pay, Cost of living, Housing (quarterly), Transport, Leave (on request), Meal, Airtime) and their frequency and month. As in SeamlessHR, **tax and pension come from Gross pay only**; the other allowances are add-ons paid on top, with no tax and no pension (each allowance has *Taxed* and *Counts for pension* switches if that ever changes).
3. **Settings → Paygrades:** for each paygrade, set the amounts. Housing 15%, Transport 5% and Leave 20% come pre-set; **fixed amounts (Cost of living, Meal, Airtime) start empty and must be filled in**. *Gross pay* is each person's annual gross pay from their pay record (or the paygrade minimum); percentages are of Gross pay. Use **Also apply to** to copy a grade.
4. **Settings → Company:** pension employer code, WHT payer ID, and the PAYE payer ID for each state you pay into.
5. **Settings → Tax:** the Nigeria Tax Act 2025 bands are loaded (0% on the first ₦800k up to 25% above ₦50m), with pension 8%/10%, NSITF 1%, ITF 1%, rent relief 20% capped at ₦500k. NHF and NHIS are off; switch them on if you deduct them.
6. **Pay records:** fill in bank, BVN, PFA and RSA PIN, tax type (PAYE, WHT for contractors, or none), PAYE state and annual Gross pay for each person (before the add-ons). The quickest way is the new employee upload (below). *Missing details* lists anyone who isn't ready.
7. **Past payroll** (optional): *Payroll → Past payroll → Upload*, one row per person per month, from the SeamlessHR export. These feed year-to-date and the comparison with last month.
8. **Parallel run:** for the first month, run payroll in both SeamlessHR and Nest, then use **Compare with SeamlessHR** on the Nest run with SeamlessHR's payroll export. Check any differences before you switch over.

### The new employee upload
*HRIS → Employees → Upload* now matches SeamlessHR's **Add Employee** template. **Download the general template**, or **Generate your own template** to choose columns (the required ones stay locked). Upload a CSV or Excel file, then **Validate** shows every problem by row and column before anything is saved, then **Process**. The same file adds new staff and updates existing staff (matched on Staff ID); a blank cell leaves that detail as it is.

**Sign-up links:** for new staff with an email, Nest can send a sign-up link. People who already have a Nest account are linked to their record instead, and nobody gets a link twice. You can also send one later from the person's record (*Send sign-up link*).

### What's new in 3.0.6
- **Payroll** (PeopleCore → Payroll): settings for allowances, paygrades, tax, change types, payslips and company IDs; a pay record for each person (own amounts, recurring deductions like loans, rent relief with proof and HR approval, pay arrears); a monthly run that gathers changes on its own (overtime and expenses sent to payroll, leave allowance, loan instalments, arrears from backdated promotions), calculates with workings you can open for each person, compares with last month, and closes.
- **Closing a run** marks what it paid (expenses, overtime, leave allowance, loan instalments), emails each person their payslip as a PDF, and lets staff download it under **Pay** (staff side) for any month. **Reopen** (with a reason) undoes all of that; payslips sent again are marked *revised*.
- **Off-cycle runs** for bonuses or corrections after a month is closed; extra pay is taxed at the person's top rate.
- **Downloads:** bank schedule (plain Excel for now), PAYE by state, pension by PFA, NSITF/ITF, the full report and all payslips in one PDF; year-to-date by person under *Reports*.
- **Payslips:** two layouts like SeamlessHR's: **Payslip** (company address and contacts, job role, bank details) and **Exclusive payslip** (name, employee code, department). Both show earnings and deductions side by side, net pay in words, employer contributions and, on the full one, year to date. Choose, adjust and preview them under *Settings → Payslips*; the company details printed at the top are under *Settings → Company*.
- **Expense and overtime requests:** HR can press **Pay with payroll** so they are paid in the next run.
- **Employee upload** in the SeamlessHR format, with validation and sign-up links (above).

### Still open
- **Bank schedule format:** waiting for HR to confirm the bank's format; it's a plain Excel list until then.
- **Suspension without pay** isn't handled yet; use an *Other deduction* change for now.

## Install the 3.0.5 update (already done, for reference)

3.0.5 is already installed, so this update needs **one SQL file**:

1. **Supabase → SQL Editor:** open a **New query**, paste the whole of **`21-nest-v3.0.5-upgrade-part4.sql`**, press **Run**. It ends with **Nest 3.0.5 installed**. It is all-or-nothing and safe to run again.
2. **GitHub:** unzip **`gankco-nest-v3.0.5.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
3. Reload Nest (**Ctrl + Shift + R**). Open tabs also show a **Reload** bar. The footer still says **v3.0.5**.
4. **Your Gmail as Developer, your work email as staff:**
   1. *Developer tools → Sign-ups → Allowed outside emails:* add your Gmail. The company-email rule stays on for everyone else.
   2. Sign up with the Gmail (in a private window), then approve it in *Nest admin → Team & access* and give it **Staff**.
   3. Signed in as your work email: *Nest admin → Team & access → Transfer Developer* to the Gmail account. Your work email becomes ordinary staff with the apps and roles you choose.
   4. Optional: remove the Gmail from the allowed list afterwards (its account stays).
5. **Past records** (optional, each has a template with notes): *Performance → Appraisals & reviews → Upload past results*; *Onboarding & confirmation → Confirmations → Upload past records*; *Promotions → History → Upload past records*; *Competency → Assessments → Upload past levels*. Past objectives go in through the completed cycle's *Objectives → Upload past objectives*.

### What's new in the 3.0.5 update
- **Inventory servicing:** *Mark serviced* asks for the date it was serviced (today, or earlier). Rules can be 6, 12, 18 or 24 months, or **Custom**: any number of days, weeks or months. When you set a rule (item editor, Change rule, or Edit for several items) you can enter **Last serviced on**, so the clock starts from the real date. The clock runs from the later of last used and last serviced; the date it was added only counts when neither is known.
- **Deletes and edits:** survey categories (rename, delete: their questions stay), survey questions (if nobody has answered), competency categories (if no competency uses them), competencies (if nobody has been assessed; otherwise deactivate), onboarding checklists (people onboarding keep their tasks), tasks in one person's onboarding (edit title, who does it, due date, note; remove), exceptional achievements (the person who added one while it waits; HR any), and **Withdraw** for a confirmation recommendation that is still waiting.
- **Competency:** **Upload** many competencies from Excel (with their levels and the job roles that need them), **Export** the library, and **Add several job roles** at once in the editor.
- **Company → Org chart** keeps the Directory / Org chart / Announcements / Policies / Holidays tabs.
- **Developer tools → Performance & talent:** send an appraisal back to any step or delete it; put objectives back to draft or delete them; delete a period or a cycle with everything in it; reverse an approved confirmation or an applied promotion or salary review; delete a PIP, a competency assessment, an onboarding, or one person's answers to a named survey. Each asks for the person's (or cycle's) name and is kept in the audit trail as a **developer reverse**.
- **Past records:** results, confirmations, promotions and salary reviews, and competency levels from before Nest, marked **Past record**.

## Install 3.0.5 (already done, for reference)

1. **Supabase → SQL Editor:** the upgrade comes in **4 parts** (part 4 is the update above). For each of **`21-nest-v3.0.5-upgrade-part1.sql`** to **`part4.sql`**, in order: open a **New query**, paste the whole file, press **Run**. Parts 1 and 2 end with *Part N of 4 done*; parts 3 and 4 end with **Nest 3.0.5 installed**. Each part is all-or-nothing and safe to run again.
2. **GitHub:** unzip **`gankco-nest-v3.0.5.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
3. Reload Nest (**Ctrl + Shift + R**). The bottom of each page shows **v3.0.5**.
4. **Who can do what:** the new modules' permissions are SeamlessHR's own. **HR Admin** got all of them; **HR Officer** got all except deleting and settings. Pay amounts in promotions and salary reviews are only seen with **View salary amounts** (HR Admin has it). Change roles in **PeopleCore → System control → Roles & permissions**.
5. **Performance** (*Admin → Performance*): GANKCO's setup from SeamlessHR is loaded: the **H1**, **H2** (in progress) and **Probation** cycles, the *Overall Performance* perspective (60%), the four core values (Learning, Team Work, Quality, Integrity, 25% each, 40% of the score), the 1–5 rating scale and the five rating tags. Then:
   - *Appraisal cycles → H2 → Actions → Edit → step 5:* add the **review committee** (Chairman, Scribe, members).
   - Staff set their objectives in *Work → Performance* and send them to their line manager, or HR uploads them (*Objectives → Bulk upload*, template inside).
   - When it is time: *Appraisals & reviews → Open appraisal or review.*
6. **Onboarding & confirmation** (*Admin → Onboarding & confirmation*): check the onboarding checklist (*Checklists*). For staff already on probation, set their probation length or confirmation date in HRIS; they then show in the *Probation tracker*.
7. **Promotions:** *Admin → Approval workflow → Promotion & Salary Review Workflow* is line manager → H.O.D → HR → MD/CEO. The Developer or a Super Admin can change it there. Check that the **H.O.D** and **MD/CEO** reporting lines are filled in (*Company settings → Reporting lines*).
8. **Competency** (*Admin → Competency*): the three categories and the two leadership competencies are loaded. Open each competency and add the **job roles** that need it (required level, severity, time to acquire), then *Assessments → Start assessments*.
9. **Surveys:** the *Onboarding Experience Survey* (sent to new staff 30 days after they start) and the *Performance Review Survey* are loaded. To send the appraisal survey with an appraisal, choose it in the cycle's setup (step 1).
10. Daily jobs are scheduled by the install (pg_cron): probation reminders, promotions on their effective date, survey reminders and the onboarding survey.
11. **PeopleCore** is still **under construction** for everyone except you and the testers (*Nest settings → PeopleCore*). Open it to everyone there when HR is happy.

### What's new in 3.0.5
- **Performance:** appraisal cycles in five steps (dates, Balanced Score Card perspectives and core values with weights that must total 100%, rating tags, score type, review committee). Staff or their line manager set objectives (KPIs with weight, target, number / % / ₦ / rating / yes-no, higher or lower is better); the line manager approves or returns them; staff record progress and comment. HR can bulk upload objectives for a person, department, job role or the whole company, copy them from another cycle, and freeze them.
- **Appraisals and reviews:** self-appraisal, then the line manager's scores (or sending it back), potential and recommendation; 360° ratings of core values by peers (picked from the same location) and subordinates; the review committee approves or changes final scores; the line manager reveals the result with a comment; the employee signs it off (agree or disagree; HR is told of a disagreement). The final score blends the employee's and line manager's scores (line manager 70%), takes off disciplinary performance points, and gets a rating tag. Exceptional achievements, nudges, skip / reset / change reviewer.
- **Improvement plans (PIP):** areas of concern, goals, a default length; the employee accepts or rejects; goals are ticked off; the line manager or HR closes it as passed, extended or not passed.
- **Reports and nine-box:** rating tags, average score by department, the nine-box matrix (final score against potential), and a full export.
- **Onboarding & confirmation:** a checklist starts by itself when HR adds someone (tasks for HR, the line manager and the new starter); the probation tracker with reminders; the end-of-probation assessment in the Probation cycle; confirm / extend / do not confirm through the Confirmation workflow, written to the job history. No letters.
- **Promotions & salary reviews:** raised by the line manager or HR with the new job role, paygrade, department, proposed salary (HR only) and effective date; approved through the workflow; applied on the effective date (job role, paygrade, department, salary, job history), then the employee is told. The employee can't see it while it is being decided. Salary reviews for many people after a cycle.
- **Competency:** categories, the competency library with proficiency levels, the job roles that need each one, assessments (employee, then line manager), and gap analysis by competency and by employee. A cycle can count competency in the appraisal (off by default).
- **Surveys:** question library (short and long text, one or several choices, dropdown, rating 1–5, yes/no, date, number), surveys sent to everyone, departments, job roles or chosen people, an **anonymous** switch (no names kept; results shown only from 3 responses), reminders, results with charts and export. The onboarding survey and the appraisal survey are sent automatically.

## Install 3.0.4 (already done, for reference)

1. **Supabase → SQL Editor:** the upgrade comes in **4 parts** (one file was too big for the SQL Editor). For each of **`20-nest-v3.0.4-upgrade-part1.sql`** to **`part4.sql`**, in order: open a **New query**, paste the whole file, press **Run**. Parts 1–3 end with *Part N of 4 done*; part 4 ends with **Nest 3.0.4 installed**. Each part is all-or-nothing and safe to run again, so if one fails, fix the cause and run that part again before going on. (You don't need to save the queries.)
2. **GitHub:** unzip **`gankco-nest-v3.0.4.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
3. Reload Nest (**Ctrl + Shift + R**). The bottom of each page shows **v3.0.4**.
4. **PeopleCore → System control → Admins:** give HR staff an admin role (HR Admin, HR Officer or Finance, or a role you make under *Roles & permissions*). The 3.0 HR admins and HR officers were moved across automatically.
5. **PeopleCore → Admin → Company settings → Reporting lines:** check who holds **COO** and **MD/CEO**. Then **HRIS → Employees:** check each person's department, job role, paygrade and supervisor (3.0 positions were converted), or upload the SeamlessHR employee export (**Employees → Upload**).
6. **Locked details:** enter each person's annual gross salary (employee → *Account details* → Edit). Overtime is worked out from it.
7. Check the PFA list (*HRIS → Employee settings → PFA list*) against SeamlessHR's, and add 2027's moveable public holidays when announced (*Leave → Leave settings*).
8. **Nest admin → Team & access** (you are now called the **Developer**):
   - Old **Admins** became **Inventory · Admin**; **Management** became **Inventory · Viewer** and **Purchase Order · Viewer**. Check each person's apps and roles.
   - **Who approves for each service line:** pick a **main** and **backup** admin for every line (for example the QHSE manager for QHSE). Only they (and you) approve that line's requests, stock changes and counts. A line with nobody set comes to you.
   - Optional: set a second person's Access to **Developer** as your backup.
   - **Inventory access** is now given by group: tick **Eng & Ops** (Thru-Tubing, Wellhead and Slickline together), **QHSE**, or both, with the **Access** button. Everyone who had any of Thru-Tubing, Wellhead or Slickline was given all three during the install.
9. **PeopleCore** stays **under construction** for everyone except you. To let HR test it: **Nest settings → PeopleCore → Choose testers** (they also need the PeopleCore app on). Open it to everyone there when ready.

**If no Developer can sign in** (for example the Developer left without handing over), run this in Supabase → SQL Editor, with the right email: `update public.profiles set role = 'superadmin' where email = 'name@gankcoenergy.com';`

### What's new in 3.0.4
- **Developer and app roles:** Super Admin is now the **Developer** (one, plus an optional backup; hand over with **Transfer Developer**). Only the Developer approves sign-ups, switches apps on or off and sets roles. Each app has its own roles: Inventory Admin / Staff / Viewer, Purchase Order Staff / Viewer, PFI & Quote Admin / Staff, PeopleCore on or off. An admin in one app gets nothing in another.
- **Line approvers:** Inventory Admin is one role; each line's main and backup admin approve its materials requests, stock changes, counts and report reviews. Nobody approves their own request. Inventory admins can switch between **My view** and **Admin view**.
- **Viewers:** see the Overview, stock, Reports and Sign-offs, and add jobs to the Job planner. PO Viewers see and download POs.
- **Developer tools** (Nest admin): reverse a materials request completely (stock back as before), reset a monthly count (an approved one has its stock change undone; Start count comes back), delete POs (received goods come off stock), planner jobs, sign-offs, unused items/serials/locations/categories, unapproved sign-ups and PeopleCore test records. Each asks you to type the number; the audit log keeps a full copy.
- **Fixes:** a cancelled request no longer shows *Approve & issue*; a cancelled or rejected request sends its planned job back to *Planned* so a new request can be made.
- **Maintenance:** tick two or more apps to lock together without locking all of Nest.
- **PeopleCore under construction** until the Developer opens it (Developer and chosen testers can use it).
- **Sign-up and profile:** sign-up asks for first name, surname, email, phone (optional), password and confirm password (with show/hide). After confirming their email, people **finish their profile**: photo (take or choose) and signature (draw it with a finger or mouse, or upload a photo of it), plus job title if none is set. They can skip and do it later; Nest asks again at their next sign-in until both are in. They can do it while waiting for approval.
- **My self service is the staff view for everyone:** HR admins and the Developer see exactly what staff see there (no HR panels, admin buttons or Nest admin links). Admin work stays in the Supervisor, Admin and System control views.
- **PeopleCore My profile is the one place for your details:** your name, phone and photo there are what Nest shows. Name and phone changes go through HR approval as before and then update your Nest account; the photo (camera button) saves straight away. Account settings keeps the signature, password and email alerts (and name/phone only for people without a PeopleCore record).
- **Your photo at the top right of every page** (next to the bell, on the Nest home screen too). Clicking it opens a menu as in SeamlessHR: your name, job title and role, **Profile** (PeopleCore My profile; My account while PeopleCore is closed to you), **Account settings** (photo, signature, password, alerts) and **Sign out**. Initials and a small dot show until a photo is added.
- **PeopleCore menu:** pressing **Work** again closes its list.
- **One photo everywhere:** My account and PeopleCore → My profile (camera button) change it straight away; it shows in the Nest menu, Team & access and PeopleCore. A photo HR adds to someone's record shows in Nest too.
- **Four views:** *My self service* (everyone), *Supervisor* (anyone with people under them), *Admin* (HR, by role) and *System control* (admins and roles). The switcher sits at the top of the menu (top of the page on phones).
- **System control:** admins and **roles with SeamlessHR's permission list** (324 permissions across the modules). Built-in roles: Super Admin, HR Admin, HR Officer, Finance. Locked staff details keep their own permission.
- **Company settings (SeamlessHR's structure):** departments and units tree with heads and codes, job roles inside departments, locations, regions, cost centres, job families, pay groups and paygrades (G1–G4 bands, UC1), groups, the six **reporting lines** (each person's can be overridden), company documents in folders, organogram.
- **HRIS:** overview with charts, employee list with profile completeness, add/edit employee (SeamlessHR's form), the 13 profile sections with a visibility grid and per-section approval, contracts (types, bulk extend, plan upload, requests), redeployment (direct, bulk, staff requests), department work-day schedules (leave counts them), employee groups, employee settings, audit trail.
- **Approval workflow:** named workflows built from reporting lines, admin roles or a named person; optional and conditional steps; comment rules; daily or weekly reminders; auto re-route to stand-ins; maker-checker. GANKCO's 7 plus Profile update, Redeployment, Contract and Leave plan.
- **Announcements:** SeamlessHR's form (title, summary, tidy rich content, external link, video links, audience by department, location or group, draft or publish with email/in-app and expiry), plus pin, schedule, read-and-confirm, files and who-has-read.
- **Leave:** GANKCO's 8 policies with days per paygrade (3-step editor), relief officer approval per policy, start + resumption date with a requirements note and Preview, reserved / additional / blocked days, history and opening balance upload, balances, resumption ("I'm back"), leave allowance (due → paid, staff can ask), recurring public holidays.
- **Requisition:** Overtime (gross monthly pay ÷ 176 × 1.5 weekdays / 2.0 weekends and public holidays; weekday hours count outside 9–5), Expense and Service policies (with your own form fields), raise on behalf, mark as paid, transactions, SLA (off).
- **Exit:** GANKCO's 4 policies, 7 modes, 11 reasons; activities (handover, exit interview, survey, **return assets from Inventory**, **clearance** sign-offs); sign-in switched off after the last day; settlement entered by hand; certificate of service (off until HR switches it on).
- **Disciplinary:** cases (several people each with their own outcome, reviewers, levels I/II, meetings, comments and activity log), grievances, anonymous whistleblowing, queries, sanctions that act (suspension switches off sign-in for its dates; termination opens an exit), appeals, 3 letters, terminologies, case ID format, historic data upload.

## Install 3.0.3 (already done, for reference)

1. **Supabase → SQL Editor → New query:** paste all of **`19-nest-v3.0.3-upgrade.sql`** and press **Run**. It should end with **Nest 3.0.3 installed**. Safe to run again.
2. **GitHub:** unzip **`gankco-nest-v3.0.3.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
3. Reload Nest (**Ctrl + Shift + R**). The bottom of each page shows **v3.0.3**.
4. **PeopleCore → PeopleCore settings → Leave types:** check the days per grade against the HR handbook. **Public holidays:** add the 2027 dates once the government announces them.

### What's new in 3.0.3
- **Crew on materials requests (Inventory):** the team lead adds everyone going out on the job, each with their designation for that job (required). People from outside the company can be typed in. Mark the job onshore, offshore or swamp. The crew prints on the Load-out Manifest as *Crew (POB)*. Line admins can edit it too.
- **Leave (PeopleCore):** apply for leave with the working days counted for you (no weekends or public holidays), a relief officer who accepts first, then line manager → head of department → HR. Balances per leave type, prorated for new joiners. Leave history, relief requests, a leave plan, and the leave allowance record. Managers see clashes in the team and whether the person is on a job crew before approving.
- **HR tools:** *Time & pay* (company leave calendar, everyone's balances with adjustments such as opening balances from SeamlessHR, leave allowance marked paid). Leave types with days per grade and public holidays in PeopleCore settings.
- **Announcements and policies:** only HR posts. Each announcement goes by bell and email, can be pinned, scheduled, or sent to some units or locations only, and can ask staff to read and confirm. A policies library with versions and a who-has-read report.
- **Discover page:** greeting and quick actions, *Needs you*, at-a-glance numbers, announcements, birthdays (day and month only), work anniversaries and new joiners, who's out (leave or on a job), upcoming holidays.
- **Anonymous mood check-in:** once a day. HR only sees trends, and nothing is shown for a group with fewer than 5 answers.
- **Collapsible settings:** Nest settings, Inventory settings and PeopleCore settings show each section as a bar with a short summary. Opening one closes the others; it stays open after you save. Nest asks before closing a section with unsaved changes.
- **View as fixed:** apps now follow the role you're viewing as, so viewing as staff shows PeopleCore as *Coming soon*, as staff really see it. The *Service lines* link on the Locations and PO settings pages opens the right section again (it used to land on the Inventory home page).

## Install 3.0.2 (already done, for reference)

1. **Supabase → SQL Editor → New query:** paste all of **`18-nest-v3.0.2-upgrade.sql`** and press **Run**. It should end with **Nest 3.0.2 installed**. Safe to run again.
2. **GitHub:** unzip **`gankco-nest-v3.0.2.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
3. Reload Nest (**Ctrl + Shift + R**). The bottom of each page shows **v3.0.2**.
4. **Next backup:** Nest now asks for a password and locks the file. Keep the password where you keep the Nest account passwords: without it the backup can't be opened.

### What's new in 3.0.2
- **PeopleCore "Coming soon":** staff see the PeopleCore tile on Nest home as *Coming soon* until go-live. Only you and the HR team can open it.
- **The agreed staff menu:** Discover · Work (Leave, Requisition, Performance, Competency, Promotion, Redeployment, Disciplinary, Onboarding, Exit, Surveys) · Pay · Approvals · My team · Company (Directory, Org chart, Announcements, Policies, Holidays). Parts not built yet show what they'll hold.
- **Work page:** profile card with your line manager, *Complete your profile* (what's still missing), quick actions, your open requests and every Work section.
- **Locked backups:** the monthly backup now holds PeopleCore staff records (bank, tax, pension and ID numbers), so it's locked with a password you choose (AES-256). Restoring asks for the password. Older backups still restore without one. Every backup download is recorded in PeopleCore's activity log.

## Install 3.0 (already done, for reference)

1. **Lock Nest:** **Nest admin → Nest settings → Maintenance → Schedule maintenance → All of Nest → Start now**.
2. **Supabase → SQL Editor → New query:** paste all of **`16-nest-v3.0-upgrade.sql`** and press **Run**. It should end with **Nest 3.0 (PeopleCore) installed**. It's safe to run again. Nothing in Inventory or Purchase Orders changes.
3. **GitHub:** unzip **`gankco-nest-v3.0.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
4. Reload Nest (**Ctrl + Shift + R**). The bottom of each page shows **v3.0**. End the maintenance.
5. **PeopleCore → PeopleCore settings → HR team:** add the HR people (HR admin or HR officer).

### What's new in 3.0: PeopleCore (Wave 1a)
- **A new app on the Nest home page.** Every Nest user gets it (self-service). Switch it off for someone on the Team page like any other app.
- **My profile:** each person's details, next of kin, documents, job history and their bank, tax and pension section. Staff send a **change request**; HR checks it, then the record updates. Changes to bank, tax or pension details go to **HR admins only**.
- **Directory** of everyone, and **My team** for line managers (direct reports and the people further down, with confirmation dates).
- **Approvals:** an inbox for requests waiting for you, your own requests, and (HR) all requests. Bell alerts, a line in the daily email, and a reminder when a step waits too long. **Stand-ins** approve for you while you're away.
- **Org chart** from the structure, with vacant positions, external advisers and dotted lines. Fit, zoom and print (A3).
- **Staff records (HR):** add and edit people, move them to a new position (kept in job history), photos, documents with expiry dates, and the **locked section** (bank, account, TIN, PFA, RSA PIN, NHF, NIN). Only HR admins and the person see it, and every look is logged.
- **PeopleCore settings (HR admins):** units and positions (everything can be changed, including who reports to whom), grades, locations and employment types, **custom fields** with who-can-see-it (everyone, managers, HR, locked), **approval chains** (line manager, next level up, head of department, HR, a position or a named person, with conditions), **employee numbers** (GES + running number + year joined, e.g. GES0052022; HR can overwrite) and the **activity log**.
- **Excel:** staff and organisation templates to download, fill and upload. These are starting formats until HR agrees the final columns.
- **Staff without a company email** can create a Nest account with the email HR has on their PeopleCore record.
- The structure starts from the organogram (positions only, no names). HR fills in the people.
- **Fix:** dates in Excel templates no longer show a day early (this affected redress kit expiry dates).

## Install 2.9.1 (already done, for reference)

1. **GitHub:** unzip **`gankco-nest-v2.9.1.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file. No SQL to run.
2. Reload Nest (**Ctrl + Shift + R**). The bottom of each page shows **v2.9.1**.

### What's new in 2.9.1
- **Uploading a template:** Nest recognises which template the file is (items, quantity corrections, locations or redress kits), so there's nothing to choose and a file can't be read as the wrong kind.
- **Quantity corrections:** if numbers were typed in **Current qty** instead of **New qty**, the preview says so and offers **Use the numbers I typed in Current qty**. When there's nothing to change, it says to use the New qty column.
- **Location filter** works for any location name, including names with a comma (for example *Operations Base, Portharcourt*), and the **View stock** button on Locations uses it too.
- **Renaming a location** updates the Inventory lists straight away, without a reload.



## Install 2.9 (already done, for reference)

1. **Lock Nest:** **Nest admin → Nest settings → Maintenance → Schedule maintenance → All of Nest → Start now**.
2. **Supabase → SQL Editor → New query:** paste all of **`14-nest-v2.9-upgrade.sql`** and press **Run**. It should end with **Nest 2.9 installed**. It's safe to run again: items that already have a place are never moved again.
3. **GitHub:** unzip **`gankco-nest-v2.9.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
4. Reload Nest (**Ctrl + Shift + R**). The bottom of each page shows **v2.9**.
5. **Check, as the Super Admin:**
   - **Inventory:** the four filters at the top (Service line, Sub service line, Type, Sub-type). Every item has a place; the line under each description shows it, for example *WI · Wireline Services · Slickline Downhole Tools*.
   - **Nest admin → Nest settings → Service lines:** the team for each sub service line. Set a team for any sub line that will get items (Cased Hole Logging, Well Testing and so on).
   - **Inventory → Inventory settings → Types & sub-types.**
6. Press **End maintenance**.

### What's new in 2.9

**Inventory filters**
- **Service line → Sub service line → Type → Sub-type.** The sub line list follows the service line, and the sub-type list follows the type (picking a sub-type on its own sets its type). **Redress kits only** is a tick box; **Clear filters** resets them.
- The service-line buttons at the top of Inventory are gone. The table columns are the same (code, description, each store, out, status, total).
- **Excel and PDF exports** are grouped by sub service line, then type and sub-type, and say which filters were used.

**Types and sub-types (they replace categories)**
- Four types: **Sales items** (leave for good), **Rental items** (go out on jobs and come back), **Consumables** (used up) and **Company tools & assets** (go out and come back, for now). The type decides how an item behaves on jobs.
- Sub-types under each type, from your alignment sheet. **Inventory settings → Types & sub-types** (Super Admin and admins): add, rename, reorder, archive, or delete one that no item uses.
- Every item was moved to its new place from the sheet you filled in (categories, the 96 single items, and the 75 Job planner items by name). The Audit log isn't flooded: placing items isn't an edit.

**Service lines: one list for Inventory and PO**
- **Nest admin → Nest settings → Service lines** (Super Admin): add, rename, reorder or archive service lines and sub lines, and choose the **team** for each sub line (that team's admins look after its items and approve changes). Changing a sub line's team hands its items to the new team.
- **FLM & SLM** (was First- & Second-Line Maintenance Service), in both apps.
- **Company-wide → Quality, Health, Safety & Environment** for QHSE items. It isn't offered on POs.
- A main line's code can't change once POs have been issued with it.

**Moving items (admins)**
- Tick items → **Move to…** → service line, sub line, type and sub-type ("No change" leaves a field as it is). **Edit item** does the same for one item.
- Admins can move items into **another team's** sub line; that team's admins get a bell alert and the items become theirs.
- An item's type can't change while some of it is out on a job.
- The item's **History** shows each move (old → new, who, when); the Audit log has it too.

**Bulk items template** (Inventory → Excel templates → *Items: add and edit*)
- Download: every item shown on the Inventory page (set the filters first to narrow it), with dropdowns for service line, sub line, type and sub-type, plus 150 empty rows for new items with an opening quantity per store.
- Upload: a preview shows every change as old → new, new items in green, and rows to fix in red. Only cells you changed count: if something was changed in Nest after you downloaded the file, Nest keeps that change and tells you.
- Admins' changes save straight away. **Staff uploads go to their team's admin** as one request in **Approvals**, and are applied when approved. No prices in the template.

**Fixes**
- **PDF and Excel downloads work on every computer.** Some browser add-ons put a "script loader" on every web page, which took the PDF tool away from Nest (*"Cannot read properties of undefined (reading 'jsPDF')"*). Nest now loads its tools so add-ons can't interfere, and a tool that fails to load (slow internet) is tried again on the next press.
- **Locked app tiles:** someone without Inventory (or Purchase Order) access sees the tile greyed out with a lock and *"You don't have access. Ask the Nest admin."*

**Supabase advisors after 2.9:** about eight more *"signed-in users can execute security definer function"* warnings for the new buttons (Move to, Save item, bulk template, sub-types, service lines). They're by design, like the others.

## Install 2.8.1 (already done, for reference)
. **Lock Nest:** **Nest admin → Nest settings → Maintenance → Schedule maintenance → All of Nest → Start now**.
2. **Supabase → SQL Editor → New query:** paste all of **`13-nest-v2.8.1-upgrade.sql`** and press **Run**. It should end with **Nest 2.8.1 installed**. It's safe to run again. (It already contains the 2.8.1 security fix, so it doesn't matter whether `12-nest-v2.8.1-security-fix.sql` was run first.)
3. **GitHub:** unzip **`gankco-nest-v2.8.1.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
4. Reload Nest (**Ctrl + Shift + R**). The version at the bottom of each page shows v2.8.1.
5. **Check:** Purchase Order → Purchase orders → **All**: drafts on top, then 10038 onwards newest first, then the old POs by date. Suppliers: the suppliers from old POs are there with their details.
6. **Supabase → Advisors:** refresh **Performance Advisor** (the 20 warnings should be gone) and **Security Advisor** (only the expected warnings stay: see below).
7. Press **End maintenance**.

### What's new in 2.8.1

**PO list**
- **Order:** drafts first (the one edited last on top), then POs issued in Nest by PO number (newest on top), then old POs added from before Nest by PO date (newest on top). Every filter and the Excel download use this order.
- **Click a column heading to sort** by it (PO number, PO date, supplier, service line, delivery, order amount, status, raised by). Press again to reverse, a third time for the default order, or **Back to the default order**. POs without a value (such as drafts without a number) always go to the bottom. On a phone there's an **order** picker under the filters. The Excel download follows the order on screen and says how it was sorted.

**Suppliers from old POs**
- When an old PO is added (one by one or in bulk) and its supplier isn't in the Suppliers list, the supplier is added with its **address, phone and fax**. A "Phone: … Fax: …" written together is split into the two boxes.
- If the supplier is already in the list, Nest **only fills in details it's missing**; nothing already saved is replaced.
- The old POs already in Nest were run through the same check when you installed 2.8.1.
- **Add one by hand** now has optional address, phone and fax boxes, and says whether the supplier is new or already in the list.

**Security and speed (Supabase advisors)**
- The 2.8.1 security fix is part of the upgrade: only signed-in people can call Nest's functions, Nest's internal helpers can't be called directly, and signed-out visitors can only read the maintenance notice on the sign-in page.
- The database's security rules were made faster without changing who can do what:
  - the "who is signed in" check runs once per request instead of once per row;
  - each table has separate rules for adding, changing and deleting instead of one catch-all rule;
  - every link between tables has an index.
- Checked by comparing, for every test user and every table, what they could read, change and delete before and after: identical.

**Security Advisor: warnings that are expected and stay**
- *Signed-in users can execute security definer function* (about 96): by design. Each one is a Nest button or a yes/no check the security rules use, and each checks the person's role inside.
- *anon can execute maint_public*: by design (the sign-in page maintenance notice).
- *Leaked password protection*: a switch in Supabase → Authentication (it may need a paid plan). Turn it on if your plan allows.
- **Performance Advisor "Unused index" (info):** normal while tables are small; Postgres reads small tables directly. Leave them.



## Installing 2.8 (for reference: already done)

1. **Lock Nest:** **Nest admin → Nest settings → Maintenance → Schedule maintenance → All of Nest → Start now**. (Before you upload 2.8, this is still **Settings → Maintenance** in Inventory.)
2. **Supabase → SQL Editor → New query:** paste all of **`11-nest-v2.8-upgrade.sql`** and press **Run**. It should end with **Nest 2.8 installed**. It's safe to run again.
3. **GitHub:** unzip **`gankco-nest-v2.8.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
4. Reload Nest (**Ctrl + Shift + R**).
5. **Check, as the Super Admin:**
   - **Nest admin → Team & access:** the new **Apps** column. Everyone keeps the apps they had; untick **Inventory** or **Purchase Order** for anyone who shouldn't use it.
   - **Nest admin → Nest settings → Company details:** the company name and both addresses (they moved here from PO settings).
   - **My account → Adjust size and position** for your signature.
6. Press **End maintenance**.

### What's new in 2.8

**Nest admin and app access**
- **Nest admin** (button on the Nest home screen, and at the bottom of every app's menu): Team & access, Audit log, and **Nest settings** (company details, alert emails, maintenance, backups).
- **Each app has its own settings:** **Inventory settings** (count dates, warnings, form details) in Inventory, **PO settings** (numbering, service lines) in the Purchase Order app.
- **Apps per person:** tick **Inventory** and/or **Purchase Order** on the Team page, and when approving a new sign-up. The database enforces it: without Inventory, a person can't open it or read its data, even by typing the address. In the PO app they can still pick Inventory items onto a PO (code, name and unit only). Management only sees the apps they're ticked for. Alert emails leave out apps a person doesn't have.

**Purchase orders**
- **Required before Sign & issue:** service line, sub service line, supplier name, phone and address (marked with a red asterisk). Drafts can still be saved incomplete.
- **Phone and Fax** are separate boxes (on the PO and in Suppliers). The PO prints `: 713-433-2277      Fax: 713-433-2443`. The saved suppliers were cleaned up.
- **Lines:** drag the ⋮⋮ handle to move a line or heading; **Remove** on every row; ↑ ↓ still work on phones.
- **Several supplier quotes on one PO:** choose them together in **Read a supplier quote**. Their lines are added to the same PO, every file is kept, and all the quote numbers go into the quote ref. Tick **Put each quote's lines under its own heading** only if you want headings.
- **The PO documents now match the company's POs:** S.No. runs on across headings, dates print as 18/08/2025, totals as USD 172,863.65, the amount in words reads "…Dollars, Sixty Five Cents", only the signature sits on "Signed" (no name or title), and the PDF shows when it was generated at the top left and the page (1/2) at the bottom right.
- **File names:** *Purchase Order GES-WI-PO-10038-2026 Thru Tubing Systems Inc QN 092624-01JH, 030325-01JH* (drafts say DRAFT).
- **Delete drafts** from the PO list: the bin on each draft, or tick several and delete them together. Deleting is complete (lines and files too) and uses no number; the Audit log keeps one line.
- **Statuses:** Draft, Issued, Partly received, Fully received, **Closed**, Cancelled, plus a **Late** filter. **Close PO** (with a reason) when nothing more will come; it clears On order.
- **Deliveries:** the person who raised a PO gets a bell alert when goods are received; the daily email lists POs past their delivery date with nothing received; the **Overview** shows late and due-this-week deliveries; lines that aren't Inventory items (services, crating) can be marked received by the person who raised the PO.
- **Revisions:** Nest lists what changed (lines added or removed, quantity and price changes, total before and after) and sends it to the Super Admin, the raiser and the people who receive that line's goods. **Compare versions** shows any two versions side by side.
- **Add old POs in bulk:** choose up to 20 PDFs or Excel files (8 MB each). Nest reads the PO number, date, supplier, total and lines from each; check the table and add them. Each original file is kept with its PO.
- **Overview** (first page of the PO app): spend by month, service line, sub service line and supplier, each currency on its own; and **Items bought most**, with last, lowest and highest price, to spot price rises and items worth buying in bulk.

**Signatures**
- Blank edges and stray marks around every signature are trimmed automatically.
- **My account → Adjust size and position:** make your signature bigger or smaller and move it up or down, with a preview. It applies on every document Nest signs for you.

---

# Earlier: version 2.7 update

## Install 2.7 (about 10 minutes)

1. **Lock Nest:** **Settings → Maintenance → Schedule maintenance → All of Nest → Start now**.
2. **Supabase → SQL Editor → New query:** paste all of **`10-nest-v2.7-upgrade.sql`** and press **Run**. It should end with **Nest 2.7 installed**. It's safe to run again.
3. **GitHub:** unzip **`gankco-nest-v2.7.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
4. Reload Nest (**Ctrl + Shift + R**). On the Nest home screen, the **Purchase Order** tile is now live.
5. **Check, as the Super Admin:**
   - **Purchase Order → PO settings:** the company name, both office addresses, and **Next PO number: 10038**.
   - **Team:** the new **Purchase Order** column. Everyone is switched on at first; switch it off for anyone who shouldn't raise POs.
   - **Team → Who can receive PO deliveries:** switch it on for any storekeeper.
6. **Raise one test PO**, then press **End maintenance**. (If you don't want to keep the test PO, cancel it: its number is never reused. Or keep it as a draft and delete it, which uses no number.)

### What's new in 2.7

**Purchase Order app**

- **Raise a PO:** pick the service line and sub service line, then the supplier. A saved supplier fills in its address and phone; a new one is saved the first time it's issued.
- **The PO sheet has every field of your Excel PO:** Name, Address, Phone, PAN, GSTIN, P.O. date, P.O. number, delivery date, the lines (S.No., part number, item name, HSN/SAC, qty, UOM, rate, amount), totals, amount in words, note, GST tax summary, terms, and the signature. Blank fields print empty, as on the sample. **Deliver To** is a new line under GSTIN: Abuja office, Port Harcourt office, or blank.
- **Currency:** USD, NGN, GBP or EUR, with the amount in words in that currency.
- **Tax isn't worked out:** type the tax amount if the supplier charges it. Nest adds up the lines and adds the tax you typed.
- **Section headings** (A, B, C…) like the SHO Assy & RBP PO, with lines numbered 1, 2, 3 under each.
- **Lines can come from:** typing, **Pick from Inventory** (part number, name and unit fill in), **Read a supplier quote** (Excel or a PDF with selectable text), **Paste from an AI chat** (free: works with any quote, including scans), or the **Job planner's Ship-in list** (**Create purchase order**). They can be mixed. The quote file is kept with the PO.
- **Terms:** optional, one per line. Terms used before can be picked again.
- **Sign & issue:** the raiser's signature is the approval. The number is given at that moment: **GES-WI-PO-10038-2026**, one running number for every line (WI, WEO, PEO, WHS) that carries on across years. The Super Admin gets a bell notification for every issued PO.
- **PDF and Excel copies:** the Excel is built cell for cell from your Sand Screens sheet; the PDF has the same layout.
- **Revise:** keeps the number and adds **-R1, -R2**, with a short reason, signed again. Every earlier version is kept, marked Superseded, and can be downloaded again exactly as it was signed.
- **Cancel** with a reason (only before anything is received). Issued POs can't be deleted; drafts can.
- **Receive goods:** the Inventory line's admin (or staff they allow) records deliveries against the PO. Linked items go into stock at the chosen location and their price updates from the PO. Status goes Issued → Partly received → Received. Linked items show **On order** until the goods arrive.
- **PO history:** search and filter by service line, sub line, supplier, year, status and currency, with totals per currency and an Excel export.
- **Add an old PO:** for POs sent before Nest, with the original file attached.
- **Suppliers** page to correct details, and **PO settings** for the company name, addresses and next number (Super Admin).
- **Leaving the PO sheet** with unsaved changes saves the draft quietly.
- Works with the maintenance lock (**Purchase Order** on its own, or all of Nest), the Audit log and backups.

**Smaller items**

- **Sign-in page:** shows a notice when Nest is under maintenance, or about to be.
- **Settings → Alert emails → Recent emails:** when Brevo refuses an email, its reason is shown with a hint (for example, a wrong API key or blocked IP addresses).
- **Audit log is live:** new changes appear as they happen, with a **Live** dot. If the tab was in the background, it catches up when you come back.
- **Job planner:** "Left after jobs" is now **Complete BHAs after all upcoming jobs** ("After every active job on the list takes its parts"), and "Above / (below) target" is now **Compared with safety target**, on the Summary tab, the PDF and the Excel.
- **Inventory:** tick items and press **Archive** (or **Restore** on the Archived filter). **Delete** removes items added by mistake that were never used; anything used in Nest has to be archived instead, and Nest says what it was used in.

---

# Earlier: version 2.6.2 update

## Install 2.6.2 (about 5 minutes)

1. **Lock Nest:** **Settings → Maintenance → Schedule maintenance → Inventory → Start now** (the Job planner is part of Inventory).
2. **Supabase → SQL Editor → New query:** paste all of **`9-nest-v2.6.2-upgrade.sql`** and press **Run**. It should end with **Nest 2.6.2 installed**. It's safe to run again.
3. **GitHub:** unzip **`gankco-nest-v2.6.2.zip`** and upload everything into **github.com/gankco-energy/gankco-nest**, then commit. Keep the `CNAME` file.
4. Reload Nest, open **Job planner → Setup** and check the two extension rods (below). Then press **End maintenance**.

### What's new in 2.6.2: the Job planner follows the Excel tracker exactly

- **Complete BHAs on the shelf** uses the Excel's rules. *Limited by* lists the parts below the safety target and the 10 ft blanks short of the packers, or **None**.
- New columns: **Left after jobs** and **Above / (below) target**, as in the Excel's safety stock section.
- A line under the table shows the **total** for the sizes that share 10 ft blanks (2-3/8" and 2-7/8"), so the two sizes aren't added together by mistake.
- The **Jobs short** tile also shows the Excel's **shortfall cells**.
- The extension rod is split into the Excel's two rods:
  - **Extension Rod TTS (2-3/8"–3-1/2") + EMST (2-7/8"–3-1/2")**: one shared set, needed once. It's needed on 2-3/8" for TTS jobs only, and on 2-7/8" and 3-1/2" for any job. It's not needed on 4-1/2".
  - **Extension Rod 2-3/8" EMST**: needed on 2-3/8" EMST jobs only.
  - The SQL links the first to **GES-TT-RT-5011-238-A-075** and the second to **GES-TT-RT-FAB-EXT-001**. Swap them on **Setup** if that's the wrong way round.
- On **Setup**, a service tool's cell now has **"Needed for this size when the job uses"**. Use it to make a tool apply to TTS jobs only or EMST jobs only, for one size.
- The management report (PDF and Excel) has the same columns and the shared-blanks line.
- **Inventory:** an item with nothing left shows **None left** instead of **Low**.

**Checked against the Excel:** Nest was loaded with the Excel's stock count and its 8 jobs. It matched every result the Excel shows (37 checks):
- complete BHAs 2 / 2 / 1 / 0, with the same *Limited by* text;
- 11 shortfall cells and 20 units for jobs;
- every surplus/shortfall cell and every job's stock check;
- left after jobs, above/below target, safety top-ups and EMST backups;
- 51 units to ship in total.

---

# Earlier: version 2.6 update

## Install 2.6 (about 15 minutes, once)

**From the next update on,** lock Nest first: **Settings → Maintenance → Schedule maintenance → All of Nest → Start now**, then run the SQL and upload, check Nest as a tester, and press **End maintenance**.

1. **Supabase → SQL Editor → New query:** paste all of **`7-nest-v2.6-upgrade.sql`** and press **Run**. Wait for **Success**. It's safe to run again.
2. **GitHub:** unzip **`gankco-nest-v2.6.zip`** and upload everything from the folder into **github.com/gankco-energy/gankco-nest** (**Add file → Upload files**), then commit. Keep the `CNAME` file.
3. After 1–2 minutes, anyone with Nest open sees **"A new version is available: Reload"**.

### Switch on the alert emails (one time)

1. **Check the schedule is on.** In Supabase, open **Database → Extensions** and make sure **pg_cron** and **pg_net** are switched on. If you had to switch either on, run the 2.6 SQL file again.
2. **Make a Brevo API key.** In Brevo, open the menu at the top right → **SMTP & API** → **API Keys** tab → **Generate a new API key**, name it **Nest alerts**. Copy it. This is a different key from the SMTP key Supabase already uses. **Don't paste it into a chat or email.**
3. **Save it in Supabase Vault.** In Supabase, open **Vault** (under Integrations, or search "Vault") → **Add new secret**. Name: **`brevo_api_key`**. Secret: paste the key. Save.
4. **Check it in Nest.** Go to **Settings → Alert emails**. **Brevo API key** and **Schedule** should both show ✔.
5. **Send yourself a test.** In **Try it**, pick yourself and **Daily**, then **Send to me now**. Check your inbox (and spam the first time). Try **Preview** for other people to see what they'll get.
6. **Test week.** Leave **Test mode** on for a week: only you receive the 7:30 am emails. When you're happy, turn **Test mode** off and press **Save**. Everyone then gets theirs.

If **Recent emails** shows "Brevo said 401", open Brevo → **Security → Authorised IPs** and turn off blocking of unknown IP addresses (Supabase sends from changing addresses).

## After installing

1. **Servicing rules:** for tools that must be serviced when idle, open the item → **Servicing → Set a rule** (or tick several items on Inventory → **Edit details** → *Service if idle on the shelf*).
2. **Testers:** **Settings → Maintenance → Choose testers** (for example Lydia).
3. **On order:** when you order something, open the item → **Mark on order**, with the quantity and expected date.

## What's new in 2.6

- **Alert emails** from nest-alerts@gankcoenergy.com, in the Nest email design:
  - **Daily at 7:30 am, Monday to Friday**, per person, in three groups. **Act today:** materials requests to approve and issue, approvals waiting (marked in red after 2 working days), reports to sign or returned, receipts to confirm, items overdue back, the monthly count (open or late), the monthly report to submit once the count is approved, new sign-ups, overdue certificates, expired kits, tools due for service, the monthly backup (Super Admin), and drafts left for more than 3 days. **Coming up:** certificates and kits due soon, items due back this week, servicing due within 30 days, Job planner jobs in the next 14 days that are short, and the count opening soon. **For your information:** items that fell below reorder level since yesterday, items newly marked faulty or damaged, and, on the first working day of the month, housekeeping (items with no location, no reorder level, certificates with no due date, planner parts with no price).
  - **Staff** only get their own items. Nobody gets an empty email.
  - **Monday 7:35 am:** admins get low stock split into *not ordered yet* and *on order* (late deliveries in red) plus everything faulty and not yet repaired. **Management** get a weekly summary: headline numbers, upcoming planner jobs (Ready or Short), the estimated ship-in cost and reports signed off that week.
  - **Settings → Alert emails** (Super Admin): on/off, test mode, status, **Preview** and **Send to me now** for anyone, and the last emails sent with Brevo's answer.
  - **My account → Email alerts:** anyone can turn their own emails off.
- **Maintenance lock** (Settings → Maintenance, Super Admin):
  - Lock **All of Nest** or a single app (Inventory, Purchase Order, Proforma Invoice & Quote), now or at a set time, with a message and a back-by time. **+15 min / +30 min** while it's on, and **End maintenance**.
  - **Heads-up banner** before it starts (30 minutes to 1 day before).
  - People see a branded maintenance screen (all of Nest) or a locked tile and app screen (one app). It happens within seconds for anyone already in Nest, and their page comes back by itself when you end it.
  - The database refuses changes while it's on, not just the screen. The Super Admin and chosen **testers** can still use Nest, with a bar saying maintenance is on.
- **Tool servicing:** an idle rule per item ("service if idle 12 months"). The item page shows last used, last serviced and next service, with **Mark serviced** and a service history. Reminders go in the alert emails.
- **On order:** mark an item on order with quantity, expected date and a note (for example the PO number). It shows on the item, the dashboard's restocking list and the Monday email, and clears itself when the stock is received.
- **Prices on every item:** the item page shows the unit price (USD or NGN) to admins, the Super Admin and Management, and admins can edit it. Staff still never see prices.
- **Job planner → Setup → Add part:** add BHA components, service tools, blank lengths or screen sizes beyond the original 20, then link them to Nest items. Existing jobs aren't affected (a new component counts as 0 on them until you edit the job).
- **App names:** Purchase Order and Proforma Invoice & Quote.

---

# Earlier: version 2.5 update

## Install 2.5 (about 3 minutes)

1. **Supabase → SQL Editor → New query:** paste all of **`6-nest-v2.5-upgrade.sql`** and press **Run**. Wait for **Success**. It's safe to run again.
2. **GitHub:** unzip **`gankco-nest-v2.5.zip`** and upload everything from the folder into **github.com/gankco-energy/gankco-nest** (**Add file → Upload files**), then commit. Keep the `CNAME` file.
3. After 1–2 minutes, anyone with Nest open sees **"A new version is available: Reload"**.
4. **Take the first backup:** Settings → Backups → **Download backup**. Save it in a **Nest Backups** folder in the Nest Gmail's Google Drive.

## What's new in 2.5

- **Backups (Super Admin, Settings → Backups):**
  - **Download backup** saves everything in Nest to one dated file (`gankco-nest-backup-YYYY-MM-DD.json`): items, stock, movements, materials requests, counts, sign-offs, signatures, prices, the job planner, users and the audit log. Tables added in future versions are included automatically.
  - The page shows the last backup (when and who) and when the next one is due.
  - **Monthly reminder:** from the 1st of each month, the Super Admin's bell shows **Monthly backup due** until a backup is downloaded that month.
  - **Make restore script from a backup file** turns a backup into SQL file(s) to run in Supabase's SQL Editor, in order. Restoring replaces all Nest data with the backup; sign-in accounts aren't touched. The handover guide has the full steps.
- **Settings → Email alerts** now says that sign-up, invitation and password emails come from nest-alerts@gankcoenergy.com.

---

# Earlier: version 2.4 update

## Install 2.4 (about 5 minutes)

1. **Supabase → SQL Editor → New query:** paste all of **`5-nest-v2.4-upgrade.sql`** and press **Run**. Wait for **Success**. It's safe to run again.
2. **GitHub:** unzip **`gankco-nest-v2.4.zip`** and upload everything from the folder into **github.com/gankco-energy/gankco-nest** (**Add file → Upload files**), then commit. Keep the `CNAME` file.
3. After 1–2 minutes, anyone with Nest open sees **"A new version is available: Reload"**.

## After installing

1. **Job planner → Setup** (Thru-Tubing admins or Super Admin): check which Nest item each part uses for each tubing size. Nest linked them by part number; the service tools (setting sleeves, extension rods, retrieving tools) are best guesses. Click a cell to change it.
2. **Fix two item codes:** the 2-7/8" Paragon II Packer is coded `GEST-TT-…` (typo), and `GES-TT-DHT-SCRN-150-0001DS` is used for both the 200µ and 230µ 1-1/2" screens. Give one of them a new code.
3. **Prices:** fill in the parts that show "no price" (for example the blanks, PCMs and EMSTs). Either press **Edit price** on a line of the **Ship-in list**, or use **Setup → Prices** for the full list.
4. **Management:** on the **Team** page, set managers' access to **Management**.
5. **Second Super Admin:** make one trusted person a Super Admin too, so Nest never depends on one account.

## What's new in 2.4

- **Credit line:** "Designed and built by Ehigie Momodu" on the sign-in page, the launcher footer and **My account → About Nest**. It isn't printed on PDFs, Excel files or labels.
- **Job planner** (menu → Job planner, for everyone). Your "Inventory vs Job Tracker" Excel, built into Nest for Thru-Tubing screen hang-off BHAs:
  - **Add upcoming job:** a job sheet with three sections (Job, String, BHA make-up) and a **Stock check** panel on the right that updates as you type. Each BHA row shows how many are free on the shelf for this job (✔ or ✖), plus the job's place in the date order.
  - **The jobs list** shows a **Ready** or **Short N parts** badge on each job, with the missing parts underneath.
  - Stock comes from **live Nest stock** (in store, available, all locations). There's no separate count to enter.
  - **Same rules as the sheet:** jobs are checked in date order, 10 ft blanks are pooled for 2-3/8" and 2-7/8", PCM and EMST are shared by 2-7/8" and 3-1/2", and service tools are needed once per size.
  - **Request** on a job creates a draft materials request with the right items. Once it's issued, the job counts as **Run** and its parts aren't counted again. This replaces the "Done" rows.
  - **Summary:** complete BHAs on the shelf per size and what limits them, plus surplus/shortfall for every part.
  - **Ship-in list:** split into short for jobs and safety top-up (Safety BHAs per size and spare EMSTs, set on Setup), with job-by-job shortages.
  - Your 8 upcoming jobs from the Excel are already loaded.
- **Management report:** "Inventory vs Upcoming Jobs" as a PDF or Excel, downloaded whenever needed (no sign-off). It covers headline numbers, job-by-job readiness, the ship-in order and complete BHAs.
- **USD prices:** loaded from your two PO sheets. The Ship-in list and report end with a **Total** row (units and estimated cost, noting any lines with no price).
  - **Seen by** admins, the Super Admin and Management. Staff never see prices.
  - **Changed only by** admins and the Super Admin, via **Edit price** on the Ship-in list, or **Setup → Prices** (Thru-Tubing admins and Super Admin). The database enforces this, and every change is in the audit log.
- **Management access:** view-only. It sees Overview, Inventory, Job planner, Reports and Sign-offs (with prices) and can download reports, but can't change anything. **View as → Management** shows you what they see.
- **Locations:** Port Harcourt and Warri are deleted. Admins can now **Delete** any location that has never been used.

---

# Earlier: version 2.3 update

*Built to support engineered solutions.*

## Install 2.3 (about 5 minutes)

1. **Supabase → SQL Editor → New query:** paste all of **`4-nest-v2.3-upgrade.sql`** and press **Run**. Wait for **Success**. It's safe to run again.
2. **GitHub:** unzip **`gankco-nest-v2.3.zip`** and upload everything from the folder into your `inventory` repository (**Add file → Upload files**), then commit. Keep the `CNAME` file.
3. After 1–2 minutes, anyone with Nest open sees **"A new version is available: Reload"**.

## First things to do

1. **Team page:** set everyone's **job title** (use **Set** in the Job title column). It's printed under their name when they sign.
2. **Everyone:** go to **My account → Upload signature**. Sign on plain white paper with a dark pen, then take a straight photo in good light or scan it. Nest removes the white background and shows a preview before saving.

## What's new in 2.3

- **Printer-friendly PDFs (Design A):** white page, colour logo, one thin orange line, light grey table headers. Statuses are bold coloured text. A category heading never gets stranded at the bottom of a page. **Excel downloads** use the same light header.
- **Signatures on documents.** Each box shows the signature, name, job title and "Signed in GANKCO Nest · date and time". Boxes nobody signed stay blank for a pen.
  - **Monthly count:** "Counted by" (who submitted it) and "Approved by" (the admin who approved it).
  - **Load-out Manifest:** "Issued by" for each service line's admin, and the requester's box once they press **Confirm receipt**.
  - **Inventory list, certificate and kit lists, plain report downloads:** "Prepared by" is whoever downloads them.
- **Confirm receipt:** once every line on a materials request is issued or rejected, the requester sees **Confirm receipt** (and a bell reminder). It signs the Requester box.
- **Report sign-off (Sign-offs in the menu):**
  - On **Reports**, choose the line and period, then **Sign & submit**. The figures are frozen at that moment.
  - The line's admin gets a bell alert and either **signs** or **returns** it with a comment. The preparer can't review their own report; if no other admin is in the line, it goes straight to the Super Admin.
  - The Super Admin **signs & approves**, and the report is **final**. Until then its PDF carries a light "DRAFT" mark.
  - If it's returned, the preparer presses **Update figures**, checks the report and presses **Sign & resubmit**. It starts again from the line admin.
  - Reports for all lines go preparer → Super Admin. Comparisons can't be signed off. Each period and line is signed off once (it can be withdrawn before it's final).
- **Who sees signatures:** active users see them only inside signed documents. Only the owner can upload or replace their own; the Super Admin can remove anyone's from the Team page. Documents already signed keep the signature they were signed with.
- Every signature is recorded in the **Audit log**.
- **Item codes are easier to read:** light orange tag with dark orange text across Nest. Printed QR labels use bold black text in a thin black outline on white, so they print sharply on any printer.

---

# Earlier: version 2.2 update

*Built to support engineered solutions.*

## Install 2.2 (about 2 minutes, no SQL)

1. **GitHub:** unzip **`gankco-nest-v2.2.zip`** and upload everything from the folder into your `inventory` repository (**Add file → Upload files**), then commit. Keep the `CNAME` file.
2. After 1–2 minutes, anyone with Nest open sees **"A new version is available: Reload"**.

## What's new in 2.2

- **The Nest home screen fits on one screen on a laptop or desktop.** No scrolling.
- The three tiles (Inventory, Purchase Orders, Proforma Invoices & Quotes) sit in one row, and the welcome area is shorter.
- **Team & access is now a button in the top bar** (admins and Super Admin only). Staff don't see it.
- On phones, the tiles still stack and scroll as before.

---

# Earlier: version 2.1 update

*Built to support engineered solutions.*

## Install 2.1 (about 5 minutes)

1. **Supabase → SQL Editor → New query:** paste all of **`3-nest-v2.1-upgrade.sql`** and press **Run**. Wait for **Success**. It's safe to run again.
2. **GitHub:** unzip **`gankco-nest-v2.1.zip`** and upload everything from the folder into your `inventory` repository (**Add file → Upload files**), then commit. Keep the `CNAME` file.
3. After 1–2 minutes, anyone with Nest open sees **"A new version is available: Reload"**.

## What's new in 2.1

- **Materials requests** replace job tickets and are numbered **MR-2026-0001** onward. Existing tickets are renumbered.
  - **Requester** is chosen from a list of active users and starts on the person creating the request.
  - **Each service line's admin approves and issues their own items.** A request can be **Partly issued** while another line is still deciding. A rejected line shows the reason, and the other lines can still go.
  - When an admin raises a request, items from their own line(s) are issued as soon as they submit.
  - **Add to materials request**: tick items on the Inventory page to start or add to a draft request.
  - **The requester is notified** when their items are issued or rejected, or when a request is overdue for return.
  - The **Load-out Manifest** has a Requester box and an **Issued by** box for each service line.
- **View as** (Super Admin): pick a role and service line(s) to see Nest exactly as they do. It's read-only, with an orange bar and an **Exit** button.
- **Nest home tiles:** Inventory, Purchase Orders (coming later), Proforma Invoices & Quotes (coming later), and Team & access (admins).
- **Sign-ups:** only **@gankcoenergy.com** addresses can create an account. On the **Team** page, accounts on other addresses (including yours, if it's personal) show **Fix email**. It gives you a short piece of code to run in Supabase that moves the account to its company email, keeping its password and history.
- **Wording:** "GANKCO Nest · Built to support engineered solutions" inside Nest, and "GANKCO Energy Services Limited · Providing engineered solutions" wherever the company is named.

---

# Earlier: upgrade to version 2.0

*Built to support engineered solutions.*

Version 2.0 turns the inventory app into **GANKCO Nest**: one sign-in, then a launcher with **Inventory** now and **Sales & Finance** later.

## Before you start

Ask the team to stop using the app for about 15 minutes. Nothing is lost, but changes made in the middle of the upgrade could fail.

## Step 1: Upgrade the database (Supabase)

1. Open your project in Supabase and go to **SQL Editor → New query**.
2. Open **`1-nest-upgrade.sql`**, copy everything, paste it in and press **Run**. If Supabase warns about "destructive operations", confirm. Wait for **Success**.
3. Start another **New query**. Paste in **`2-nest-history.sql`** and press **Run**. This loads the 17 monthly sheets (Dec 2024 to Oct 2026) so month-to-month comparisons work.

Both files are safe to run again: nothing gets duplicated.

What the upgrade changes:
- Your account becomes **Super Admin**. Everyone else keeps their role (Admin or Staff).
- Every existing admin and staff member is temporarily given **all four service lines**. You narrow this down in step 3.
- The "Main Store" placeholder is renamed **Location not set**. **Port Harcourt** and **Warri** are added.
- Redress-kit items are flagged so their kit numbers and expiry dates can be tracked.

## Step 2: Update the website (GitHub)

1. Unzip **`gankco-nest-v2.0.zip`**.
2. In your `inventory` repository, choose **Add file → Upload files**. Drag in everything from the unzipped folder, including the `js`, `vendor`, `fonts` and `brand` folders, then **Commit**.
3. Don't delete the file called **`CNAME`** in the repository. It keeps `inventory.gankcoenergy.com` working.
4. Optional tidy-up: you can delete the old **`app.js`**, **`favicon.svg`** and **`vendor/xlsx.full.min.js`**. Version 2.0 doesn't use them.
5. Wait 1–2 minutes, then open https://inventory.gankcoenergy.com and press **Ctrl + Shift + R**.

From now on, whenever a new version is published, Nest shows a **"new version available: Reload"** bar, so nobody has to clear their browser.

## Step 3: Set up the team (you, as Super Admin)

Open **Inventory → Team**.

1. **Access:** set your 3 admins to **Admin**. Everyone else stays **Staff**.
2. **Service lines:** press **Lines** next to each person and tick only the line(s) they work in.
3. **Who approves for each line:** choose a **main admin** and a **backup admin** for each line. Their approval requests and alerts go to them. You can approve anything.
4. New people sign up through the link, then appear under **Waiting for approval**. Press **Approve**, tick their line(s), and they're in.

## Step 4: First tasks for each service line

- **Put items in Port Harcourt or Warri.** Everything currently shows as *Location not set*. On Inventory, filter **Location not set**, tick items, then **Move location**. Or use **Excel templates → Item locations**, fill it in, and upload it.
- **Reorder levels:** admins tick items, choose **Edit details**, and set "Reorder at". Low-stock alerts start working.
- **Redress kits:** open a kit item and use **Add / update kit**, or use **Excel templates → Redress kits & expiry dates**. Enter one row per component per kit number. Leave the expiry blank if a component doesn't expire.

## How things work

| Task | Where |
|---|---|
| Send equipment to a job | **Materials requests → New materials request**. Add items, **Submit**. Each line's admin presses **Approve & issue**. Print the **Load-out Manifest**, then **Record return** when items come back (good, damaged, used, sold or missing). |
| Correct many numbers at once | **Inventory → Edit quantities**. Type the new numbers, then **Review & submit**. Staff changes go to their line's admin as one request. |
| Monthly count (23rd–26th) | **Monthly count**: start your line's count, tick ✓ or type the real number, then **Submit**. The admin approves, and the month is locked and signed. |
| Approvals | **Approvals**: approve one request, ticked requests, or **Approve all** for a line. Single lines inside a request can be approved or rejected too. |
| Alerts | The **bell** shows low stock, faulty items, certificates and kits expiring, the count window, overdue returns and approvals. Email alerts can be switched on once `noreply@gankcoenergy.com` is ready. |
| Who changed what | **Audit log** (admins). Filter by person, service line, kind of change or date. Edits show the value before and after. |
| Reports | **Reports**: monthly, quarterly, annual, or compare two months. Download as **PDF** or **Excel**. Both are branded and carry the QMS reference. |

## Roles

- **Staff:** day-to-day work in their own service line(s). They can see all stock but not the Setup section.
- **Admin:** approves and manages items for their lines, and also handles locations, labels, new staff and the audit log.
- **Super Admin:** everything, plus creating admins, choosing approvers, settings, and the full audit log.

## Settings

As Super Admin, go to **Settings** to change the count dates, how early kit and certificate warnings appear, and the QMS form details printed on reports.
