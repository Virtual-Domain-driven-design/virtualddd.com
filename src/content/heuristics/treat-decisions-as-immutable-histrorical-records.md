---
title: "Treat Decisions as Immutable Historical Records"
slug: "treat-decisions-as-immutable-histrorical-records"
status: "Published"
question: "How should we manage the evolution of a decision over time, especially when it is reversed?"
type: ["guiding-heuristics"]
authors: ["Andrea Magnorsky", "Andrew Harmel-Law", "Kenny Schwegler"]
submitter: "Andrew Harmel-Law"
tags: ["Facilitating Software Design and Architecture", "Decision-Making Process", "ADR", "Software Architecture"]
---

Document each decision as a distinct, immutable record, such as an Architectural Decision Record (ADR). A subsequent choice that alters a previous one should be a new, separate record that explicitly supersedes the original. This maintains a clear historical log and prevents the paralysis that comes from endlessly reopening past choices.

## Example(s)

An engineer makes a decision during an incident and documents it in an ADR. When this is later reversed, a new ADR is created to supersede the first one, rather than editing or deleting the original record.
