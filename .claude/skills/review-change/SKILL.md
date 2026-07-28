---
name: review-change
description: Review a change to virtualddd.com against the working brief, for what a test cannot see — reuse, additive bias, and the rules AGENTS.md admits nothing checks. Use before committing work that touches src/ or tests/, and in CI on push.
---

# Reviewing a change here

**The rules are in [AGENTS.md](../../../AGENTS.md), and this file does not
repeat them.** It carries the procedure. If you find yourself wanting to list
the rules here, read `CLAUDE.md` first: *a second copy is a copy that will
drift*. The hook list in `docs/testing.md` proved it — hand-maintained, and by
the time anyone looked it was thirteen short and named two hooks that no longer
existed.

## What this is for

`tests/conformance.test.mjs` already enforces what a machine can read from the
files: no test coupled to a styling class, no colour literal outside
`tokens.css`, no orphaned component, no export without a caller. **Do not
re-check those.** If they are broken, the build is already red.

This exists for what is only visible in a *diff*:

- **Reuse.** A machine sees that a new component is imported somewhere and calls
  it used. It cannot see that it is the fourth way to render a card.
- **Additive bias.** Adding is easy and deleting is frightening, so codebases
  grow monotonically unless somebody asks. Nothing in the suite asks.
- **The rules AGENTS.md marks "nobody".** Rule 4 (propose options, then ask) and
  rule 6 (small steps) have no machine behind them, on purpose. They are yours.

## Procedure

Work from the diff, not from the files. A file that reads fine can still be the
wrong change.

```sh
git diff origin/main...HEAD --stat          # shape first
git diff origin/main...HEAD -- src/ tests/  # then the substance
```

1. **Read the shape before the substance.** Which sections moved? A change
   touching four sections at once is worth questioning against rule 6 even if
   every line of it is good.

2. **For every added file, ask what already did this.** Search before judging —
   `src/components/` and `src/lib/` are small enough to know:

   ```sh
   ls src/components src/lib
   ```

   A new card component beside `TeaserCard`, a new date helper beside
   `src/lib/dates.ts`, a second way to resolve a person beside
   `src/lib/people.ts` — each is a finding unless the diff or the commit
   message says why the existing one did not fit.

3. **For every added block of CSS, ask what `patterns.css` already has.** The
   patterns file exists because three archives had each written their own filter
   bar. A page-scoped `<style>` that redefines a card, a chip or a grid belongs
   in the pattern, or the pattern needs a variant.

4. **Ask what the change deleted.** Not rhetorically — run it:

   ```sh
   git diff origin/main...HEAD --numstat -- src/ | awk '{a+=$1; d+=$2} END {print a" added, "d" deleted"}'
   ```

   A change that only adds is not automatically wrong. A *series* of changes
   that only add is additive bias, and this is the moment it is visible.

5. **For anything a visitor sees, check rule 4 was honoured.** Was the friction
   named and were options offered, or did somebody redesign and then explain?
   The evidence is in the commit message and the conversation, not the code.

6. **Check the change is finishable.** Does it leave the site in a state
   somebody could ship, or does it need a second commit to make sense? Sections
   ship independently here.

## What is not a finding

Noise costs more than it looks: a reviewer that reports twelve things gets read
once and skipped thereafter.

- Anything `tests/conformance.test.mjs` covers. It is already red or already green.
- Anything under `src/content/`. That is Notion's, written by the sync, and no
  human should be editing it — a separate CI step already fails that push.
- Style preferences the brief does not express. Long functions, comment density,
  naming — this repository has its own voice and it is not yours to normalise.
- A missing test for something the existing suite already covers by relationship.

## Reporting

Lead with the verdict, then the findings, worst first. For each one: the file
and line, what the change did, what already existed, and the smallest fix.

Be specific about confidence. "This duplicates `TeaserCard`" and "this may
duplicate `TeaserCard`, I did not check every prop" are different claims and the
reader needs to know which they are getting.

If the change is sound, say so in one line and stop. A review that manufactures
a finding to look useful trains people to ignore the next one.

Finish with the one question worth asking the maintainers, or "none".
