---
title: "Treat design as living conversation, not frozen artifact"
slug: "design-as-living-conversation"
status: "Published"
question: "How do you prevent architectural decisions from becoming unmaintainable haunted graveyards?"
type: ["value-based-heuristics"]
authors: ["Liz Fong-Jones", "Andrea Magnorsky", "Kenny Schwegler"]
submitter: "Liz Fong-Jones"
tags: ["software architecture", "team agency"]
complements: ["cultivate-ownership-for-decision-accountability"]
enables: ["build-safety-through-small-failures"]
prerequisites: ["build-safety-through-small-failures"]
metaDescription: "Design should be owned by teams, not individuals, with ongoing conversation about why decisions were made and when to revisit them."
---

When design decisions are made by individuals and treated as frozen artifacts, they become haunted graveyards—parts of the system no one dares change because institutional knowledge has evaporated. Design should be an ongoing conversation owned by the team that runs the system.

## Example

At Google, design ownership explicitly resided with teams, not individuals. This mattered because individuals transfer teams or leave companies. When everyone on a team understands not just what decisions were made but why they were made, people can ask whether conditions have changed enough to revisit those decisions. Without that shared understanding, you get the response: "That was decided 10 years ago, I don't know why, and I don't feel comfortable changing it."

## Context

This requires mechanisms for ongoing conversation: design reviews that include the people who will run the system, retrospectives that revisit architectural assumptions, documentation that captures not just what but why. It also requires psychological safety to question old decisions without being seen as attacking the people who made them. The goal isn't consensus on every detail—it's shared understanding of the tradeoffs and conditions under which decisions make sense. When conditions change, the conversation can continue instead of stopping dead.

## When This Might Not Apply

- Solo-founder projects where single-person ownership is the reality.
- Highly regulated systems where frozen designs serve as compliance artifacts.

## Variations

- For remote teams, use living design docs with comment threads tracking evolution discussions.
- In technical workshops, schedule quarterly "haunted graveyard tours" to surface and revive dead code areas.
