---
title: "When Fixing an Outage Means Staying Out of the Way"
slug: "psychological-safety-incident-response"
status: "Published"
episode: 16
publishedDate: 2026-03-31
authors: ["Liz Fong-Jones", "Andrea Magnorsky", "Kenny Schwegler"]
tags: ["Facilitating Software Architecture and Design", "Psychological Safety", "Sociotechnical Systems", "Engineering CUlture", "team collaboration", "Social Dynamics", "technical leadership"]
youtube: "https://youtu.be/URZL78DSpv4"
podcast: "https://player.captivate.fm/episode/cae1c91a-e8c6-401d-aaf6-58f4d3eac439/"
curatedHeuristics: ["design-as-living-conversation", "global-metadata-creates-global-risk", "executives-provide-resources-not-pressure", "build-safety-through-small-failures", "default-rollback-over-fix-forward", "distribute-debugging-beyond-war-room"]
seoTitle: "Incident Command and Psychological Safety"
seoMetadescription: "When a Google Cloud outage was fixed by someone no one paged, the real lesson was psychological safety. Learn how Liz Fong-Jones built resilient teams."
featuredImageSquared: "./_assets/psychological-safety-incident-response-featured-squared.png"
featuredImage: "./_assets/psychological-safety-incident-response-featured.png"
---

We often assume that resolving a major outage requires centralized command and control—getting the right experts in a room and coordinating their efforts until the problem is solved. But sometimes the best thing incident commanders can do is create space for the right person to surface.

That's the challenge Liz Fong-Jones shared with us in this installment of Stories on Facilitating Software Architecture and Design. It's a story about how a 30-minute Google Cloud outage was resolved not by the war room, but by someone who wasn't even on the initial response team.

## July 2018: When Google Cloud Went Dark

In July 2018, Liz had just joined Google's centralized incident management program as a volunteer. It's a role that exists at most large tech companies—a group of people scattered globally who can jump in when an outage is too big for any single team to handle.

Then her pager went off. Almost every Google Cloud service was down. Not just Google's own services, but every customer running on Google Cloud. Timeouts and error messages everywhere.

The initial response followed the playbook: bring in the Google Front End team (the massive reverse proxy handling all *.google.com traffic) and the traffic team responsible for load balancing and routing. When they realized the blast radius extended to customer services, they triggered a company-wide escalation. That's when Liz became incident commander.

## The Fix That Came From Outside

What happened next wasn't what you'd expect from a centralized war room.

"The fix to this evolved in parallel with the escalation room," Liz explained. "We had someone raise their hand and call into the escalation room who we would not have thought to tag in. And they said, 'I think this was my change that did this, and I've already started rolling it back.'"

The engineer hadn't hidden. Hadn't tried to cover up evidence. They called in, identified their change, and started reverting it—all while the war room was still trying to figure out what was happening.

The issue? A canary deployment system designed to limit blast radius had paradoxically caused a system-wide outage. The engineer had pushed a change to a development cluster meant to serve 0.0001% of traffic. But even though the canary was supposed to be isolated, information about it had to be pushed globally to all load balancers. That metadata triggered a bug causing front ends to crash when they encountered unexpected input.

When the engineer reverted the change, the crashes stopped immediately. The team could see leading indicators—the number of available front ends stabilizing. They still had to deal with thundering herds and backend pressure, but they had a mechanism of causation and a path to recovery.

## What Made Self-Correction Possible

This story highlights two critical patterns in incident response.

First, distributed debugging. "Everyone potentially holds the answer in their head," Liz noted. "You cannot centralize your incident band." No matter how well you coordinate a war room, the person with the critical information might not be in it.

Second, psychological safety. "This was not an environment where the engineer might have hidden under the desk or tried to cover up evidence of the change because they were afraid of being fired."

In the moment, Liz's response was purely functional: "Thank you for that information. Now let's see whether we can validate whether your fix worked." No dramatics. No recriminations. Just focus on recovery.

The recognition came later—through thorough retrospectives, emphasizing systematic changes rather than individual fault, and making sure the engineer knew this wasn't on them.

As Liz put it: "Why would you fire the employee that now has $10,000 worth of learning?"

## Unpacking the Dynamics

- **Executives staying out of the way**: Leadership joined the bridge to ensure the outage had sufficient resources and urgency, but they didn't speak up to pressure or intimidate. Their presence was about support, not control.

- **Immediate rollback over fix-forward**: The default response to instability is reverting to a known working state, not trying to patch things in production. Most of the time, you'll be correct.

- **Continuous learning at all scales**: Google didn't just debrief high-profile incidents. Every team regularly discussed learnings from incidents of all sizes. Psychological safety isn't built during crises—it's built in how you handle smaller failures.

- **Design ownership by teams, not individuals**: The people accountable for running a system long-term need input into its design. When individuals own designs, you get haunted graveyards—parts of the codebase no one dares touch because institutional knowledge has evaporated.

- **Safety features creating new failure modes**: A canary system designed to isolate risk created a new attack surface. The metadata about the canary had to be distributed globally, and that distribution path became the failure point.

## Building Resilience in Humans

Liz mentioned three heuristics for recognizing psychological safety:

1. Can people talk about smaller failures before bigger ones happen? 2. Are people punished for speaking out about missed deadlines or problems? 3. Do people feel safe asking questions that might seem obvious?

"There's no such thing as a dumb question," she emphasized. "I try to model this as a senior. It's important that we emphasize we all have things to learn."

She also noted the quiet moments that reveal fear: when someone uses an acronym no one understands, and the whole call goes silent. When juniors talk significantly less than seniors. When people won't revisit old decisions because "that was decided 10 years ago and I don't know why."

The challenge isn't just building resilient systems. It's building resilient people. If someone makes a mistake and the organization responds by crushing them, they won't be resilient the next time something breaks. And something will always break.

What matters is whether they feel safe enough to raise their hand, say what happened, and help everyone else stop looking in the wrong direction. That's the kind of resilience that actually prevents the next outage from lasting longer than it needs to.

## Further Reading

**Psychological Safety**: Book Amy C. Edmondson, *The Fearless Organization* - Shows how psychological safety enables teams to surface issues fast during incidents, just like the engineer who self-corrected without fear.[https://www.amazon.com/Fearless-Organization-Psychological-Safety-Performance/dp/1119477247]

**Incident Response**: Book John Allspaw & Jez Humble, *The DevOps Handbook* (Chapter on Incident Management) - Delivers practical patterns for distributed debugging and blameless post-mortems that match Liz's war room experience.[https://www.amazon.com/DevOps-Handbook-World-Class-Reliability-Organizations/dp/1942788002]

**Resilience Engineering**: Book Richard Cook, *Resilience Engineering in Practice* - Explains why centralized fixes fail and how self-correction through team ownership builds system resilience, echoing the outage resolution.[https://www.routledge.com/Resilience-Engineering-in-Practice-A-Guidebook-Hollnagel/978-1472421109]

**Canary Deployments**: Article Liz Fong-Jones, *Google Cloud Postmortem: Google Cloud outage on July 19th, 2018* - The official retrospective on this exact incident, detailing the canary bug and recovery steps.[https://cloud.google.com/blog/products/infrastructure-networking/a-postmortem-on-the-july-19-2018-google-cloud-services-outage]

**Continuous Learning**: Resource Google SRE, *Site Reliability Engineering Book* (Chapter 10: Managing Incidents) - Outlines Google's playbook for escalations, rollbacks, and learning from every incident size, as practiced here.[https://sre.google/sre-book/managing-incidents/]


lisa21_slides_perrywalcer.pdf [https://share.google/UQ1yEOKQMKGIuvDJr](https://share.google/UQ1yEOKQMKGIuvDJr)
