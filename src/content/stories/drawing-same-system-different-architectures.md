---
title: "Why Drawing the Same System Reveals Different Architectures"
slug: "drawing-same-system-different-architectures"
status: "Published"
episode: 18
publishedDate: 2026-04-28
authors: ["Aino Corry", "Andrea Magnorsky", "Kenny Schwegler"]
tags: ["Facilitating Software Architecture and Design", "Software Architecture", "collaborative modelling", "Psychological Safety", "Social Dynamics"]
youtube: "https://youtu.be/U5NHOSBjdtE"
podcast: "https://player.captivate.fm/episode/ada53abb-c031-43a6-97f8-c88ed0a82e13/"
seoMetadescription: "Ask four architects to draw the same system and you get four diagrams. Externalising those mental models is what surfaces the disagreement."
featuredImageSquared: "./_assets/drawing-same-system-different-architectures-featured-squared.png"
featuredImage: "./_assets/drawing-same-system-different-architectures-featured.png"
---

We often assume that architects working on the same system share the same understanding of its structure. They're looking at the same code, working with the same components, attending the same meetings. But that assumption rarely holds up when you actually test it.

That's the challenge Aino Corry shared with us in this installment of Stories on Facilitating Software Architecture and Design. It's a story about what happens when you ask every architect in the room to draw the same monolith—and discover they're all seeing something different.

## The Setup: A Day Nobody Thought They Needed

Aino was brought into a large American company about ten years ago. The team wanted to break their monolith into microservices—the fashionable thing to do at the time. They had a room full of highly paid architects ready to look at some diagrams and make decisions.

When Aino said she needed a full day, the response was predictable: "A whole day? Really? We're just going to look at some diagrams."

But Aino held firm. She'd worked with Simon Brown on the approach and knew that understanding had to come before decisions. Reluctantly, they agreed to give her the time.

## The Exercise: Draw What You Know

After some initial icebreaking—which gave Aino crucial information about who would dominate the conversation and who would hold back—she gave the team a deceptively simple task: draw the component diagram of the monolith on paper, without looking at the code.

The architects thought it was silly at first. Why not just look at the actual system? But Aino insisted: "Your job is to be a software architect for this system. It's interesting to see what you have in your heads."

So they drew. Individually. Then they put all the diagrams on the wall.

## The Surprise: Everyone Saw Something Different

Walking down that wall of diagrams created what Aino describes as "a huge surprise." Yes, there were areas of agreement. But there were also significant disagreements about fundamental things: the chain of control, what knew about what, which parts could touch or see other parts of the system.

These weren't trivial differences. These were architects who'd been working on the same system, now discovering they had incompatible mental models of its core structure.

Instead of jumping into debate, Aino used the liberating structure 1-2-4-All. First, people looked at the diagrams silently. Then they discussed in pairs, pointing out surprising differences. Then groups of four. Only then did they come together as a whole group to share their biggest questions and concerns.

## The Value: Discussion Instead of Certainty

What emerged wasn't just a corrected diagram. It was "a software architecture discussion on a different level than they normally had."

The exercise changed the nature of the conversation. It wasn't about being absolutely correct anymore. It was about understanding how different people saw the system and why. People who usually stayed quiet because they weren't certain spoke up—because nobody was certain anymore.

After consolidating the diagrams into one agreed view, they moved on to identifying risks and hotspots. The same pattern repeated: individual thinking, then structured sharing, then genuine discussion.

## The Resistance: You Can't Win Them All

One person left that full-day session convinced it was a tremendous waste of time. They could have just looked at the diagrams. But most of the team—especially newer members—found the time invaluable for building understanding.

Aino reflects now on what she would've done differently with that skeptical, vocal person. She's since learned patterns like Champion Skeptic from Linda Rising's "Fearless Change." The approach: get one-on-one time, acknowledge that skepticism is valuable, but redirect it toward being constructive rather than just complaining.

"But it takes courage and it takes understanding," Aino admits, "and sometimes thinking on your feet when you have more than 10 people in the room and you're starting to sweat a little bit and you want to seem cool."

## The Aftermath: Did It Actually Work?

This is the consultant's dilemma. You come in, facilitate a workshop, and then you're gone. How do you know if it made any difference?

Aino has gotten better at defining success criteria upfront: What skills should people have afterwards? What do they want to get out of this? She starts workshops with expectation management to surface what success looks like for the participants.

But for this particular workshop, she had something better than abstract metrics. She had a spy in the organization—someone she drinks red wine with from time to time. Through that connection, she learned they actually moved forward with breaking up the monolith.

Still, Aino remains modest: "I'm sure they could have done it without me, but at least I know I didn't ruin anything for them or waste their time."

## Unpacking the Dynamics

- **Shared codebase ≠ shared understanding**: Architects working on the same system can have fundamentally incompatible mental models of its structure. The differences only surface when you force them to externalize their understanding.

- **Individual work before group discussion prevents groupthink**: Having people draw individually before sharing stops the loudest or most senior person from defining reality for everyone else. The diagrams on the wall become artifacts that legitimize different perspectives.

- **Structured progression of conversation scales safety**: The 1-2-4-All pattern creates multiple opportunities to voice uncertainty or disagreement in increasingly larger groups. Someone who won't speak up in a room of 20 might voice something important to one other person.

- **Not knowing becomes acceptable**: When everyone's diagram is different, the conversation shifts from "being right" to "understanding differences." This is particularly powerful for people who stay quiet because they're not certain—suddenly nobody is certain.

- **Skeptics need different engagement**: The vocal skeptic in the room isn't just a facilitation problem to solve in the moment. They represent legitimate concerns that might be getting drowned out by enthusiasm. The pattern isn't to suppress them but to redirect their energy toward constructive criticism.

- **Measuring impact requires deliberate follow-up**: Most facilitators never learn if their workshops actually mattered. Building in ways to check back—whether through formal follow-up or informal relationships—is essential for improving and for maintaining your own sense of whether this work is worth doing.

## The Understanding That Changes Everything

Aino quotes her late father: "To understand everything is to forgive everything." That's what happened in that room when architects saw each other's diagrams. They understood why colleagues had been making what seemed like stupid decisions. Those decisions came from a different understanding—not from incompetence or malice.

That shift from judgment to curiosity might be the most valuable thing that came out of that full day nobody initially wanted to give.

## Further Reading

**Facilitation Patterns** Henrique Bastos, *Liberating Structures* - Hands-on resource for the 1-2-4-All pattern Aino used to progressively build shared understanding without domination by loud voices.

**Handling Skeptics** Linda Rising & Mary Lynn Manns, *Fearless Change* - Includes the Champion Skeptic pattern Aino now applies to redirect vocal critics into constructive contributors during workshops.

**Architecture Workshops** Simon Brown, *C4 Model* - Free resource and a book with workshop ideas for visualizing software systems at multiple levels, as Aino adapted with Brown's input for her monolith exercise.
