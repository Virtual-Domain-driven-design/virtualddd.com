---
title: "Consider downstream teams when choosing architectural patterns"
slug: "consider-downstream-teams-architectural-patterns"
status: "Published"
question: "How do you avoid creating problems for teams that deploy and test your software?"
type: ["guiding-heuristics"]
authors: ["Gien Verschatse", "Andrea Magnorsky", "Kenny Schwegler", "Evelyn van Kelle"]
submitter: "Gien Verschatse"
tags: ["adr", "team topologies", "continuous delivery", "testing", "decision-making process"]
competesWith: ["respect-apathy-in-decision-making"]
complements: ["align-with-evolutionary-stage-the-simon-wardley-heuristic", "write-down-decisions-early-and-often", "make-decisions-transparant"]
enables: ["prioritise-foundation-trust-in-the-team"]
prerequisites: ["notice-working-too-hard-facilitator"]
metaDescription: "Think through how architectural changes will affect QA, operations, and other teams before implementation."
seoTitle: "Consider Downstream Teams When Choosing Patterns"
---

When choosing an architectural approach, explicitly think through what it means for the teams that deploy, test, and support your software—not just what it means for developers. Introducing patterns like message queues or event sourcing changes how QA needs to test and how operations needs to deploy. If these teams don't understand the new patterns and you haven't thought through their experience, your architectural improvement becomes everyone else's problem.

## Example

A team implemented event sourcing in a system deployed on-site with sensitive data. Developers focused on the technical implementation without considering consequences for other teams. IT received deployment instructions for queues and patterns they'd never worked with before. QA didn't know how to test the new architecture properly. Both teams struggled because nobody had thought through what the architectural change meant for their work, leading to frustration across the organization.

## When This Might Not Apply

- In fully autonomous stream-aligned teams with no handoffs to separate QA/ops teams.
- When downstream teams are contractually insulated from your changes via strict APIs.

## Variations

- For on-premises deployments with sensitive data, create joint workshops with IT/QA before finalizing patterns.
- When working with executives, quantify downstream impact in terms of deployment delays and support costs.
