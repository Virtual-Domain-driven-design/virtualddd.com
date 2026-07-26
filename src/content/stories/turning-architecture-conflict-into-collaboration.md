---
title: "Everyone Had an Opinion But Nobody Changed Their Mind"
slug: "turning-architecture-conflict-into-collaboration"
status: "Published"
episode: 19
publishedDate: 2026-05-12
authors: ["Laila Bougria", "Andrea Magnorsky", "Andrew Harmel-Law", "Kenny Schwegler"]
tags: ["Facilitating Software Architecture and Design", "Software Architecture", "Conflict Management", "team collaboration", "Governance", "Social Dynamics", "Sociotechnical Systems"]
youtube: "https://youtu.be/VFtM8-nhmHk"
podcast: "https://player.captivate.fm/episode/48c52611-9542-4805-982a-2c2e2621ed48/"
focusKeyphrase: "architecture conflict collaboration"
seoTitle: "Turning Architecture Conflict Into Collaboration"
seoMetadescription: "Laïla Bougria on turning clashing opinions into decisions — reframing the problem before the solution, and retrospectives that build evidence."
featuredImageSquared: "./_assets/turning-architecture-conflict-into-collaboration-featured-squared.png"
featuredImage: "./_assets/turning-architecture-conflict-into-collaboration-featured.png"
---

We've all been in that meeting. Someone proposes a solution, someone else proposes a different one, and within minutes the room has split into camps. People stop listening and start waiting for their turn to argue. The discussion goes in circles, nobody feels heard, and whatever decision comes out of it feels less like a conclusion and more like whoever had the most stamina.

Laïla Bougria has spent over two decades in software engineering, much of it working in messaging and event-driven systems at Particular Software. She joined Andrew Harmel-Law, Kenny Schwegler, and Andrea Magnorsky on *Facilitating Software Architecture and Design* to talk about something that isn't often discussed directly: the gap between having a good idea and being able to actually move a team toward it. Her stories are less about technical decisions and more about what happens to people when they have to make them together.

### The Problem Isn't the Solutions — It's That Everyone's Solving Something Different

Laïla's starting point is something she's seen repeat across teams, companies, and years: people jump to comparing solutions before they've agreed on the problem. "There's a tendency to immediately start comparing possible solutions against each other," she says, "and that can cause a lot of friction because it very quickly becomes my opinion versus that of a coworker."

At Particular Software, this is addressed structurally through an RFC process. Before alternatives are even discussed, the document must answer: what problem are we solving, and for whom? That framing shift — from "which solution is better" to "what are we actually trying to do" — removes a surprising amount of conflict before it starts.

The insight is simple but easy to overlook. When two people argue about solutions, they often aren't disagreeing about implementation. They're working from different assumptions about the goal. Surfacing the problem first gives everyone a shared reference point, and it makes the comparison of alternatives feel less like a contest.

### From "That's a Horrible Idea" to "What Are You Assuming?"

Even with a good process, people still have gut reactions. Laïla is honest about this. "If someone brings up an alternative and I'm like, oh no, that's a horrible idea — my younger self would have just said it."

What changed is not that she stopped having those reactions, but what she does with them. When something triggers that response now, she asks herself why. What hidden assumptions is this person making? What risks am I seeing that they might not be? The shift from "that's wrong" to "what's missing here" changes the entire character of the conversation.

"It's not 'you have a horrible idea' — which can feel like a personal attack — it becomes a conversation about gaps in the proposal that need to be addressed." That reframing keeps the disagreement about the idea rather than between the people, which makes it easier for everyone to stay in problem-solving mode.

Kenny raised a follow-up that gets at something real: what about the person who's already decided, who isn't open to alternatives at all? Laïla's response is to turn the same question back on them — not as a challenge, but genuinely. What assumptions do you think we're getting wrong? What risks are you seeing? Giving someone a constructive channel for their resistance often reveals that underneath the stubbornness is a legitimate concern that just hasn't been articulated yet.

### When Two Teams Have to Share a Decision

The conversation moved into territory that anyone working with distributed teams will recognise. Kenny described the classic standoff in event-driven systems: one team emits fine-grained events, another team wants a summary event, and neither team is technically wrong. It's a negotiation with no obvious right answer — and a real risk of turning into a power struggle.

Laïla frames these situations as "give and take," and her first move is to acknowledge the other team's constraints directly. "Every team has their own deadlines, their own backlog. By considering that, it already deescalates, because we can all find ourselves in that situation."

But she doesn't stop at empathy. She also makes the technical case visible. In her credit card example, the consuming service doesn't want to absorb the emitting service's logic about what constitutes a billing period. If it does, any change to that logic in the source system ripples across to the consumer — and that coupling costs both teams their independence. "It might take a little bit more work now, but it's going to protect your autonomy in the longer term." That's an argument that tends to land, because it reframes the request as being in the other team's interest, not just the asking team's.

She also notes that the need for a summary event in the first place is often a signal worth paying attention to. It might indicate that the service boundary isn't quite right. That's a harder conversation, but catching it early is much cheaper than discovering it after more systems have been built on top of the assumption.

### Building Evidence Instead of Winning Arguments

One of the more distinctive things Laïla described is her habit of keeping track — not to build a case against a colleague, but to test her own instincts against what actually happens.

At a bank where she spent five years, she was convinced that a particular piece of the codebase was going to cause problems. The team disagreed and moved on. Rather than pushing harder, she started quietly noting every bug that came in from that area. By the time she had around ten, she raised it — not as "I told you so," but as: here's a pattern I've been observing, I think we need to revisit this. The team agreed, they refactored it, and the bugs mostly stopped.

But she was equally candid about the second scenario, where she was just as convinced she was right, collected the same kind of evidence — and found none. "It was proof to myself that I was wrong, which is fine. But it's a humbling exercise. Even when we feel very strongly about something, you're not always right."

That second story matters as much as the first. The technique isn't about being vindicated. It's about having a method to stay honest with yourself over time.

### A Practice for Letting Go (Without Actually Letting Go Yet)

Kenny named something that resonated across the conversation: perfectionism as the enemy of design. The feeling that a decision is wrong, even when you've been outvoted, doesn't just go away because the meeting ended.

Laïla has developed a personal practice around this. Every six to twelve weeks, she reviews a running list of things she's been uncertain or frustrated about — design decisions, process friction, technical concerns. For each one, she asks: do I still feel strongly? Has anything happened that confirms or challenges what I thought? If the evidence isn't there, she drops it. If it is, she has something concrete to bring back to the team.

"By circling back to it, you're basically resolving your personal feelings around it and really letting go." The retrospective creates a closure that real-time discussion often can't, because in the moment emotions are still running hot. Time and evidence together do something that argument alone rarely manages.

She calls these personal retrospectives, distinct from the team variety. The team retrospective surfaces shared problems. The personal one surfaces your own patterns — where your instincts were right, where they weren't, and what context you might be carrying from a previous environment that doesn't apply here.

### What This Conversation Is Actually About

A few patterns running through Laïla's stories are worth naming:

- **Separating problem definition from solution comparison** removes a layer of conflict before it forms. Teams often argue about solutions when they're actually misaligned on the problem.

- **Asking about assumptions and risks** instead of labelling ideas as good or bad keeps disagreement in technical territory rather than personal territory.

- **Acknowledging the other team's constraints** before making a request changes the dynamic from adversarial to collaborative — especially when teams share a technical decision.

- **Collecting evidence over time** serves two purposes: it builds a case when you're right, and it corrects you when you're wrong. Both outcomes are valuable.

- **Personal retrospectives** give you a structured way to process decisions you didn't agree with, rather than carrying them indefinitely as unresolved frustration.

- **Context matters more than heuristics.** Something that failed in one environment doesn't automatically fail in another. Keeping notes helps you avoid ruling out options based on feelings from a different situation.

None of these are techniques you can apply once and call it done. They're habits — ways of orienting yourself so that the emotional weight of design decisions doesn't overwhelm the technical reasoning.

What Laïla describes isn't a frictionless process. It's a set of practices for staying useful when friction is unavoidable — for keeping the conversation about the problem rather than about who's right, and for building the kind of trust over time that makes hard decisions easier to make together.

The question worth sitting with after this conversation: when you feel strongly that something is wrong, are you treating that feeling as a conclusion, or as the start of an inquiry?

### Further Reading

**Worth exploring:**

- *Thinking in Systems* by Donella H. Meadows — Useful background for understanding how boundaries between components (and teams) shape system behaviour in ways that aren't always visible until things go wrong.

- *Team Topologies* by Matthew Skelton and Manuel Pais — Directly relevant to the conversation about inter-team communication, event ownership, and the organisational cost of unclear service boundaries.

- *RFC (Request for Comments) as a design practice* — The RFC model Laïla describes is used by several distributed software organisations. Basecamp's and Rust's public RFC processes are well-documented examples worth studying for how written alternatives and explicit problem framing change the quality of technical discussions.

- *Accelerate* by Nicole Forsgren, Jez Humble, and Gene Kim — Provides research-backed context for why team autonomy and clear service boundaries matter, and what the organisational consequences of tight coupling tend to look like in practice.
