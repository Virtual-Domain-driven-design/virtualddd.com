---
title: "Prioritise Recoverability Over Flawless Deployment"
slug: "prioritise-recoverability-over-flawless-deployment"
status: "Published"
question: "In modern distributed systems, where should we focus our efforts: defect prevention or incident recovery?"
type: ["design-heuristics"]
authors: ["Anne-Marie Charrett"]
submitter: "Anne-Marie Charrett"
tags: ["Resilient Engineering", "Recoverability", "Software Design", "Quality"]
complements: ["global-metadata-creates-global-risk", "distribute-debugging-beyond-war-room", "default-rollback-over-fix-forward"]
---

Shift focus from attempting to eliminate every bug before deployment to ensuring rapid recovery from failure in production. The cost of a quickly remediated production incident is often lower than the cost of maintaining complex, slow, and brittle pre-production environments. Invest heavily in observability, monitoring, and fast rollback capabilities.

### Example

We accept the risk of minor bugs reaching production, provided we can detect and roll back a change in under five minutes. This is more efficient than maintaining a costly and slow system integration test environment.


