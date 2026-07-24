---
title: "A bounded context should keep its internal details private"
slug: "a-bounded-context-should-keep-its-internal-details-private"
status: "Published"
question: "How can we lower coupling from between bounded contexts or systems"
type: ["design-heuristics"]
authors: ["Mathias Verraes"]
tags: ["Bounded Context", "Distributed systems", "Coupling"]
complements: ["evaluate-options-against-team-frustrations"]
---

If you are keeping monetary units in say 10 digits internally in a service, you would only pass out an amount in 2 digits precision because that’s all other consumers of the event would need


