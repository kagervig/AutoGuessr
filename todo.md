# Todo: Image Problem Reporting Feature

## Steps

- [ ] **Prompt 1** — Schema: add `needsReview` to `Image`, add `ImageReport` model, run migration
- [ ] **Prompt 2** — Install Resend, create `app/lib/email.ts` with `sendImageReport`
- [ ] **Prompt 3** — Create `GET /api/images/[id]` route (image + vehicle details)
- [ ] **Prompt 4** — Create `POST /api/report` route (validate, persist, deactivate, send email)
- [ ] **Prompt 5** — Create `/report/[imageId]` page and `ReportForm` client component
- [ ] **Prompt 6** — Wire "Report a problem" link into `GameScreen`
- [ ] **Prompt 7** — Add "Reported" tab + `GET /api/admin/reported` to admin panel

## Notes

- Resend API key must be added to `.env.local` as `RESEND_API_KEY` after Prompt 2
- Certainty threshold for deactivation: >= 75%
- Report email goes to: kpallin90@gmail.com
- See `plan.md` for full prompts and architecture notes
