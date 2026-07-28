---
title: "We Spent Three Months Talking and Got Nowhere Until Someone Picked Up a Marker"
slug: "externalising-decisions-not-alignment"
status: "Published"
episode: 24
publishedDate: 2026-07-21
authors: ["Michael Joyce", "Andrea Magnorsky", "Andrew Harmel-Law"]
tags: ["facilitating software architecture and design", "collaborative modelling", "stakeholder alignment", "adr", "social dynamics", "technical leadership", "consensus"]
youtube: "https://youtu.be/UrdOmhWyfTs"
podcast: "https://player.captivate.fm/episode/df008cd7-71a9-473b-853a-b2d9ead7dfa2/"
seoTitle: "Externalising Decisions: Why Talking Isn't Alignment"
seoMetadescription: "Michael Joyce on externalising decisions: why three months of talking lost to one day at a whiteboard, and how harmony over precision hides real disagreement."
featuredImageSquared: "./_assets/externalising-decisions-not-alignment-featured-squared.png"
featuredImage: "./_assets/externalising-decisions-not-alignment-featured.png"
---

Most decisions in software teams don't fail because people disagreed. They fail because people thought they agreed, but they didn't — and nobody found out until much later. You walk out of a meeting feeling good about where things landed, and three weeks later you're having the same conversation again, confused about how you ended up back at the start.

Michael, a technical principal at Thoughtworks, joined the podcast to share what he learned from an unusual position: working as an architect inside a non-technology company, leaving, and then returning four years later to see what his designs had actually become. That loop — designing something, losing sight of it, then coming back to face it — shaped how he thinks about decisions, documentation, and what it actually means to get alignment on anything.

## Going Back to See What You Built

Most architects never find out whether their decisions held up. Michael did, by accident. He joined a primary industry company in New Zealand as a solution architect, spent several years there, left for the UK, then returned to the same company roughly four years later.

What he found was instructive. The designs he'd made were still running. People had opinions about them — strong ones — and had no idea he was the one who'd made them. Some of that feedback was critical: systems that were harder to operate than they should have been. Some of it was unexpectedly good: an ops team telling him that when things fell over, the services just restarted themselves and recovered. "That was the first bit of long-term praise from an architecture I'd ever received," he said. "It achieved something it was designed to achieve."

But there was a catch. The people running the system had never seen the original design documents. They'd just implemented what they could see. The reasoning behind the decisions was gone.

## The Whiteboard Moment

The clearest illustration of what Michael means by externalisation came from a disagreement with a vendor architect. Both of them were stuck, going in circles, each trying to make a point and win the argument rather than actually resolve anything.

Michael stopped and went to the whiteboard. He wrote down what the other person had just said.

The response surprised him. The vendor architect looked at it and said, "That's wrong." Not defensively — just genuinely surprised that what he'd said out loud meant something different when it was written down in front of him. The act of putting it on a surface, visible to both of them, changed the whole nature of the exchange. They stopped arguing at each other and started looking at the same thing together.

This is the practical core of what Michael means by externalisation. It's not about documentation as a bureaucratic exercise. It's about getting ideas out of heads and onto a shared surface so people can actually look at them — and sometimes be surprised by what they see.

## The Consensus Trap

The subtler problem Michael identified is one that happens when things are going *well* — or at least, when they feel like they are. He calls it valuing harmony over precision.

When people start agreeing in a conversation, there's a natural pull to wrap things up. The energy shifts, the tension drops, and it feels like you've landed somewhere. So you stop writing, stop clarifying, stop checking. And very often, what got documented was one person's version of the agreement — not the shared one.

"The other person's view of it was documented, not my own," Michael said. "And now it doesn't mean I was right about the outcome, but it means we were in disagreement at the end and we didn't know it until later."

The fix he's landed on is to be explicit about both what something is *and* what it is not. What a service will do, and what it will not do. What's in scope, and what is specifically excluded. The grey areas in between are exactly where people's different understandings live — and where you can think you're agreeing when you're not.

## Designing the Project, Not Just the System

The other shift that came out of this role was broader. Michael started thinking about his job as an architect not just as designing the technical system, but designing everything around how the work would happen — how the team would interact, what learning they'd need, what sessions would kick things off, whether people would be sitting together.

This came in part from working with a product manager who, by his description, represented the role at its best: presenting to the board on long-term strategy, going out to talk to customers in the field, and personally taking support calls. That combination of perspectives — strategic, operational, and human — gave Michael a partner who cared about outcomes in a way that changed what he cared about.

"It was a true partnership," he said. "We were focusing on working software in the hands of customers from the very beginning."

Not everyone in the organisation welcomed that. Some product people were wary of developers getting too close to customers, worried they'd cloud the roadmap. But the access they did get — watching product presentations, visiting customers, listening — turned out to be more formative than any technical practice.

## What Actually Produces Alignment

Some patterns worth sitting with from this conversation:

- **Externalisation changes the dynamic, not just the record.** Writing something on a whiteboard during a disagreement shifts where people direct their attention. They stop arguing with each other and start evaluating the thing on the surface. That's a different kind of conversation.

- **Precision and complexity are not the same thing.** Michael makes a point of distinguishing between the two. Being precise about what something does and does not do is often simpler than being vague — it just feels more uncomfortable in the moment.

- **Harmony is a warning sign.** When agreement comes easily, it's worth checking whether you've actually agreed or whether you've just stopped talking. Consensus that papers over ambiguity doesn't hold.

- **Design intent disappears faster than the design itself.** Michael's experience returning to his own work four years later showed that the systems survived, but the reasoning didn't. Documentation isn't just about capturing decisions — it's about keeping the *why* accessible to people who weren't in the room.

- **Intent and empathy are what make difficult conversations possible.** This came up in the context of trust with sceptical product managers. His framing: make your intent explicit, and try to genuinely understand why someone is making the decision they're making — even if you don't like it. If they feel understood, they can still trust you even when you disagree.

## The IKEA Wardrobe Problem

Michael ended with an analogy that's worth sitting with. He was making the point about precision in scope — specifically, the difference between promising to produce a plan and promising to help someone implement it. His version: IKEA supplies the materials and the assembly guide. They don't come to your house and build it. Those are two completely different offers, and confusing them is where a lot of professional relationships quietly break down.

The same gap exists in software work constantly. Agreeing to "help with the architecture" or "work on a strategy" is meaningless unless you've been specific about where your responsibility ends and someone else's begins. Without that, you're back to the same conversation three weeks later, wondering why you're still in the same place.

---

## Further Reading

**Mentioned in this episode:**

- *Crucial Conversations: Tools for Talking When Stakes Are High* — Kerry Patterson, Joseph Grenny, Ron McMillan, Al Switzler. Michael referenced this as the source of a simple but durable idea: stating your intent at the start of a difficult conversation is one of the most effective things you can do.

**Worth exploring:**

- *Thinking in Systems: A Primer* — Donella Meadows. Relevant to the question of how design decisions persist (or don't) once the people who made them have moved on. Helps explain why systems behave the way they do years after the original intent has been forgotten.

- *Architecture Decision Records (ADRs)* — Michael Nygard's original proposal. The practice of writing down not just what was decided but why, and what was considered and rejected. Directly relevant to the problem Michael describes of design intent disappearing while the design survives.

- *Team Topologies* — Matthew Skelton and Manuel Pais. Relevant to Michael's point about designing the project and not just the system — specifically how team structure and interaction modes shape what software you can actually build and maintain.

- *Diagrams as a Tool for Thought* — a recurring theme in design facilitation writing, with relevant material in works like Simon Brown's *Software Architecture for Developers*. The idea that externalising a design onto a shared surface changes how people think about it — not just records it — is well-supported in the facilitation literature.
