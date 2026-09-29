---
title: "Everyone Agreed on the Standard and Nobody Used It"
slug: "architecture-standards-adoption"
status: "Published"
episode: 29
publishedDate: 2026-09-29
guests: ["wouter-lagerweij", "suzanne-lagerweij"]
hosts: ["Kenny Schwegler"]
tags: ["facilitating software architecture and design", "consensus", "governance", "team autonomy", "ivory-tower architect", "adr", "ownership"]
youtube: "https://youtu.be/S4U9MmupnoE"
podcast: "https://player.captivate.fm/episode/53882351-d209-417e-ae0b-5bc62eaba157/"
seoTitle: "Architecture Standards Adoption: Why Nobody Used Them"
seoMetadescription: "Why do teams ignore standards they helped write? Wouter Lagerweij on architecture standards adoption and why ownership, not consensus, makes change stick."
featuredImageSquared: "./_assets/architecture-standards-adoption-featured-squared.png"
featuredImage: "./_assets/architecture-standards-adoption-featured.png"
---

A team sits down to plan the next sprint. On the backlog is a technical improvement that implements one of the shiny new architecture standards the organisation spent months agreeing on. There's a written document. There's example code. There's a production service that already uses it. The person who wrote that example code used to be on this very team, still talks to them regularly, and has explicitly said he'll help. The team looks at the ticket and says: "Yeah, we don't know. We'll postpone it to the next board."

That moment is where Wouter Lagerweij knew the whole thing had failed. In this episode of Facilitating Software Architecture and Design, he tells Kenny Schwegler — with Susanne Lagerweij joining in — the deliberate counterpoint to the success story from the previous episode. Wouter has been building software and helping others build it for nearly 30 years, and he wanted to talk about a case where every structural condition for collaborative architecture was met, and nothing moved anyway.

## A Company Where Nobody Tells Anybody Anything

The setting: a large organisation grown by takeovers and mergers. That growth brought a wide spread of technologies, and an equally wide spread of cultures. Very little standardisation, no common architecture.

What it did have was a strong belief, held by individual teams and often individual developers, that no one can tell us what to do. Wouter is sympathetic to that instinct — he says he quite likes that sort of thing. But it had curdled into something else. "No one is actually telling anyone what they're doing," as he puts it. Autonomy without communication.

The ask from the organisation was reasonable and, on paper, exactly right: we need standardisation, we need a common architecture, and it needs to come from the teams.

## The Process Worked Beautifully

So they did the obvious thing. Bring people from across the different teams and different technology stacks together. Talk about what exists. Find shared ground.

It took a while. There was a lot of existing material and a lot of opinions. Wouter describes it as feeling bureaucratic and slow — but it was progressing. Standards started appearing. ADRs were written, discussed, shared with a wider group, ratified. Attendance at the sessions was good. Discussion was lively, because everyone had an opinion.

Meanwhile Wouter was doing his usual work with individual teams — story mapping, BDD, documenting existing systems and building well-tested new services. Good examples were accumulating. It was starting to look like what everyone wanted it to look like.

Then after roughly half a year, someone noticed. The standards had been accepted. And they were parked on a website. Practically nowhere in the organisation was anyone adopting them.

## Even the Authors Weren't Using Their Own Standards

This is the detail that makes the story worth telling. The teams whose own members had been instrumental in creating the standards were not adopting the standards either.

Worse, the collaborative process itself started attracting resentment. Wouter reaches for a phrase that lands hard: it came to be seen as a "distributed ivory tower." Your own colleague sat in those sessions and still the output felt like a requirement handed down from elsewhere — something to be held at arm's length rather than part of the work.

Kenny wondered whether the problem was tension between the person who joined the sessions and the rest of their team. Wouter's answer reframes the whole thing: "I think that not even the person that was involved actually felt they owned it."

The forms were all correct. The distribution was real. The ownership was not.

## They Tried Almost Everything

Over the course of the project they pulled most of the levers you would expect:

Make adoption as easy as possible — documents, examples, working production code, a named person available to help. Didn't matter. Get the widest possible representation in the sessions. Not the missing ingredient. Have technical leadership say clearly, "you can spend time on this." Didn't have the effect they expected.

One thing did work. A couple of sprints dedicated purely to removing defects, part of a push towards a zero-defect policy — one of Wouter's pet peeves. When the slate was cleaned completely and there was nothing else on it, teams delivered.

That tells you what the actual constraint was. Feature delivery pressure was still there, still relentless, and the politics outside the technology organisation were never settled. The only lever teams felt able to pull was "we need to go slower." Wouter doesn't think that was strictly true, but it was the felt experience. And slowing down doesn't get an organisation through regulatory change or into a better market position.

## Too Much Room to Object

Kenny pushed on whether the process had been captured by bureaucracy — taken over by other people, leaving the originators out of the loop. Wouter rejected that. "Oddly enough, I do think it was their process." It certainly wasn't his. The group designed it themselves.

And they designed it around the principle that everyone must have their say. Which meant a lot of room for blocking a proposal because someone disagreed. Which meant slow movement and heavy iteration.

Kenny named it: design by committee. Consensus rather than consent. He drew the distinction he keeps having to draw with clients who confuse the two — the advice process is not the same as requiring everyone's agreement, but many people only see two states, either someone decides unilaterally or everyone must agree.

Wouter's conclusion is uncomfortable for anyone who believes more inclusion is always better: "because there was such explicit room for dissent and discussion, I think people maybe lost ownership, lost the feeling of ownership."

When a decision has passed through enough hands that no one can point to the part that was theirs, no one carries it home.

## Susanne's Question About Informal Leaders

Susanne raised something Wouter couldn't fully answer. Were the right people in the room? Technically, yes — they were the technical leads, and they self-selected rather than being assigned. But as she noted, "the technical lead is not necessarily the informal leader of the team." The person with the title isn't always the person whose enthusiasm changes what a team actually does on Tuesday morning.

In the previous episode's success story, the approach had been to find the early adopters who were already doing the thing on their own initiative, and fan that fire. Here, there was no fire to fan. The individuals cared about the topics. They came up with good solutions. But, in Wouter's words, they weren't "passionate about getting the change through."

## What Was Actually Missing

The missing ingredient, Wouter says, was a change agent applying energy consistently — and in an organisation that size, that can't be one person.

His own pattern, when this has worked, looks different from what happened here:

- **He inserts himself where he can guarantee slack.** Not as a facilitator on the side, but in a position in the organisation where he can actually create room for the work. Creating that room is itself the message that the work matters.

- **He removes delivery pressure first, then makes quality important.** People rise to it, and then they pull their colleagues in. Adoption spreads sideways rather than being pushed down.

- **He would spend far more time getting one single change implemented.** Not ratifying twenty standards, but landing one, and using that as proof that landing things is possible here.

- **He notes that scale was working against him.** His successes have been on smaller scale, in places where a single person could hold the protective umbrella. Distributed organisations with genuinely different subcultures make that much harder.

- **He'd send in several people whose only objective is to raise the energy applied to the change.** Not to design the standards. Just to keep the change moving.

Susanne added the piece that connects it to behaviour: energy matters, but so does the *because*. "Why you're doing it needs to be explained and needs to be connected to what the people in the teams actually think is important." She's seen clients propose building a dashboard so teams become aware of what they should do differently — and had to explain that the dashboard isn't the change. Coaching people is the change.

Kenny wondered whether this was cognitive load, in the Team Topologies sense — should we be bringing in psychologists to understand what a team can actually carry? Wouter thinks not quite. Cognitive load is about processing information and knowledge. "I think this one is much more emotional."

## Sitting With It

There is something genuinely unsettling in this story for anyone who runs collaborative design sessions. You can invite the right people, let them design their own process, give them explicit permission to spend time on it, produce documented standards with working examples and a helpful author on call — and still end up with a website full of decisions nobody implements. And the more carefully you protect everyone's right to object, the more likely it becomes that nobody feels the thing is theirs.

So here's the question worth carrying into your next architecture forum: if you asked each participant to name the one decision from the last six months they would personally defend, in their own team, on a bad sprint, when the feature pressure is highest — could they? And if not, what have you actually been building consensus about?

## Further Reading

**Mentioned in this episode**

- *The Product Owner's Guide to Escaping Legacy* by Wouter Lagerweij — his own book on collaborative, iterative approaches to legacy in both technology and organisation, written out of exactly the kind of environments described here.

- *Team Topologies* by Matthew Skelton and Manuel Pais — Kenny brings up cognitive load as a possible lens on why teams couldn't absorb the change; Wouter argues the constraint here was emotional rather than cognitive.

**Worth exploring**

- *Fearless Change* by Mary Lynn Manns and Linda Rising — a pattern catalogue for introducing change in organisations, including how to find and support the people who will actually carry it.

- *Team Guide to Software Releasability* — or more broadly, the Accelerate research by Nicole Forsgren, Jez Humble and Gene Kim — for the evidence on how delivery pressure and slack affect a team's ability to improve anything at all.

- *Diffusion of Innovations* by Everett Rogers — the original work on early adopters and how practices actually spread through a population, which is essentially what failed to happen here.

- *The Culture Map* by Erin Meyer — useful if you're working across the kind of merged, multi-cultural organisation where the same facilitation approach lands very differently in different subsections.
