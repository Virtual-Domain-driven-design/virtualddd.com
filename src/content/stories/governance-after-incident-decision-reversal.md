---
title: "Decision, Reversal, Frustration: Navigating Governance After an Incident"
slug: "governance-after-incident-decision-reversal"
status: "Published"
episode: 5
publishedDate: 2025-10-28
hosts: ["Andrea Magnorsky", "Kenny Schwegler", "Andrew Harmel-Law"]
tags: ["governance", "facilitating software architecture and design", "social dynamics", "power dynamics", "leadership"]
youtube: "https://youtu.be/GXz-zzNyL38"
podcast: "https://player.captivate.fm/episode/47be4840-e08e-42b6-8319-7936a9914dae/"
curatedHeuristics: ["treat-decisions-as-immutable-histrorical-records", "value-team-autonomy-over-rescuing", "amplify-team-decisions-with-organisational-capital", "prioritise-foundation-trust-in-the-team", "be-explicit-about-decision-making-authority", "measure-the-flow-of-decision-making", "capture-both-logic-and-sentiment-in-decisions", "decompose-large-decisions-into-smaller-ones"]
seoTitle: "Software Governance After an Incident"
seoMetadescription: "A decision made under incident pressure gets reversed afterwards. Why governance, supportive leadership and written decisions prevent the frustration."
featuredImageSquared: "./_assets/governance-after-incident-decision-reversal-featured-squared.png"
featuredImage: "./_assets/governance-after-incident-decision-reversal-featured.png"
---

Welcome back to our series of conversations on facilitating software architecture and design. These are stories about the daily struggles we face when trying to facilitate better, more decentralised ways of making decisions. We find we learn a lot from sharing them, and we hope you do too.

In this conversation, Andrea shared a story that will feel familiar to many. It’s a story about what happens *after* the immediate fire of a production incident is put out, and it raises crucial questions about decision-making, governance, and the human cost of our technical systems.

## The Scenario: A Familiar Story

Imagine you’ve just arrived at work. A high-priority incident alert pings. One of your colleagues dives in, investigates, and makes a decisive call to stop a specific client function to stabilise the system. It's a tough decision made under pressure.

The next day, in a review meeting with senior colleagues, the action is deemed correct for the situation. So far, so good. But the story doesn't end there. Management wants to investigate further. Another colleague is tasked with a deeper analysis and returns with a new recommendation: the function should be re-enabled without any changes.

Soon after, the original decision is officially reverted. The only thing that has changed is the understanding of those higher up, with little new context shared. Your colleague who made the initial call is, understandably, not impressed. Their sentiment is clear: "This is just going to happen again."

This feeling comes from a deeper place—a frustration with systemic issues that are never truly fixed. It’s the exhaustion of constantly applying plasters to broken bones, only to be told the plaster was the wrong colour. This scenario isn't just about a single technical choice; it’s about the entire system of governance around it.

## The First Principle: Document the Journey

When a decision is overturned, it can feel like the original choice was erased. This is where the discipline of recording decisions becomes critical. As Andrew pointed out, every significant decision should be documented, perhaps as an Architecture Decision Record (ADR).

A decision made during an incident, based on the information available at the time, is a valid and important part of your system's history. That ADR should be treated as a read-only historical document once acted upon.

If that decision is later revisited, it shouldn’t be a case of editing the old record. Instead, a *new* decision should be made that explicitly supersedes the previous one. This creates a clear, auditable trail. It shows the evolution of understanding and prevents the paralysis that comes from endlessly re-litigating the past. It respects the context of the original decision while allowing the system to move forward.

## The Role of Leadership: Ally or Autocrat?

The story highlights a critical junction for anyone in a leadership position. When a team member makes a call, what is your role?

Too often, management operates on two flawed assumptions: 1) the team needs help , and 2) it is my job to solve it for them. This can lead to them taking over, which ultimately disempowers the team and reinforces the idea that real decisions only happen "upstairs." As Andrea noted, this feeds a beast where teams become hesitant to make any decision at all. It also highlights that management can become desensitised to the problems, that they believe are solved, in this case that is not what happened because the problem can happen again.

An alternative is to act as an ally. The management team could have instead lent their social and political capital to support the team. It means asking, "What do you need to make a better decision next time?" instead of just making it for them.

We recalled a story of a project manager who, instead of dictating a solution, asked the team what they needed. He then used his influence to secure those resources and trusted the experts to do their work. The project was a success because he chose to be on the side of the team, not the side of the hierarchy. That is a choice every leader has to make.

## Making Governance Tangible

When trust is low, even well-intentioned processes can be weaponised. Documentation can be used to create noise and slow things down. To counter this, we need to make our governance tangible and transparent.

**1. Make the Process Explicit**
You may not work in an organisation that defaults to decentralised decision-making, but you can still bring clarity to your corner of it. Start by creating an ADR for your decision-making process itself. Define who needs to be consulted, how decisions are ratified, and how they can be superseded. Making the rules of the game explicit is the first step toward a healthier process.

**2. Measure Your Decision Flow**
To understand the health of your system, you can measure it. Inspired by the DORA metrics, consider tracking the "Four Key Metrics for Decisions":

- **Decision Frequency:** How many decisions are we making per month?

- **Decision Lead Time:** How long does it take from identifying a need to making a decision?

- **Change Failure Rate:** What percentage of our decisions are quickly superseded or reverted?

- **Time to Restore:** How long does it take to recover from a perceived poor outcome of a decision?

These metrics can reveal bottlenecks and patterns of dysfunction in your governance system.

**3. Add a Human Element**
Data alone doesn't tell the whole story. As Rebecca Wirfs-Brock suggests, adding a qualitative, sense-making step can be transformative. When documenting a decision, add a field for how the team feels about it. Are they confident? Apprehensive? Frustrated?

This simple act acknowledges the human side of our work. It can surface hidden risks and anxieties that quantitative data will never show, leading to more robust and resilient decisions.

These incidents are more than just technical failures; they are socio-technical puzzles that reveal the true nature of our culture and governance. By focusing on clear documentation, supportive leadership, and transparent processes, we can build systems where decisions—even when they are later changed—contribute to learning and trust, not frustration and burnout.
