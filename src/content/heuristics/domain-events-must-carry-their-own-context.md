---
title: "Domain Events Must Carry Their Own Context"
slug: "domain-events-must-carry-their-own-context"
status: "Published"
question: "How can we determine if an event is a valuable Domain Event or just technical noise?"
type: ["design-heuristics"]
authors: ["Krisztina Hirth", "Andrea Magnorsky", "Kenny Schwegler"]
submitter: "Krisztina Hirth"
tags: ["Event-driven architecture", "Bounded Context Design", "Coupling", "Distributed systems", "Facilitating Software Design and Architecture"]
---

A true Domain Event communicates a significant business occurrence and must contain sufficient context for consumers to act without querying the source system. If consumers frequently need to ask 'why' or 'what does this mean', the event is a poorly designed technical notification. It must report on the business, not the implementation.

## Examples

The team published technical events that were like log entries, forcing consumers to ask for more information. A proper domain event would embed the business reason and context, making it independently useful.
