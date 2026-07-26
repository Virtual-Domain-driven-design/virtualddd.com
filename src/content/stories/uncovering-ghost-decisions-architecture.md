---
title: "Uncovering the Ghost Decisions in Your Architecture"
slug: "uncovering-ghost-decisions-architecture"
status: "Published"
episode: 3
publishedDate: 2025-09-30
authors: ["Andrea Magnorsky", "Kenny Schwegler", "Andrew Harmel-Law"]
tags: ["ADR", "Software Architecture", "Social Dynamics", "Facilitating Software Architecture and Design", "Power Dynamics"]
youtube: "https://youtu.be/MCiO_CgEGrI"
podcast: "https://player.captivate.fm/episode/fc4b652d-b818-4669-af76-27577cd253d6/"
curatedHeuristics: ["acknowledge-significant-conflict-in-decision-rationale", "decompose-large-decisions-into-smaller-ones", "acknowledge-downsides-and-dissent-in-decisions", "revisit-decisions-when-context-changes", "retroactively-document-foundational-decisions"]
focusKeyphrase: "ghost decisions architecture"
seoTitle: "Uncovering Ghost Decisions in Architecture"
seoMetadescription: "How to find the undocumented 'ghost decisions' shaping your architecture, and how Architecture Decision Records bring them into the open."
featuredImageSquared: "./_assets/uncovering-ghost-decisions-architecture-featured-squared.png"
featuredImage: "./_assets/uncovering-ghost-decisions-architecture-featured.png"
---

Welcome to our ongoing series on facilitating software design and architecture, featuring Andrea, Andrew, and Kenny, as we explore the stories that shape our work.

In this episode, Andrew shares a story that will sound familiar to many of us. It’s about the decisions that are made before we even arrive on a project—the ones that cast a long shadow over everything that follows.

### The Invisible Architecture

How often have you joined a project, even a supposed “greenfield” one, only to find that the most fundamental architectural decisions have already been made?

As Andrew described, these choices are rarely documented. They might be implicit, or simply legacy decisions inherited from the project’s history. These can be non-architectural decisions with significant architectural impact, such as the initial product scope, the number and structure of teams, or a strategic technology choice made years ago.

These early decisions become the invisible constraints of our work. They define the landscape, the boundaries, and the rules of the game, yet they often go unacknowledged and unquestioned. They are the ghost decisions that haunt the system. We treat them as unchangeable facts, often without understanding the context in which they were made.

### From Implicit History to Explicit Record

The problem is that this unwritten history creates ambiguity. As new people join, the original context is lost in a game of telephone, with different people remembering different, often conflicting, versions of the story. Without a clear record, we can’t learn from the past or confidently challenge the present.

So, what can we do?

Andrew shared a powerful technique from a past project: **reverse-engineering the history into Architecture Decision Records (ADRs).**

This process is a form of architectural archaeology. Someone on the team took on the task of digging into the project’s past to document those crucial, foundational decisions that were missing from the record. They wrote down:



- The decision that was made (e.g., "We chose AWS as our primary cloud provider").

- The options considered at the time.

- Crucially, the context and reasoning behind the choice.



This last part is the most valuable. The ADRs captured not just *what* was decided, but *why*. Reasons like, "We didn't have enough people to manage a multi-cloud setup," or "Product management prioritised feature X, which influenced this choice," provide essential clarity.

### EventStorming past decisions made

The reverse-engineering of ADR’s reminded Kenny of an appreciative inquiry workshop he attended, where they first modelled out past culturally significant events of a department. That group then discussed the aspects that have contributed to the good culture we have today and which we want to keep, and examined the ones we no longer want. We could do the same with decisions made in an organisation or project. We can do this with EventStorming, create a timeline of all the events that happened in the past, and what other information and events were relevant leading to those decisions. At the end you could capture these decisions in an ADR, and can also mark the hotspots around those events looking at the future.

### The Power of Knowing Why

Documenting these historical decisions had a profound effect.

First, it provided immediate clarity for the entire team, especially new members. Instead of relying on word-of-mouth, everyone could read a concise record of the forces that shaped the system. This builds empathy for the codebase and for the people who came before us.

Second, it gave the team permission to revisit and challenge those foundational decisions. When you understand the original context, you can ask the critical question: "Has that context changed?"

A decision made when the company was a 12-person startup may no longer be the best choice for a 200-person scale-up. A technology chosen because of a missing feature on another platform might be reconsidered once that feature becomes available. By making the context explicit, the "untouchable" decisions become touchable again. The team is empowered to evolve the architecture based on today's reality, not yesterday's constraints.

### The Hard Part: Documenting Conflict

Of course, decisions are not always harmonious. This led our conversation to a more challenging question: how do you document the power dynamics, disagreements, and conflicts that are often part of the decision-making process?

This is a delicate area. Writing down personal conflicts can be counterproductive and unsafe. Yet, ignoring them means losing vital context, and this is usually the case with the historical Ghost decisions. We discussed a few heuristics for navigating this:



1. **Isolate the disagreement.** As Andrew pointed out, breaking a large decision into many smaller ones can help pinpoint the exact area of contention. Instead of a single, monolithic argument, you can have productive discussions about smaller, more focused trade-offs.

2. **Acknowledge dissent formally.** A useful technique is to include a section in the ADR for "Adopted despite..." or "Rejected despite...". This allows the record to show that downsides or alternative views were considered and acknowledged, without needing to attribute them to specific people. It validates differing opinions while still committing to a path forward.

3. **Keep it about the relationship, not the record.** As Andrea suggested, sometimes the best approach is to simply note that there was a conflict and that anyone revisiting the decision should speak with the people involved. The goal of the ADR is to document the decision, not the interpersonal drama.

### Making the Invisible, Visible

The core takeaway from our discussion is that decisions made at a point in time are a product of what was known, thought, and felt at that time. As teams and contexts change, these decisions must be open to review.

By taking the time to uncover and document the ghost decisions in our architecture, we give ourselves the clarity and agency to build better systems. We honour the past by understanding it, and we empower the future by being free to change it.

What are the unwritten rules governing your project? Perhaps it's time to do a little architectural archaeology of your own.






