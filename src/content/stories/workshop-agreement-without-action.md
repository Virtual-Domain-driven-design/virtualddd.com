---
title: "When Everyone Agrees But Nobody Acts"
slug: "workshop-agreement-without-action"
status: "Published"
episode: 12
publishedDate: 2026-02-03
authors: ["Xin Yao", "Andrea Magnorsky", "Andrew Harmel-Law", "Kenny Schwegler"]
tags: ["facilitating software architecture and design", "collaborative software design", "power dynamics", "psychological safety", "enabling architecture"]
youtube: "https://youtu.be/5Zp7eNsLFLM"
podcast: "https://player.captivate.fm/episode/57ee2f33-ce16-48a8-9d82-320393458a5e/"
curatedHeuristics: ["pause-every-ten-minutes-invite-dissent", "notice-anxiety-signal-missing-something", "build-connection-before-content", "drop-methodology-when-barrier", "challenge-workshop-premise-before-diving-in"]
seoTitle: "When Workshop Agreement Doesn't Lead to Action | Xin Yao"
seoMetadescription: "Xin Yao on two workshops where everyone agreed and nothing shipped — how to surface the real concerns behind the success theatre."
featuredImageSquared: "./_assets/workshop-agreement-without-action-featured-squared.png"
featuredImage: "./_assets/workshop-agreement-without-action-featured.png"
---

We often leave workshops feeling good. The room was energetic. People participated. Everyone seemed to agree. Action items were captured and neatly documented.

And yet, weeks later, nothing moves. The actions remain untouched, and the “agreement” we thought we reached never turns into implementation. It’s a familiar frustration: surface-level alignment sustained by collaboration rituals rather than real commitment.

That tension sits at the heart of what Xin Yao shared in this installment of *Stories on Facilitating Software Architecture and Design*. It’s a story about the gap between polite agreement and genuine commitment—and the hard, sometimes uncomfortable lessons that emerge when we try to facilitate complex architectural decisions.

## The Flying Squad's 'Success Theatre'

Xin’s first story takes us back to her time as an integration architect in a so-called *flying squad* at a large financial institution. Her mandate was to drive the design of an integration architecture for a new CRM system—no small undertaking. The effort cut across core banking, credit data, customer data, and the ambition of a 360-degree customer view, spanning multiple business areas. Alignment between business and technical teams was essential.

Xin facilitated a multi-day off-site workshop bringing all involved teams together. She prepared thoroughly: conducting upfront interviews, curating shared knowledge, and designing the session to move from business processes down to data integration. The group discussed aspirational architectural principles—avoiding custom point-to-point integrations, promoting APIs, and moving toward event-driven architecture. Everything appeared to click. Participants even marked their stance along a line from “Yes, I support this” to “Yes, but.” Most placed themselves firmly on the “Yes” side. The workshop ended with a long action list and multiple ADRs intended to guide implementation.

Four weeks later, reality caught up. Nothing had moved. When managers gathered for a retrospective, an engineering manager voiced the uncomfortable truth: *“Everybody agreed. Everybody was supportive—but did you notice anyone was excited?”* The answer was no. What had looked like alignment was, in fact, a carefully orchestrated success theatre—top-down, polite, and unchallenged. No one wanted to question the direction, the process, or the enthusiasm of the facilitator. Agreement was visible; commitment never materialized.

## Event Storming and the Unspoken Truth

Seven years later, Xin, now a DDD evangelist, found herself in a similar situation, this time facilitating an EventStorming workshop for a core domain in the same organization. Convinced that collaborative modelling would be a game-changer, she introduced the team to EventStorming with enthusiasm. Sticky notes filled the walls, and the energy was high.

However, when it came time to merge timelines, things stalled. Despite Xin's encouragement, clusters of sticky notes remained disintegrated. It took half a day, exceeding the allocated time, just to get a somewhat merged timeline. The afternoon's explicit walk-through was even harder. People struggled to harmonize inputs and kept asking questions. Eventually, the domain architect stepped in and told Xin: *“Nobody has your skills. If we want to move forward, you have to take over.”*

By the end of the day, the board was dominated by red hotspots rather than orange domain events. They ran out of time before they could even discuss opportunities to improve, or identify bounded context candidates. Xin felt something was off, but chose to follow the workshop plan. 

The retrospective the next day made the invisible visible. One person remarked, "We only see trees, no forests." Another said, "The whiteboard doesn't compile." In one-on-one conversations, deeper issues surfaced:

- **Pre-determined boundaries:** The workshop had been framed as collaborative, yet key modelling decisions—such as entry and exit events—had already been defined by the domain architect. The team did not agree with these choices, but with the architect present, no one felt safe enough to challenge them.

- **Respectful silence:** Another team member explained, “We respected you. You had so much passion and energy, and we knew your intentions were good. We didn’t want to ruin it for you.”

## The Paradox of the Outcome-Driven Facilitator

The pattern across both stories is clear. When you're the architect in the room, and you're facilitating, and you're responsible for outcomes, you carry a specific kind of authority that makes dissent dangerous. People read your investment in the process and don't want to disappoint you. They see the big thing you've organized and feel terrified to say it isn't working.

Xin described her own awareness in that second workshop: "I knew there was something wrong, but I didn't touch it because I knew I'm also an architect. I'm supposed to be outcome-driven. I have the responsibility for reaching the timeline."

This is the fundamental paradox for architects who facilitate. You're outcome-driven, but the group might need something else. You're highly empathic, but your own anxiety about delivering can override your intuition to act on what you sense. There's no clean answer here—just the tension that every architect-facilitator will eventually face.

## What Changed: Connection, Contribution, Conversation

Xin's approach has evolved since 2020. These days, she frames her role differently from the start: "I'm here to share some stuff I know. I'm on the same learning journey, probably just a couple of steps ahead. I don't want you to trust me—I want you to trust your own experience."

She's developed a heuristic: after four or five slides or ten minutes of talking, pause and ask, "What are your doubts and concerns? If you didn't have to be polite, what would you say? Is any of this totally useless from your point of view?"

And there's something more fundamental. After that second workshop, Xin continued working with the team—but they dropped all the methodologies. No EventStorming, no formal DDD techniques. Just whiteboards and freestyle collaboration. It worked because it brought her off the pedestal to the same level as the team.

Her current mental model has three Cs around collaboration: Connection, Contribution, and Conversation. Connection isn't just between people, but between people and the purpose, and between each person and their own truth. Conversation matters because if people can't say no, their yes means nothing. Contribution creates agency and nurtures a caring for the success of the whole. And resistance isn't actually resistance—it's creative energy, a yearning for something different. 

## Unpacking the Dynamics

- **Success theater is nearly invisible to the convener.** When you've invested heavily in a big workshop and everyone is being professionally polite, you can mistake compliance for alignment. The absence of excitement is a signal, but it's easy to miss when you're focused on the outcome.

- **Pre-imposed constraints create hidden resistance.** In the second workshop, entry and exit events were decided by architects before the session. That single decision created resistance that manifested as inability to merge timelines, excessive questions, and eventually a board that "doesn't compile."

- **Your passion can silence the room.** When you're visibly invested in a methodology or approach, people read that as identity-level attachment. They'll protect your enthusiasm rather than voice their doubts—especially if there's a hierarchy in the room.

- **The enabling role carries a dangerous assumption.** Saying "I'm enabling DDD" or "I'm the integration architect" implies you know the destination or the path. That framing makes it harder for people to question whether the path is right, because questioning the path feels like challenging your expertise.

- **CoMo methods don’t create collaboration:** Even strong practices like EventStorming fall short when reduced to a step-by-step workshop. Relying on the method alone can also reinforce existing power imbalances. Xin’s experience highlights the need to model conversations and actively invite dissent to unlock a group’s collective wisdom.

- **Small groups unlock safer contribution.** Three people in a breakout can say things they'd never say in front of twenty people with different ranks and stakes. Once they've said it once in a small group, they have more courage to share with the larger group.

- **Emotional language changes the conversation.** Asking "How are you feeling about this workshop right now?" creates permission for people to acknowledge what's actually happening, rather than performing professional distance from their experience.

## The Path to Genuine Engagement

Xin’s journey—from flying squad architect to DDD evangelist to something more humble: a convener of collaborative conversations—shows how the role itself shapes what becomes possible. A facilitator who claims expertise in the destination invites different conversations than one who admits they are figuring it out alongside the group. In both workshops, the people were capable, the work mattered, and the techniques were sophisticated. 

When everyone agrees but nobody acts, the problem is rarely a lack of skill or method. More often, it’s a lack of space to doubt, to disagree, and to name what feels off in the lived experience. Sometimes the most powerful thing a facilitator can model is comfort with uncertainty—and the courage to let the plan bend in service of what the room actually needs.

## Further Reading

**Event Storming and Workshops**: Alberto Brandolini, *Introducing EventStorming* - Practitioner resource on running collaborative event storming sessions, highlighting risks of pre-decided events and resistance that Xin encountered.

**Facilitation Dynamics**: Peter Block, *Community: The Structure of Belonging* - Explores building genuine connection and contribution in groups, aligning with Xin's "three Cs" model for safer dissent in architecture workshops.

**Architecture Decision Records**: [Michael Nygard, "Documenting Architecture Decisions" (original 2011 blog post)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) - Seminal article on ADRs used in Xin's 2013 flying squad workshop, showing early practices for capturing agreements beyond "success theater."

**Enabling Collaboration**: Danielle Braun, Jitske Kramer, The Corporate Tribe: Organizational lessons from anthropology - Anthropological take on group dynamics and reframing resistance, echoing the transcript's deep democracy insights for inviting real contribution.
