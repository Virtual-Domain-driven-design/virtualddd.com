---
title: "Misaligned Expectations: When Goals Don't Align"
slug: "misaligned-expectations-goals-dont-align"
status: "Published"
episode: 11
publishedDate: 2026-01-18
authors: ["Beija Nigl", "Michael Plöd", "Kenny Schwegler", "Andrew Harmel-Law"]
tags: ["Collaborative Modeling", "Software Architecture", "Sociotechnical Systems", "Facilitating Software Architecture and Design", "Stakeholder Alignment", "Domain-Driven Design"]
youtube: "https://youtu.be/P67pgiGSWfU"
podcast: "https://player.captivate.fm/episode/c328974e-e58f-4054-87e4-7945ca286668/"
curatedHeuristics: ["deliver-difficult-conversations", "approach-struggling-facilitator", "guide-unprepared-facilitator", "communicate-critical-workshop-insights", "realign-workshop-goals", "steer-workshop-discussions", "facilitate-conflicting-decisions", "shift-design-focus-business-problems", "workshop-stakeholder-alignment"]
seoMetadescription: "Beija Nigl on what to do when the sponsor's goal contradicts the team's — discovered 48 hours before a legacy modernisation kicks off."
featuredImageSquared: "./_assets/misaligned-expectations-goals-dont-align-featured-squared.png"
featuredImage: "./_assets/misaligned-expectations-goals-dont-align-featured.png"
---

We often assume that once we get everyone in a room for a design workshop, the hard part is over. But what happens when the person signing off on the whole thing has a fundamentally different idea of the workshop's purpose than you do — and you only find out two days before it starts?

That is the challenge Beija Nigl shared with us in this instalment of Stories on Facilitating Software Architecture and Design. This is a story about misaligned expectations, the weight of legacy, and the facilitator’s tightrope walk.

## The Legacy Challenge

Beija was brought in to help a team grappling with a 20-year-old legacy Java 8 system. As support for Java 8 was ending, they had to decide its future. The product owner Beija worked with was clear; the system's processes were broken, dominated and shaped by the technical implementation, and buggy. Many edge cases due to poor (or at least not state-of-the-art) implementation led to unnecessary processes and checks for downstream teams. The product owner saw a clear need to rebuild and rethink the entire thing. This set the stage for a collaborative modelling workshop, likely an EventStorming session, to understand the legacy system and plan its replacement.

## Setting the Stage, Uncovering the Rift

For Beija, "setting the stage" sessions with stakeholder groups before the main workshop are an integral part of her workshop preparation. This helps manage expectations and explain the process. She did this with everyone, including the product owner's manager, who was the process owner and sponsor. Beija assumed the product owner and their manager were aligned.

Two days before the workshop, this assumption was shattered. The manager's goal was simple: document all existing edge cases to rebuild "basically the same thing." The product owner and Beija, however, wanted to rethink the entire process, addressing not just business-driven edge cases but also those caused by poor implementation. With no time to fully realign, Beija decided to proceed, using the workshop itself to reveal the true state of affairs to the manager.

## The Workshop: Documentation Over Design

The workshop began with the manager's introduction, which, predictably, framed the session as a documentation exercise. This set the tone for the entire two days. Participants, mostly business people, dove deep into the technical minutiae of the existing system: "status 800 is this, status 300 is that," and the critical role of "nightly runs" in changing statuses.

The session became an exhausting effort to map the "as-is" system, focusing on intricate technical states rather than business outcomes or potential improvements. It was a struggle to shift the conversation towards "what do we actually want to achieve?" The energy was spent documenting, not designing.

## The Unexpected Outcome

While the workshop didn't achieve the "rethink" goal, nor did it serve as an effective documentation meeting (Event Storming isn't designed for that), it wasn't a total failure. It laid a crucial foundation by making the sheer complexity and technical debt of the current system visible. It clearly showed which parts of that complexity stemmed from business logic versus those driven solely by the existing implementation.

The key takeaway for Beija was the critical importance of aligning all powerful stakeholders on the workshop’s explicit intention and goal *before* it begins. Relying on assumptions, especially with those in positions of authority, can derail the best-laid plans. 

## Unpacking the Dynamics

- **Goal Misalignment:** The fundamental conflict stemmed from the sponsor's desire to document the existing system versus the team's and facilitator's aim to rethink and redesign it. This was the main cause of the workshop's struggle.

- **Impact of Authority:** The sponsor's introduction, even if brief, powerfully steered the participants' focus. Their perceived objective became the de facto objective for many in the room.

- **Technical vs. Business Focus:** Legacy systems often entrench technical details within business processes. Extracting business intent from technical implementation becomes a significant challenge, especially when participants are deeply familiar with the technical "how."

- **Emotional Attachment to the "As-Is":** People develop comfort and expertise around existing, even flawed, systems. Moving away from familiar status codes and nightly runs can feel like losing control or devaluing the knowledge they’ve accumulated. This emotional aspect needs careful handling.

- **The Facilitator's Dilemma:** Beija faced a tough choice: maintain neutrality and let the workshop drift, or intervene and risk overstepping her role or alienating the sponsor. Her decision to proceed and use the workshop as a diagnostic tool was a pragmatic compromise.

- **The Consultant's Role:** As an external consultant, Beija had the leverage to deliver "ground truth" to the manager after the workshop, highlighting the observed insights and offering recommendations. This objective perspective can be invaluable when internal dynamics make such conversations difficult.

- **Preparation as Alignment:** The story underscores that "preparation" for a workshop isn't just about logistics and agenda; it's fundamentally about ensuring a shared understanding of purpose and desired outcomes among all key players.

## The Como Prep Canvas Origin Story

This workshop became the catalyst for Beija creating the [Como Prep Canvas](https://github.com/ddd-crew/como-prep-canvas)—a structured way to surface these alignment issues before they derail a session. The problem wasn't that Beija missed something subtle. It was that the standard prep approach doesn't force explicit conversations about conflicting goals at the top.

"If I would've had some more guidance before to be like, what questions help me if I'm a facilitator," Beija reflected, "it would've helped me to make my gut feeling explicit and by this tangible."

The insight: your gut knows when something's off. The question is whether you have a framework that lets you act on it early enough to matter.



This story reminds us that facilitation isn't just about managing sticky notes; it's about navigating human dynamics and organisational power structures. Sometimes, the most valuable outcome of a workshop isn't the solution it generates, but the uncomfortable truth it uncovers, paving the way for more effective conversations down the line. Getting everyone on the same page, with explicit agreement on the "why" and "what," is not a luxury, but a prerequisite for any truly productive collaborative effort.
