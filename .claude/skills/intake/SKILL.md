---
name: intake
description: Pick up a new feature request or change to virtualddd.com the right way — understand the page and its Notion data, name the friction, propose options with a recommendation, and ask before building. Use at the START of any work that will touch src/ or tests/, before editing. The start-of-loop bookend to review-change.
---

# Picking up a change here

**The rules are in [AGENTS.md](../../../AGENTS.md), and this file does not
repeat them.** It carries the procedure for the start of the loop, the way
[review-change](../review-change/SKILL.md) carries it for the end. If you find
yourself wanting to list the rules here, read `CLAUDE.md` first: *a second copy
is a copy that will drift*.

## What this is for

`review-change` catches a bad change on the way out. This exists so fewer are
made in the first place — and so the one step with no machine behind it does not
get skipped.

That step is **rule 4: propose options, then ask.** It is where the last
mistake happened: code changed before anyone worked out what the page was doing
or offered the maintainers a choice. No test can see an option you did not
offer. It rests on you, and it happens *here*, before the first edit — not as an
apology after one.

If a request is a pure content change, or an idea for later, you may be in the
wrong place entirely: content lives in Notion (rule 1), and feature ideas go to
the Virtual DDD ToDo board, not a file in this repository (rule 8). Check that
before you open an editor.

## Procedure

Do not edit anything in this pass. The output of intake is a shared
understanding and a recommendation — not a diff.

1. **Read the brief for the ground you are on.** `AGENTS.md` in full if you have
   not this session, then the one `docs/` page its table points to for the area
   you are touching. URLs → `docs/urls.md`. CSS or a component → `docs/brand-and-code.md`.
   A field or collection → `docs/content-model.md`. Titles or metadata → `docs/seo.md`.

2. **Work out what the page and the Notion data actually do.** Rule 4's own
   words. Open the page, follow it to its content in `src/content/` and back to
   the collection in `docs/content-model.md`. A request often dissolves once you
   see the data already carries what it asked for, or reveals that the fix
   belongs in the Notion schema, not the code (rule 7).

3. **Name the friction in one sentence.** What is actually wrong for a visitor
   or an editor? If you cannot say it in a sentence, you are not ready to propose
   a fix — you are ready to ask a question.

4. **Walk the lenses.** Not six people to become; six questions to ask of the
   one change in front of you. Most will not apply — say so and move on. The
   point is that none is skipped by accident.

   - **Visitor.** Who hits this page, and does the change serve what they came
     for, or what we find tidy? What does the friction cost them today?
   - **Design.** Does it hold the brand fixed — colours, logo, feel (rule 3,
     `docs/brand-and-code.md`)? Does `patterns.css` already have this filter
     bar, card or grid before you add another? If the change has a *look* and
     not only a behaviour, run [/ui-design](../ui-design/SKILL.md) to draw the
     option slate — its recommendation feeds the options in step 5.
   - **Front-end.** What already does this? A new component beside `TeaserCard`,
     a helper beside `src/lib/`, is a finding unless you can say why the existing
     one did not fit. Do the tests still select only `[data-test]` and `js-*`
     (rule 5)? Any weight added to the `dist` ceiling or the pagefind index?
   - **Architecture.** Does this belong in code at all, or in the Notion schema
     or editing workflow (rule 7)? Does it move a URL — and is that URL a promise
     already made (rule 2, `docs/urls.md`)? Can it ship as one small section, or
     does it drag four others with it (rule 6)?
   - **Security.** Any secret in reach? `NOTION_TOKEN` is not in this repository
     and must not arrive in it. Never hand-edit `public/.htaccess`; edit its
     generator. Nothing sensitive into a commit or a log.
   - **Content.** Is this content, which is Notion's and never hand-edited in
     `src/content/` (rule 1)? Is it an idea for later, which goes to the Notion
     ToDo board (rule 8)? Does copy or metadata pull in `docs/seo.md`?

5. **Draft options, with a recommendation.** At least two where the choice is
   real — including, honestly, "change nothing" or "change it in Notion, not
   here." Say which you would pick and why. Keep each to the smallest step that
   ships on its own (rule 6).

6. **Ask, then stop.** Put the friction, the options and your recommendation to
   the maintainers and let them decide. This is the barrier. Do not cross it into
   editing on your own authority — that is the exact rule that was broken.

## The handoff

When the maintainers have chosen, build the smallest version that ships, then
run **`/review-change`** before you push — this skill and that one are the two
ends of the same loop. What you produce here is the "what page and data do,
named friction, options offered" that `review-change` step 5 goes looking for.
Leave it in the conversation and the commit message so it can be found.

## What this is not

- Not a design review of the code — that is `review-change`, and it runs later.
- Not a licence to gold-plate. The friction you named is the job; the next one
  is a separate small step, or a card on the Notion board.
- Not a place to re-derive the rules. Point at them by number and move on.
