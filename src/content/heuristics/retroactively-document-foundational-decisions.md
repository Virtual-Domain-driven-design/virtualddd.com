---
title: "Retroactively Document Foundational Decisions"
slug: "retroactively-document-foundational-decisions"
status: "Published"
question: "How do we handle critical, undocumented decisions made in the project's past?"
type: ["guiding-heuristics"]
authors: ["Andrea Magnorsky", "Andrew Harmel-Law", "Kenny Baas-Schwegler"]
submitter: "Andrew Harmel-Law"
tags: ["ADR", "Decision-Making Process", "Decentralised Decision-Making", "Facilitating Software Design and Architecture"]
---

Reverse-engineer Architecture Decision Records (ADRs) for foundational decisions that were never formally documented. This makes implicit constraints explicit, clarifies historical context, and allows the team to re-evaluate them. It provides a clear baseline for new team members and future decisions. 

One useful approach is to conduct an EventStorming and focus on domain events that highlight important past events and decisions made. That way, modelling a timeline of relevant information that led up to certain decisions. After the EventStorming you can then write these down in ADR’s.

### Example

An architect offered to write down past decisions, like why a technology was chosen, creating ADRs to fill in the project’s history. This gave clarity on original constraints, such as not having enough people at the time.


