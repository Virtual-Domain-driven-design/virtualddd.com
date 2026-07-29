---
title: "They Knew the Answer Before They Understood the Problem"
slug: "impact-mapping-before-architecture"
status: "Published"
episode: 21
publishedDate: 2026-06-09
guests: ["kim-kao"]
hosts: ["Andrea Magnorsky", "Kenny Baas-Schwegler", "Andrew Harmel-Law"]
authors: ["Kim Kao", "Andrea Magnorsky", "Kenny Schwegler", "Andrew Harmel-Law"]
tags: ["facilitating software architecture and design", "domain-driven design", "legacy modernisation", "stakeholder communication", "collaborative modelling", "impact mapping"]
youtube: "https://youtu.be/td_vdQgeVwY"
podcast: "https://player.captivate.fm/episode/abc53c50-27c3-420f-a470-be1238b3e88a/"
seoTitle: "Impact Mapping Before Architecture: Solve the Right Problem"
seoMetadescription: "When a vendor said Kubernetes would fix everything, Kim Kao used impact mapping to uncover the real problem first. Learn to solve the right problem."
featuredImageSquared: "./_assets/impact-mapping-before-architecture-featured-squared.png"
featuredImage: "./_assets/impact-mapping-before-architecture-featured.png"
---

We've all been in that meeting. Someone senior has already decided on a solution — maybe they read something, maybe a vendor pitched it to them — and now the conversation isn't really about the problem anymore. It's about justifying the answer that's already been chosen. The hard part isn't disagreeing. It's finding a way to redirect without making anyone feel foolish.

Kim Kao, a solutions architect manager at AWS based in Taiwan, shared exactly this kind of situation in Episode 21 of Stories on Facilitating Software Design and Architecture. A retail client came to him having already been told by another vendor that Kubernetes was the fix for their operational problems. What followed is a useful lesson in why slowing down to understand a problem is often faster than rushing to solve it.

## The Answer Was Already in the Room

The general manager was direct: the business had been hit hard, competitors were circling, and someone needed to do something. A vendor had already provided the answer — containerise everything, deploy Kubernetes, and the operational problems would go away.

Kim's reaction was measured. "I told them, if you found this is the only way to go, then just go. But you cannot afford it day by day, week by week." He wasn't dismissing the technology. He was pointing at the practical reality: a retail business running major promotions for over a million active members, with infrastructure still on-premises, facing three-to-six-month hardware procurement cycles. Throwing containers at a system nobody fully understood was not going to make that better.

The problem wasn't the infrastructure. The problem was that nobody had a clear picture of what they were actually dealing with.

## A System Nobody Fully Understood

When Kim started asking questions about the existing system, a familiar picture emerged. The core platform had been built over twenty years. Most of the current team had no idea how it was constructed, who had made which decisions, or why certain things worked the way they did. "Nobody knows what the content is," as Kim put it.

This isn't unusual. It's one of the more common situations in software — a system that has accumulated years of decisions, workarounds, and undocumented logic, to the point where it becomes something the organisation both depends on and fears. The instinct is often to either leave it alone or replace it entirely. Neither tends to work well without first understanding what you're dealing with.

Kim didn't try to reverse-engineer the whole system. Instead, he suggested they step back further and look at what the business was actually trying to achieve.

## Impact Mapping Before Architecture

Rather than moving straight into technical investigation, Kim introduced impact mapping — a structured way of working backwards from a goal. Who needs to be involved? What behaviours do we need to change or enable? What do we actually have to build?

He gathered decision-makers and functional leads: the marketing team, inventory managers, logistics stakeholders. The goal was simple to state — increase month-on-month revenue — but the conversation that followed was revealing. When Kim asked who would support that goal, the room went quiet.

"They were just like fallen into a silent space. They couldn't figure out who the supporters were." The team was used to receiving instructions, not mapping out cross-functional dependencies. The impact mapping session forced something that hadn't happened before: people from different parts of the business sitting in the same room, working out how their work connected to everyone else's.

The marketing team knew user behaviour from analytics. The inventory team understood consumption rates and merchant performance. Logistics had visibility into fulfilment timelines. None of them had been talking to each other in a way that connected those perspectives. Kim's role was to create the conditions for that conversation to happen.

## EventStorming as a Way Into the Complexity

Once the impact mapping had given them a clearer picture of where to focus, Kim moved into EventStorming. He ran a two-day workshop with around forty to fifty people — project managers, product owners, sales staff, engineers. For many of them, it was the first time they had all been in the same room working through the same process together.

Through that process, a clearer starting point emerged: merchant management. The logic was straightforward. If you want to change how products are sold, you have to understand how merchants and selling policies are set up. Everything else in the retail process flows from that point. Starting anywhere else would mean building on top of problems rather than addressing them.

"Otherwise you just try to decorating everything on top of the weakness," Kim said. "That was quite dangerous."

The output wasn't a finished design. It was a first draft — a candidate for extracting merchant management from the legacy system and moving it toward a cloud-ready microservices design. Not complete, but concrete enough to have a real conversation about what to do next.

## What Made the Difference Here

Looking at what Kim did across this engagement, a few things stand out:

- **He made the cost of the existing approach visible.** Rather than arguing against Kubernetes in principle, he helped the client see why it wouldn't solve the actual problem — the uncertainty about load, the hardware lead times, the complexity nobody had mapped.

- **He separated symptoms from causes.** The infrastructure strain was real, but it was a symptom. The causes were deeper: a system nobody understood, a business process nobody had mapped end to end, and teams that had never been brought into the same conversation.

- **He used facilitation to create knowledge, not just to gather it.** The impact mapping and EventStorming sessions weren't information-collection exercises. They were the mechanism by which the organisation started to understand itself. Kim described his role as a "conjunction" — someone who helps connect what people know to the decisions they need to make.

- **He brought the client to the tools rather than just using the tools on them.** Sending tickets to DDD Taiwan, inviting team members to see how practitioners from different backgrounds engaged with these ideas — that was a deliberate move to let the client discover the value of the approach, rather than just being told about it.

- **Starting points matter.** Choosing merchant management as the entry point wasn't arbitrary. It was the result of working backwards from business impact. A different starting point might have produced a technically interesting result that had no meaningful effect on what the business actually cared about.

## The Technical Problem Was Always a People Problem

By the end of the engagement, Kim had helped a retail business take a first step toward untangling a twenty-year-old system — not by applying the latest technology, but by getting the right people in a room together and helping them think clearly about what they were trying to achieve.

His observation near the end is worth sitting with: "I found I was a businessman, not a technical guy." That's not a rejection of technical expertise. It's a recognition that the technical work only becomes valuable when it's connected to a clear understanding of what the business actually needs. The architecture follows from that. It doesn't precede it.

The question this raises for anyone doing similar work: when a client or colleague comes to you with an answer already in hand, what does it take to create enough trust and space to ask whether they've actually understood the problem first?

## Further Reading

**Worth exploring:**

- *Impact Mapping* by Gojko Adzic — The book that defines the practice Kim used to help the client work backwards from business goals to stakeholder needs and deliverables. Directly relevant to the workshop approach described in this episode.

- *Escaping the Build Trap* by Melissa Perri — Explores how organisations get stuck optimising for output rather than outcomes, which maps closely to the dynamic Kim encountered with a client focused on a solution before understanding the problem.

- *The Squiggly Line: Facilitating Groups to Think Creatively and Act Collaboratively* aside, a more grounded option: *Facilitating Breakthrough* by Adam Kahane — Practical guidance on how to help groups in conflict or confusion work toward shared understanding, relevant to the cross-functional facilitation Kim describes.
