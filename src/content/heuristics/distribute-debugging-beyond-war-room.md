---
title: "Distribute debugging authority beyond the war room"
slug: "distribute-debugging-beyond-war-room"
status: "Published"
question: "How do you structure incident response when no single team has all the answers?"
type: ["guiding-heuristics"]
authors: ["Liz Fong-Jones", "Andrea Magnorsky", "Kenny Schwegler"]
submitter: "Liz Fong-Jones"
tags: ["incident-response", "distributed-systems", "coordination", "autonomy"]
complements: ["prioritise-recoverability-over-flawless-deployment"]
enables: ["build-safety-through-small-failures", "default-rollback-over-fix-forward", "executives-provide-resources-not-pressure"]
prerequisites: ["build-safety-through-small-failures"]
focusKeyphrase: "distributed incident response"
metaDescription: "Critical incident information often lives outside the war room. Structure response to let people surface solutions without waiting for invitation."
---

In complex systems, the person who can resolve an incident often isn't in the initial war room. They might not even know there's an incident. Effective incident response creates channels for people to surface solutions without requiring centralized coordination to find them first.

## Example

During a Google Cloud outage, the war room assembled the obvious suspects: the Google Front End team, the traffic team, and central incident management. But the fix came from an engineer who called in from outside that group. They had pushed a canary change, recognized the timing correlation with the outage, and had already started rolling it back before the war room even identified the root cause. The incident was resolved by someone who raised their hand, not by the war room finding them.

## Context

This requires both technical and cultural infrastructure. Technically, you need ways for people to see incident signals and join response efforts. Culturally, you need people to feel empowered to speak up even when they're not on the initial response team. The traditional model of "get the experts in a room" works when expertise is concentrated, but in distributed systems built by distributed teams, expertise is distributed too. Your incident response structure needs to match that reality.

## When This Might Not Apply

- Small teams (<10 people) where everyone is already in the war room.
- Highly sensitive security incidents requiring strict access controls.

## Variations

- For large organizations, use public Slack channels or status pages with clear "join here" instructions.
- In remote-first teams, maintain persistent incident dashboards visible to all engineers.
