---
title: "Prioritise System Integrity Over Local Convenience"
slug: "prioritise-system-integrity-over-local-convenience"
status: "Published"
question: "How do we resolve conflicts between a team's desire for local implementation convenience and broader architectural principles?"
type: ["design-heuristics"]
authors: ["Kenny Baas-Schwegler", "Andrea Magnorsky", "Andrew Harmel-Law"]
submitter: "Kenny Schwegler"
tags: ["sociotechnical systems", "software architecture", "facilitating software architecture and design", "decentralised decision-making", "strategic design", "distributed systems"]
---

When a team’s decision optimises for their immediate convenience at the cost of system-wide integrity, the architectural perspective must prevail. The architect’s role is to advocate for the long-term health of the system, even if it means more work for a team in the short term. This prevents the accumulation of technical debt across service boundaries.

## Example

A team wanted to model a feature within their service because their libraries made it easier, but the architect advised against it because the feature clearly belonged in a different system.
