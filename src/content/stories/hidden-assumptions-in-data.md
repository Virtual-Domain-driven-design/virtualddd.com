---
title: "I Reused the Logic That Worked and the Numbers Doubled"
slug: "hidden-assumptions-in-data"
status: "Published"
episode: 33
publishedDate: 2026-11-24
guests: ["michelle-delves"]
hosts: ["Andrea Magnorsky"]
tags: ["facilitating software architecture and design", "sociotechnical systems", "domain-driven design", "stakeholder alignment", "technical debt", "data modelling", "domain expertise"]
youtube: "https://youtu.be/_tmi57Gy6qk"
podcast: "https://player.captivate.fm/episode/82fbc160-0922-4935-b789-975ec5d74399/"
seoTitle: "Valid Code, Wrong Reality: Hidden Assumptions in Data"
seoMetadescription: "Valid code can still be wrong about reality. Michelle Delves shares how she uncovers hidden assumptions in data with domain experts, and when to stop digging."
featuredImageSquared: "./_assets/hidden-assumptions-in-data-featured-squared.png"
featuredImage: "./_assets/hidden-assumptions-in-data-featured.png"
---

The request was about as simple as requests get: "Get me the utilisation for engine hours and cycles." An engine flies on an aircraft. It goes up, it comes down, that's a cycle. Add them up. Keep a running total. Michelle Delves found the right measuring points, wrote the logic, deployed it, and was, in her words, "very, very happy." Then someone asked whether they could also see the subcomponents — and the same logic, applied one level down, returned more rows than it started with.

In episode 33 of Stories of Facilitating Software Design and Architecture, Michelle — who works across data and AI at Air New Zealand — talks with Andrea Magnorsky about what happens when software is technically correct and still wrong about the world. It's a story about aircraft engines, but the uncomfortable part will be familiar to anyone who has ever built something on top of an assumption they didn't know they were making.

## One measuring point per unit, until there were three

The assumption underneath Michelle's first version was reasonable and, at the time, true: each piece of equipment has one measuring point per measurement unit. One for operating hours, one for operating cycles. At the root engine level, that held perfectly. Clean mapping, clean numbers, happy stakeholders.

Go one level down into the subcomponents and the shape of the world changes. Suddenly there aren't two options but several — standard duty cycles, APU hours and cycles. And then the part that really bit: some historical data had been created with duplicate measuring points, so a single component could carry three measuring points for the same unit.

Worse, because those duplicates were attached to a manufacturer part number rather than an individual instance, the problem propagated across every equipment instance sharing that part number. "When you're dealing with hundreds of thousands of millions of rows of data, it can very quickly expand out a lot."

Nothing in the software was broken. The join did exactly what it was told. The model of reality it was built on had quietly stopped being accurate somewhere between the root engine and the parts inside it.

## The assumption you don't know you're making

Michelle puts her finger on why this class of problem is so unpleasant: "You have no reason to think that your assumption is wrong until you end up stumbling upon it."

There's no warning signal. The software compiles, the pipeline runs, the dashboard populates. The only way to catch it is to be the kind of person who notices that a number looks bigger than it should and refuses to move on.

She describes the chain that sits between the physical world and the numbers: the asset, then the people and processes that interact with it, then the system, then the data, then the history of all of it. Data sits right at the end of that chain. What is true for today's operating procedures says nothing about what was true five years ago — and today becomes history soon enough.

So with every iteration, the question shifted. It stopped being "what does this field mean?" and became "what happened in the real world for this row of data to exist?"

## Debugging a shared understanding

When the data made no sense, Michelle went to the people who deal with the process upstream. Not with a ticket, but with a hypothesis and a specific weird record: "Hi, this makes no sense. Why am I seeing an installation before a removal on the same side? That logically is impossible."

Three things can happen in that conversation. The expert knows something the data can't tell her. Or she shows them something they didn't think was possible. Or — and this is the honest one — neither of them knows what happened.

That third case is where her approach gets interesting. Rather than forcing a conclusion, the goal becomes to "debug what our collective understanding is." Even when nobody can validate what actually occurred, both people can explain, in their own language, how they arrived at their reading of it. Sometimes matching reasoning is the best available outcome.

## Nobody was lying to you, their scope was just smaller

Andrea pushed back, playing devil's advocate: surely you have to trust whoever wrote the ticket? Can't the specification just say what's needed?

Michelle's answer avoids the easy cynicism. "People aren't inherently trying to be wrong." What someone believes to be true is usually perfectly valid from where they're standing.

Her example lands well. In aviation, attention naturally goes to the aircraft. One aircraft, one tail number. But an aircraft has at least two engines, sometimes four. Anyone reasoning at the aircraft level is already working with a granularity that cannot represent the thing Michelle needs to represent — and they have no reason to notice. "It's very possible that their scope hasn't actually realised what they're missing."

This matters more because subcomponents move. Engines move between aircraft; parts move between engines and assemblies. Life-limited parts have to be tracked accurately or you risk an aircraft on ground, with a cost you can genuinely put a number on.

## Knowing when you've dug enough

Andrea asked the question that has no clean answer: how do you know when to stop? Her own honest admission was that she mostly goes on intuition, "a terrible heuristic to share."

Michelle's approach is more structured than intuition but less rigid than a rule. Start narrow — one engine family, something without much historical baggage — and fence the problem. See how hard it is to solve there. Then ask what value expanding the scope would actually buy.

She also just asks: "Tell me what you want me to solve, and tell me what your biggest bottleneck and roadblock is." Her stakeholders are busy; the time they give her is expensive, so she spends it on their constraints rather than her curiosity.

And she is comfortable hitting a wall. Sometimes the data to classify something simply does not exist. You end up with something that works for 98% of cases, and the remaining 2% may be valuable but not realistically solvable. Her response to that is consistent: document your assumptions, your limitations, and your current understanding, so the next person inherits your reasoning rather than just your output.

## What this story shows about building on inherited reality

- **Correct software is not the same as correct meaning.** Michelle's join was valid against the data and wrong about what physically happened. No test would have caught it.

- **Assumptions tend to hold at one level of granularity and break at the next.** The root engine behaved; the subcomponents didn't. Scope expansion is often where hidden assumptions surface.

- **History is a separate problem from the present.** Rules that hold for current-day operations frequently don't hold for data created under older processes — and today's data becomes history soon enough.

- **Disagreement with a domain expert is usually a difference in scope, not a difference in competence.** The aircraft-level view and the engine-level view were both correct and incompatible.

- **"We don't know what happened" is a legitimate, documentable conclusion.** Aligning on how each person reasons can be more durable than forcing a shared answer.

- **Most of the work is not the writing.** Michelle puts understanding and validating at over 75% of a build. The final logic looks simple precisely because of everything that went into it.

## Technology on top of a representation

Michelle's closing point was about AI, and how it can generalise. "You can't put AI on the data that doesn't exist." Even when the data does exist, whatever you build sits on top of a representation of reality, not reality itself.

That's fine, as long as everyone knows which representation they're using. It becomes dangerous when a model gets handed downstream with no note saying that it doesn't handle leased assets, or that nothing before a certain date is reliable. The limitation doesn't disappear when it goes undocumented — it just becomes someone else's surprise.

The line Michelle finished on is the one worth keeping: the model became more robust not because the code got more sophisticated, but because her understanding did. Which raises a question worth asking about anything you currently trust — if a colleague asked you what your data quietly assumes about the world, would you be able to answer, or would you have to go and find out?

## Further Reading

**Worth exploring**

- *Data and Reality* by William Kent — the classic examination of the gap between what exists in the world and what our models claim about it; essentially the book-length version of Michelle's story.

- *Domain-Driven Design* by Eric Evans — for the practice of building shared language with domain experts rather than translating tickets into software.

- *Introducing EventStorming* by Alberto Brandolini — a concrete facilitation technique for surfacing the assumptions different people hold about the same process.

- *Thinking in Systems* by Donella Meadows — useful background for the shift Michelle describes from technology-first to understanding the asset, people, process and data as one chain.

- *Data Mesh* by Zhamak Dehghani — for the organisational side of treating data as something owned, documented and made trustworthy by the people closest to the domain.
