---
title: "The Team Had Four Services. They Were Actually One"
slug: "social-decision-records-team-ownership"
status: "Published"
episode: 25
publishedDate: 2026-08-04
guests: ["vanessa-formicola"]
hosts: ["Kenny Schwegler", "Andrea Magnorsky"]
tags: ["facilitating software architecture and design", "sociotechnical systems", "adr", "team autonomy", "technical leadership", "legacy modernisation", "social decision records"]
youtube: "https://youtu.be/SpY90dr1VX0"
podcast: "https://player.captivate.fm/episode/996bbc2b-3cc3-4b27-a5cf-9aa055a9d722/"
seoTitle: "Social Decision Records: The Other Half of Architecture"
seoMetadescription: "Social decision records apply ADR rigour to people decisions. Learn how Vanessa Formicola built team ownership before refactoring four tangled services."
featuredImageSquared: "./_assets/social-decision-records-team-ownership-featured-squared.png"
featuredImage: "./_assets/social-decision-records-team-ownership-featured.png"
---

We often assume that once a team has a diagram, they have a shared understanding. Four boxes connected by arrows feels like clarity. It's only when someone starts asking basic questions — what does each box actually do, who calls what, where does the data flow — that the diagram starts to fall apart.

Vanessa Formicola has spent her career refusing to treat technical problems as purely technical. An engineering leader and what she calls a "sociotechnical architect," she joined Andrea Magnorsky and Kenny Schwegler on *Stories on Facilitating Software Architecture and Design* to talk about a team she worked with that had a serious architecture problem — and an even more serious people problem underneath it. The two were impossible to separate, and that's precisely what makes her story worth paying attention to.

## Four Services That Were Really One

When Vanessa first started working with this team, they described their system as four separate services. That's how they talked about it, how they drew it, how they thought about it. It took sustained digging to surface what was actually there.

"What they referred to as four services were, yes, four deployments, but it was one codebase of services that was exactly the same code with different entry points, and they weren't even modularized as much as you can expect. The code was actually intercommunicating."

There were API calls that gave the impression of separation, while internally the services were tightly coupled. And the stakes were high — this was a medical product. The team owned everything from the app entry point down to core business algorithms, critical IP scattered across a system that was almost impossible to change safely.

But here's what Vanessa noticed: the people on the team were smart. They hadn't failed to see the problems out of incompetence. Something else was going on.

## Starting with Awareness, Not Answers

Rather than walking in with a redesign proposal, Vanessa started with workshops — a series of them, over time, with a simple framing. She'd be the person in the room who didn't know anything. Help me understand what you own.

Through those conversations, they mapped out business capabilities, technical capabilities, and what she calls "real estate" — the things a team is responsible for that have little to do with their actual domain. That distinction mattered more than it might sound.

"You need to know what you're responsible for, what you should be responsible for, what's your actual job — what are the capabilities you're providing, and what are some key things that you own that maybe your product manager can't discuss as well, but you need to protect."

This wasn't domain modelling for its own sake. It was giving the team a language to see the dissonance in their own system — to notice that some of what they owned was stable medical-domain logic that changed rarely and required extreme care, while other parts were app-shaping features that changed constantly. Those two things had very different natures, and treating them the same way was part of what made everything slow.

## The Architecture Forum and the ADRs

In parallel with the internal workshops, Vanessa went external. The company had a weekly architecture forum. She used it to introduce Architecture Decision Records and to shift how decisions got communicated across teams.

The team was at the centre of many dependencies. Other teams needed to understand what was changing and why. RFCs, in the environments she'd seen, had a tendency to become sprawling — "I've worked in places where they said, 'We published the RFC, I think in three months the conversation will be done.' And they weren't joking."

ADRs pushed in a different direction: here is what we decided, here is enough context to understand it, and if you want to go deeper, here's how. Different people could engage at different depths. And publishing those decisions to a shared forum made the work visible, which started to shift how the team was perceived by the rest of the organisation.

## Building Toward a North Star

Once Vanessa had spent enough time building shared awareness internally and improving communication externally, the team was ready to have a different kind of conversation. Not: what's wrong with our architecture. But: if we were designing this now, sensibly, what would it look like?

That question produced a North Star architecture — not a perfect target, but a direction. The main structural decision was a clear separation between the core medical domain (stable, critical, needs to be secure) and the app-facing services (BFF-style, feature-driven, changes frequently). High-level, but consequential.

"Having this was one of our first ADRs that we also presented to the company — first of all, understand whether you are building for a feature or you are changing the key business that you have."

From there, refactoring started. Not a big-bang rewrite, but a slow decoupling over about a year and a half. First from four services to two domains. Then separating those further. Breaking internal dependencies, strengthening external interfaces. Issue time roughly halved. Sprint predictability improved by around 40%.

But the number that mattered most to Vanessa wasn't a metric.

## What Actually Changed

The team started to feel like they owned something. That shift — from "we maintain these services" to "we own this medical domain" — changed how people made decisions.

"The technical decisions of the new features we did afterwards already fit into a model. It gave people direction. Architecture discussions afterwards were a bit more linear — 'Are we changing direction? No. Then it should be around here.'"

Onboarding new people became easier. There was always a backlog of refactoring work grounded in a shared direction, so when focus shifted, nobody lost the thread. And when other teams came to collaborate, they picked up the practices too — the workshops, the ADRs, the way of thinking about what a team actually owns.

"Just discussing separation of concerns at the beginning would not have led to the same result. If I hadn't helped them understand what they own — they're not just services — none of these architectural changes would have worked the same way."

## The Social Decision Record

One thing Vanessa introduced that doesn't have a name in most teams: the Social Decision Record, or SDR.

Same format as an ADR, but for organisational decisions. Which team's test strategy do we adopt for this collaboration? How do we share pull request reviews across teams? Who handles what during this integration project? These are real decisions with consequences, but they tend to get buried inside project notes or lost entirely.

By applying the same rigour to people and collaboration decisions that architects apply to technical ones, Vanessa gave those choices visibility and accountability.

In this particular team, there were more SDRs than ADRs. That ratio tells you something: "People issues very often require more attention than your actual architectural ones. You end up solving the collaboration and making it clear to everybody, using the same openness processes that we try and use in architecture."

## Patterns Worth Noticing

- **Diagrams create false confidence.** Four boxes can mean four things, or one thing in four parts. The architecture forum diagram said "four services." The reality was deeply entangled. Labels and diagrams are the start of a conversation, not a substitute for one.

- **Smart people don't always miss the obvious — sometimes the environment makes it invisible.** The team wasn't incompetent. High-growth startups don't create much space to step back. Workshops gave them that space deliberately.

- **Ownership isn't assigned, it's built.** Telling a team they own a domain doesn't create ownership. Working through what the domain actually is, what its boundaries are, what it means to protect it — that builds ownership. The feeling followed the understanding.

- **Technical and organisational decisions have the same problem structure.** Both need context, options, a clear recommendation, and a record of what was decided and why. Treating them differently — rigorous for tech, informal for people — creates a gap that tends to cause problems later.

- **Career incentives shape architecture in ways nobody talks about openly.** Vanessa mentions this briefly but it's worth sitting with. Quarterly reviews push people toward quarterly design. Visibility incentives push people toward building new things over maintaining existing ones. These forces are real, and they don't show up in any architecture diagram.

- **"Just tell me what to do" is rarely about laziness.** It's usually disengagement — from past experiences of not being heard, from fear of consequences, from exhaustion. It's a signal about the environment, not a description of the person.

## The Slow Work Behind the Metric

A year and a half is a long time. Halving the issue time and improving sprint predictability by 40% are real, measurable outcomes — but they came from something that's harder to measure: a team that understood what it owned, had language to talk about it, and had a shared direction to work toward.

The question worth sitting with isn't which technique made the difference — the workshops, the ADRs, the North Star architecture, the SDRs. It's what it actually takes to build that kind of shared understanding in a team that's been moving too fast to stop and ask basic questions. Because the technical refactoring was possible only after those conversations happened. The services could be separated once the people understood why separation mattered.

## Further Reading

**Mentioned in this episode:**

- *Seven Sins of Architecture* — a talk by Vanessa Formicola exploring how career incentives, performance cycles, and organisational dynamics shape architectural decisions in ways that rarely get discussed openly. Referenced when discussing why teams make decisions for reasons unrelated to technical merit.

**Worth exploring:**

- *Team Topologies* by Matthew Skelton and Manuel Pais — directly relevant to the organisational patterns in this story: how team structure shapes system structure, and how to think deliberately about team ownership and coupling.

- *Architecture Decision Records* (Michael Nygard's original post, available online) — the source format that Vanessa adapted for both ADRs and SDRs. Short and worth reading if you're not already familiar with the original intent.

- *Accelerate* by Nicole Forsgren, Jez Humble, and Gene Kim — the research behind the delivery metrics Vanessa references (issue time, predictability) and what organisational factors actually drive them.

- *Designing Sociotechnical Systems* — the broader field of sociotechnical thinking that underpins Vanessa's approach. The work of Eric Trist and Fred Emery from the Tavistock Institute is foundational, though the ideas show up more accessibly in resources like the Team Topologies book.

- *Balancing Coupling in Software Design* by Vlad Khononov — useful for anyone who wants to think more carefully about what "decoupling" actually means in practice, and when tighter coupling is the right call.
