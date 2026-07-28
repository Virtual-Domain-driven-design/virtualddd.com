---
title: "Nobody Could Agree on Whether the Problem Was Technical a DDD Europe Special"
slug: "problem-isnt-technical-ddd-europe"
status: "Published"
episode: 22
publishedDate: 2026-06-23
authors: ["Andrea Magnorsky", "Kenny Schwegler", "Andrew Harmel-Law"]
tags: ["facilitating software architecture and design", "collaborative modelling", "sociotechnical systems", "power dynamics", "domain-driven design", "stakeholder alignment"]
youtube: "https://youtu.be/WkoCfDHOXpw"
podcast: "https://player.captivate.fm/episode/66174b84-14ab-4adf-9911-90c4a6830138/"
seoTitle: "When the Problem Isn't Technical: DDD Europe"
seoMetadescription: "At DDD Europe, nine practitioners agreed the problem isn't technical. Discover why facilitation, power structures, and the right people decide outcomes."
featuredImageSquared: "./_assets/problem-isnt-technical-ddd-europe-featured-squared.png"
featuredImage: "./_assets/problem-isnt-technical-ddd-europe-featured.png"
---

There's a pattern that turns up in almost every struggling team. The problem gets named as a technical one, the technical fix gets applied, and nothing actually improves. The complaints come back, sometimes louder, and the only thing that really changes is who gets blamed next.

We recorded this episode at Domain-Driven Design Europe, where Andrea Magnorsky, Kenny Schwegler, and Andrew Harmel-Law spent the conference asking attendees and speakers a single question: what's the hardest part of facilitating software architecture and design? Nine people, Mathias Verraes, Zsófia Herendi, Stefan Hofer, Samantha Dellaert, Eric Evans, Henning Schwentner, Hadi Ahmadi, Alexandra Junghans, and Susanne Kaiser answered, and the answers sorted themselves into three groups — one about how organisations are wired, one about who's actually in the room, and one about the facilitator's own state of mind. None of them was really about software.

## The Problem Is Rarely Just Technical

Matthias Verraes opened with a story most people on a platform or core team will recognise straight away. A central team owned shared infrastructure. Teams in different countries could commit directly into that codebase and also file feature requests. Things broke constantly, and the core team got the blame every time.

When Matthias mapped the situation properly, the failure wasn't technical. It was economic. The country teams were profit centres with the ear of the CEO; the core team was treated as a cost, visible upward only when something went wrong. "Their actual costs are externalised to this one team," he said. His fix — shield the core team from direct commits, and make the other teams pay for feature requests so the cost became visible — never got implemented. He didn't have the CEO's ear either. But the solution was never really the point. Seeing the problem clearly was.

What made his approach worth copying was how he surfaced it. When people expressed frustration, he put it on the map instead of filing it away. "If somebody says 'ugh,' I say, 'what does this ugh mean? Let's put that on the map.'" He invented notation as he went — one red dot for a system someone disliked, two for one they hated, three for one they'd quit over — and overlaid churn, customer complaints, and who controlled access to the CEO until the clusters became obvious. "If you can surface that, then you don't even have to solve the problem most of the time, because people are now seeing: oh, that makes sense." People solve the problems visible to them, he pointed out. He just made more of them visible — sometimes by drawing them, sometimes by taking the right person to lunch, sometimes by making sure the wrong person wasn't in the room.

Hadi Ahmadi put the same idea more bluntly. The hardest part, in his experience, is the sociopolitical side of working in large organisations — the power structures, and the way people do or don't collaborate. "They are really what causes the most issues," he said. Like most people in the room, he came from an engineering background, trained to think in code and patterns rather than people.

His tip was to deliberately look outside the discipline. Study people, study language, study the things that aren't software engineering — which, he noted, is how he found his way into DDD in the first place. It's a small comment with a large implication: the skills that resolve the hardest facilitation problems often aren't technical skills at all.

Susanne Kaiser named the version of this that shows up at budget time. Management sees fifteen people gathered for three days and counts what isn't being delivered. The modelling session reads as a cost, not an investment, and the gap between how an architect values that time and how leadership values it is where the friction sits.

Her response is to switch languages. Find out what outcomes leadership is actually chasing, and connect the work to those. She points to the *Accelerate* research as a useful bridge, because it speaks in terms of productivity, profitability, and market share — words that travel upward better than "exploring the problem domain." "We have the same goal in the end, but we speak different languages."

## You Can't Model Without the Right People

Henning Schwentner named the constraint anyone who has run a collaborative modelling session has hit. You can have the best process going, but if the people with real domain knowledge aren't there, the output won't match reality. Proxies, developers, and managers who think they know what happens but don't will only get you an approximation.

Without the right people, he pointed out, you don't really have collaboration — you just have modelling. His longer-term advice was for newer practitioners: programming turns out to be at least as much about people as about bits and bytes, and that stays true no matter which technology is fashionable this year.

Samantha Dellaert pointed to a problem that comes before any modelling: getting people to see that the bigger picture exists at all. Developers and domain experts get used to their own corner. They don't naturally think about how their part connects to the rest, or where the boundaries actually fall.

Her way in is to start with a model of the whole. Even a rough big-picture event storming session makes the overall shape visible enough that people can locate themselves in it and start asking about the connections. "If it's just words, people can't comprehend it too easily," she said. Seeing it changes that.

Stefan Hofer, co-creator of Domain Storytelling, described his own shift. He went into software because he liked computers, then found himself in rooms full of people, sticky notes, and no computers at all. What moved him was a change in how he framed the job: from "I need to write great code" to "I need to build great things." Once that landed, the discomfort of working with people became worth it.

His advice for anyone starting out is practical. Find a local meetup or a conference with hands-on workshops, where the barrier to trying this is low. Books help, but at some point you have to actually do it.

## The Facilitator Is Part of the System

Eric Evans offered something that sounds obvious until you sit with it. He collaborates because solo design simply doesn't work — early in his career he'd be handed a feature, build it with no real interaction with anyone, and the results were terrible. Effectiveness came first. The fun was a consequence.

Then he turned it around. Looking back over a long career, the genuinely valuable projects were mostly the ones that felt good to work on, and the drudgery projects tended not to work out. He's careful that this isn't a motivational point — it's a diagnostic one. "Try to find the fun in it. Try to engage them in a way that's fun for them. You need them to come back." Fun, or its absence, is information about whether the work is going well. He added, in passing, that collaborating with AI coding tools now follows something of the same pattern, though he was quick to say it's also quite different.

Zsófia Herendi was the only one to turn the question inward. Her hardest challenge isn't a technique or a structure — it's other people's lack of curiosity. Some people don't want to be in a modelling session, don't want to build shared understanding, and she's honest that the difficulty is partly her own: she struggles to accept that others don't share her curiosity, and has had to learn to.

Her approach is to lead by example and keep her own energy up, even when a room just sits and stares. "I stay curious, I stay enthusiastic," she said. Sometimes it spreads and sometimes it doesn't, and part of the work is accepting that you can model the behaviour but you can't manufacture the curiosity.

Alexandra Junghans, who teaches software engineering students in Lucerne, makes the case for facilitation from the ground up. She wants her students to learn early that the job isn't sitting alone in a room — it's interacting with people, understanding what they need, and forming a shared model. Collaborative techniques like big-picture event storming are how she gets them there.

Her advice for anyone hesitating is the shortest in the episode: just start. "I'm a beginner as well. There's nothing to lose. We can just start." You don't need perfect conditions or full buy-in to begin.

## What These Conversations Have in Common

Taken together, these short answers describe the same ground from different angles:

- **The technical problem is often a symptom.** Matthias's core team wasn't failing because of bad engineering; it was failing because of how cost and access were structured across the organisation. Hadi made the same point in plainer terms — the power structures are where the real trouble lives.

- **Visibility is a prerequisite for change.** You can't address what people can't see. Making the social, economic, and political layers visible — even crudely, with improvised red dots — creates the conditions for a different conversation.

- **Who isn't in the room matters as much as the process.** Henning and Samantha both land here. Real domain knowledge is a constraint, not a nice-to-have, and proxies produce models that only approximate reality.

- **Language is a barrier before it's a bridge.** Susanne's point about management is a facilitation skill, not a communication nicety. The same goal described in two vocabularies can look like two different goals.

- **How people feel about the work is data.** Matthias's red dots, Eric's fun, and Zsófia's curiosity all point the same way: energy and frustration are signals about the system, not noise to be managed.

- **Facilitation means creating conditions, not controlling outcomes.** Across all nine answers, the job looks less like steering people toward a predetermined answer and more like making it possible for the right people to see the right things together.

## What Doesn't Get Fixed

One detail from Matthias's story is worth holding onto: his fix never got implemented. He mapped the problem, surfaced the structural causes, proposed a sensible intervention, and the organisation didn't act on it, because he didn't have the access to make it happen. That's probably more common than anyone admits. Good facilitation can make a problem visible and give people a shared language for it. It can't always overcome the power structures that kept the problem invisible in the first place — which is exactly Hadi's point that you can work with those structures, but you can't remove them.

So the question worth sitting with isn't "what's the right technique for collaborative modelling?" It's "what needs to change for the insights from that session to go anywhere?" Sometimes the answer is a workshop. Sometimes it's lunch with the right person. Sometimes neither is quite enough.

---

## Further Reading

**Mentioned in this episode:**

- *Accelerate* by Nicole Forsgren, Jez Humble, and Gene Kim — Susanne Kaiser referenced this as a way to connect software delivery practices to business outcomes in language leadership can engage with.

**Worth exploring:**

- *Team Topologies* by Matthew Skelton and Manuel Pais — directly relevant to Matthias's story; it maps how team structures shape software architecture and where the friction comes from.

- *Domain Storytelling: A Collaborative, Visual, and Agile Way to Build Domain-Driven Software* by Stefan Hofer and Henning Schwentner — both appear in this episode; this is the book behind the practice Stefan described.

- *Facilitator's Guide to Participatory Decision-Making* by Sam Kaner — a practical resource on structuring group sessions so real participation happens, not just its appearance.
