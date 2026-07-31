---
name: ui-design
description: Design any part of virtualddd.com a visitor sees — a layout, a component, a section's look, spacing, an interaction, new or restyled CSS. Produces a coherent slate of at least four options — the house fit, a genuinely divergent take, a deliberately opposite one, and one honest reject you would not ship — all holding the brand fixed, so the maintainers choose from a real spread and not a single first idea. Use BEFORE styling or adding/changing anything visible, whenever a change has a look and not only a behaviour.
---

# Designing a screen here

**The rules are in [AGENTS.md](../../../AGENTS.md) and
[docs/brand-and-code.md](../../../docs/brand-and-code.md), and this file repeats
neither.** It carries one method: how to arrive at a UI change with more than
one answer on the table, all of them coherent with a site that already exists,
and one of them honestly labelled the one you would not ship.

The sentence that makes this safe is in `brand-and-code.md`: **"The brand is the
fixed point, not the layout."** Hold that and you can throw the layout as far as
you like without doing damage. Forget it and the divergent option becomes a
brand violation wearing the word "bold".

## What this is for

A screen has more than one right answer, and the first one is rarely the best —
it is only the nearest. Rule 4 says offer options and ask; this says how to make
options that are *genuinely different from each other*, coherent with a site
that already carries six card components and a shared vocabulary, and honest
about the one that looks tempting and is wrong.

If the change is only behaviour with no new look — a filter that already has its
markup, a script — you are in the wrong skill. This is for what a visitor *sees*.

## The fixed point — true of all four options

None of the four may cross these. They are not the design space; they are its
walls. Read them in `brand-and-code.md`; do not re-derive them here.

- **The brand.** Colours come from `src/styles/tokens.css`; a component carries
  no colour literal. The card-colour grammar holds (dark `.card` is default,
  white `.card--heuristic` *means* heuristic and nothing else uses it). Text on a
  photograph gets `.scrim`. Text on a brand fill is `--on-brand` ink, never
  white — white on cyan measured 2.22:1. One primary action per view.
- **The closed sets.** Buttons and chips are families with fixed axes. A design
  may *position* a button; it may not restyle one, and it invents no third chip.
- **The accessibility floor.** 4.5:1 on brand fills, a visible focus ring,
  buttons ≥24×24, the skip link first, filtering announced, reduced-motion
  honoured — each held by a test. An option that needs one of these lowered is
  not an option.
- **`astro check` at 0/0/0**, and tests that select only `[data-test]` and
  `js-*` (rule 5) still pass.

Everything else is open: layout, density, hierarchy, grid versus single column,
what leads and what is demoted, the interaction, which shared pattern you lean
on. *That* is where the four options actually differ.

## Coherence first, before you draw

The site has already answered most of this once. Find that answer before
inventing another.

```sh
ls src/components src/styles      # six cards already; patterns.css is the vocabulary
```

- **What sibling section solves the nearest problem?** Match it, or say why this
  one is different. `docs/brand-and-code.md` names which component is *the* card
  (`TeaserCard`), *the* person (`PersonRow`), *the* filter (`CardFilter`).
- **Does `patterns.css` already have the piece?** `.card`, `.grid-cards`,
  `.btn`, `.chip`, `.hero-band`, `.section-head` and the rest. Coherence is
  reusing one, or adding a **variant there** — never a seventh card copied into a
  page's `<style>`. Copying is what once made "restyle the cards" a sixteen-file
  edit.

An option that reuses nothing is either a genuinely new pattern you can justify,
or it is the reject.

## The four

At least three real proposals — one of them the opposite — and a fourth you
would not ship. Fewer than four genuinely different answers means you have one
idea in four coats, which is not a choice.

1. **The house fit.** What this site does by reflex: the nearest existing
   pattern, matched to its sibling section, the safe coherent default. This is
   usually the recommendation — and if it is not, that difference is the most
   interesting thing you will say, so say why.

2. **The divergent.** A different *answer to the same friction*, not a reskin of
   the first — a different hierarchy or structure, still inside the walls above.
   Grounded, not exotic: the stories archive is already a single 52rem column
   rather than the card grid, on purpose, so "column instead of grid" is a real
   axis here, not a stunt.

3. **The opposite.** Deliberately invert the house instinct, to surface the
   assumption you did not know you were making. If the reflex is a grid of cards,
   this is one long editorial read; if the reflex is dense, this is spacious to a
   fault. It **must still hold the brand** — an opposite that breaks the fixed
   point is a straw man and teaches nothing. Kept honest, it is the option that
   occasionally turns out to be right.

4. **The reject — modelled, not hand-waved.** The one you do not want, drawn
   clearly enough that everyone sees *why*. Do not invent a weak one; reach for a
   real scar so the lesson is true:
   - a bespoke card styled in a page's `<style>` instead of a `.card` variant —
     the sixteen-file edit waiting to happen;
   - white text on a cyan or pink fill — 2.22:1, the RSVP-button failure;
   - copy set straight over a Kandinsky tile with no scrim, unreadable;
   - the shared grid forced onto the stories column, flattening a long read into
     a wall of thumbnails.

   Label it **THE REJECT**, name the rule or scar it breaks, and never let it
   drift up into the shortlist. Its entire job is to sharpen the other three by
   showing what they are avoiding.

## Showing the work

For each option, in a line or two: the structure; what it reuses (which
pattern, component or sibling section); how it holds the fixed point; what it
costs (a new variant? a new component? weight on the `dist` ceiling or the
pagefind index?). For the reject, what it breaks.

Then **recommend one** and say why. Where seeing beats reading, render the
shortlist against the *real* `tokens.css` and `patterns.css` — `astro dev`, or a
throwaway page that imports the actual styles — so the brand is shown, not
approximated. Never mock the colours; a preview in invented colours is worse
than prose, because it argues in a brand that is not ours.

Then it is rule 4: put the friction, the four and your recommendation to the
maintainers and let them choose. **Do not build past that barrier.** The reject
never ships; the opposite and the divergent ship only if chosen.

## What this is not

- **Not a brand exploration.** Four options, one identity. The colours, logo and
  feel are the fixed point (rule 3); if an option moves them it is the reject.
- **Not four reskins.** If the options are not different *answers*, you have one
  option and three coats. Make them differ where the walls allow — structure,
  hierarchy, density — not in trim.
- **Not a licence to ship the exciting one.** The opposite being fun is not the
  maintainers choosing it. Recommend, ask, then the smallest version that ships
  (rule 6).
- **Not `review-change`.** That runs *after*, on the built change. This runs
  *before*, on the idea. It is the design half of what [intake](../intake/SKILL.md)
  opens; hand your recommendation back to intake's options and carry on.
