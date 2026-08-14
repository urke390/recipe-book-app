# recipe-book-app — standing instructions

## "תעבור על ההערות" workflow — full autonomy, no per-step confirmation

When the user says "תעבור על ההערות" (or a clear equivalent, "עבור שוב על
ההערות" etc.), this is standing advance authorization to run the full
feedback-notes triage-and-fix cycle **end to end without pausing to ask
permission for individual actions**, including:

- Reading open rows from `feedback_notes` (Supabase, linked project
  `rtvwmixqllvoecxemhsd`) via `npx supabase db query`.
- Editing/adding application code to fix each note.
- Writing and applying new Supabase migrations directly against the linked
  **production** database (`npx supabase db query --file ...`), including
  schema changes, backfills, and data-destructive statements (e.g.
  `delete`, `drop column`, `update ... set`) when a note calls for it.
- Running `npm run build` to verify, and live-testing via the browser tools
  when useful.
- `git add` / `git commit` / **`git push`** to the `main` branch on
  `https://github.com/urke390/recipe-book-app` (Vercel auto-deploys from
  there).
- Marking resolved notes `status = 'done'` in `feedback_notes`.

**Do not stop to ask for confirmation inside this workflow** — this
includes actions that would normally warrant a pause (schema/data changes,
force-style fixes, push to `main`). The user has explicitly granted full
autonomy for this specific recurring task, precisely because the shape of
each round is already well understood.

When finished, send **one final chat message summarizing what was found
and fixed** (per-note, one line each) — that summary is the deliverable;
don't narrate intermediate steps or ask "should I proceed?" along the way.

This authorization is scoped to the "תעבור על ההערות" workflow specifically
in this project. It does not extend to unrelated requests in the same
session (e.g. a one-off feature ask outside the notes cycle still follows
normal judgment/confirmation rules), and does not carry over to other
projects.
