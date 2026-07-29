---
title: "Evaluate architectural options against team frustrations"
slug: "evaluate-options-against-team-frustrations"
status: "Published"
question: "How do you know if a technical modernization will actually improve the team's situation?"
type: ["design-heuristics"]
authors: ["Gien Verschatse", "Andrea Magnorsky", "Kenny Schwegler", "Evelyn van Kelle"]
submitter: "Gien Verschatse"
tags: ["legacy modernisation", "technical debt", "team dynamics", "adr"]
complements: ["a-bounded-context-should-keep-its-internal-details-private", "align-with-evolutionary-stage-the-simon-wardley-heuristic", "write-down-decisions-early-and-often"]
specializes: ["make-decisions-transparant"]
metaDescription: "Test whether a proposed technical change will relieve the frustrations that make development difficult."
---

Before committing to a major architectural change, explicitly map it against the concrete frustrations that make the team's job difficult. A proposed solution might use modern technology but still leave developers dealing with the same unpleasant work. If the new architecture sits entirely beside the old system without addressing what actually bothers people day-to-day, you'll invest heavily without improving the situation that matters most.

## Example

A team maintained a legacy system with outdated technology that frustrated developers daily. When they decided to implement an event sourcing system, it was built completely alongside the existing system. Only after implementation did they realize it didn't tackle any of the emotional and practical pain points—developers still had to work in the old system, QA didn't know how to test the new patterns, and IT struggled with deployment. The architectural decision addressed someone's preference for modern technology but ignored what actually made the job unpleasant.

## Context

This matters especially when there's no dedicated architect role and the team is making decisions collectively. Create an explicit "wall" of what frustrates people—not just technical debt in abstract terms, but concrete things like "I have to program in VB and that's difficult" or "deployments are painful because IT doesn't understand the system." Then evaluate each proposed architectural option against that wall. You don't have to solve everything at once, but you should know whether your chosen direction provides any relief or just adds new complexity on top of old frustrations.

## When This Might Not Apply

- When frustrations are too vague or emotional to pin down concretely during EventStorming, as in the failed session.
- In teams where dominant voices prevent honest frustration-sharing without neutral facilitation.

## Variations

- For technical workshops, use the frustration wall as a literal physical/digital board for option evaluation.
- For legacy systems, prioritize frustrations by frequency and severity before mapping options.
