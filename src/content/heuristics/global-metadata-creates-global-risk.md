---
title: "Recognize that global metadata creates global risk"
slug: "global-metadata-creates-global-risk"
status: "Published"
question: "How do you limit the blast radius of canary deployments and experiments?"
type: ["design-heuristics"]
authors: ["Liz Fong-Jones", "Andrea Magnorsky", "Kenny Schwegler"]
submitter: "Liz Fong-Jones"
tags: ["distributed systems", "continuous delivery", "incident response"]
complements: ["prioritise-recoverability-over-flawless-deployment"]
enables: ["default-rollback-over-fix-forward"]
metaDescription: "Even isolated canary deployments create global risk if metadata about them must be distributed system-wide for routing decisions."
---

When you deploy a canary meant to serve a tiny fraction of traffic, you might assume the blast radius is limited to that fraction. But if every load balancer or router in your system needs metadata about the canary to make routing decisions, you've created a global distribution path that can fail globally.

## Example

Google's canary system was designed to serve 0.0001% of traffic to test releases safely. But for traffic routing to work, every front end needed information about which hosts were canaries and what protocols they supported. When one canary host communicated invalid metadata, it triggered crashes across the entire fleet serving Google Cloud traffic—not just the tiny canary slice. The safety feature designed to limit blast radius became the mechanism of a system-wide outage.

## Context

This pattern appears whenever you have centralized coordination of distributed components. The coordination mechanism itself becomes a critical path. Test not just whether your canary code works, but whether the metadata about your canary can be safely consumed by everything that needs to route to it. Consider what happens when that metadata is malformed or triggers edge cases in downstream consumers. The smaller your canary percentage, the less likely you are to catch these issues before they affect the whole system.Related 


## When This Might Not Apply

- Stateless protocols where metadata isn't required for routing decisions (rare in practice).
- Systems using sidecar proxies that can isolate metadata validation failures locally.

## Variations

- For development clusters, use isolated metadata namespaces that don't pollute production routing tables.
- In multi-region deployments, validate metadata schema compatibility across all consuming regions before global push.
