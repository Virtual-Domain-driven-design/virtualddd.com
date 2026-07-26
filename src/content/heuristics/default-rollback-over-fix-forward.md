---
title: "Default to rollback rather than fix-forward"
slug: "default-rollback-over-fix-forward"
status: "Published"
question: "When a deployment causes an outage, should you revert or try to fix it in production?"
type: ["design-heuristics"]
authors: ["Liz Fong-Jones", "Andrea Magnorsky", "Kenny Schwegler"]
submitter: "Liz Fong-Jones"
tags: ["incident-response", "deployment", "resilience", "recovery"]
complements: ["prioritise-recoverability-over-flawless-deployment"]
enables: ["build-safety-through-small-failures", "global-metadata-creates-global-risk", "distribute-debugging-beyond-war-room"]
prerequisites: ["build-safety-through-small-failures"]
focusKeyphrase: "rollback over fix-forward"
metaDescription: "When a system enters an unstable state, reverting to a known working state is safer than attempting forward fixes in production."
---

When a deployment triggers an outage, the safest first response is reverting to the last known stable state rather than attempting to fix the problem forward in production. You have a working baseline to return to, and most of the time that will restore service faster and more reliably than debugging under pressure.

### Example

During a Google Cloud outage in July 2018, an engineer's canary deployment triggered crashes across the front end fleet. Rather than trying to patch the issue in production, they immediately rolled back the change. The crashes stopped, and while recovery wasn't instant due to thundering herds and backend pressure, the team had clear leading indicators that they were on the right path. The rollback gave them a stable foundation to understand what went wrong.

### Context

This heuristic works best when you have good deployment practices that make rollbacks safe and fast. It assumes you can get back to a previous state without introducing new problems. The key insight is that fixing forward requires understanding the problem while the system is on fire—rollback buys you time to understand the failure in a stable environment. Of course, this doesn't work for schema migrations or situations where state changes can't be easily reversed, but for most code deployments, it's the right default move.

### Related Heuristics
- **Distribute debugging authority beyond the war room**: Rollback works when the right person can spot and act on the failure signal without war room approval.
- **Build psychological safety through how you handle small failures**: Engineers rollback faster when they know admitting the problem won't get them punished.

### When This Might Not Apply
- Schema changes or data migrations where rollback would leave the database in an inconsistent state.
- Stateful distributed systems where partial rollbacks create split-brain scenarios or divergent replicas.

### Variations
- For remote incident response, use automated rollback pipelines with clear validation gates before full revert.
- In canary deployments, rollback only the canary metadata distribution while keeping the code change isolated.
