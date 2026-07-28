---
title: "When the Loudest Voice in the Room Architects Your Future"
slug: "loudest-voice-architectural-decisions"
status: "Published"
episode: 14
publishedDate: 2026-03-03
authors: ["Gien Verschatse", "Kenny Schwegler", "Evelyn van Kelle", "Andrea Magnorsky"]
tags: ["Facilitating Software Architecture and Design", "Power Dynamics", "collaborative modelling", "Psychological Safety", "Social Dynamics", "Engineering CUlture", "collaborative software design"]
youtube: "https://youtu.be/ClUQkGbIevo"
podcast: "https://player.captivate.fm/episode/39d4201d-1de5-4d28-92c1-2c755489223e/"
curatedHeuristics: ["evaluate-architectural-options-against-team-pain-points", "surface-value-preferences-before-technical-solutions", "consider-downstream-teams-architectural-patterns", "evaluate-options-against-team-frustrations"]
seoTitle: "When the Loudest Voice Architects Your Future"
seoMetadescription: "What happens when a team makes architectural decisions with no one to facilitate them? Gien Verschatse on burnout, bad choices, and lessons learned."
featuredImageSquared: "./_assets/loudest-voice-architectural-decisions-featured-squared.png"
featuredImage: "./_assets/loudest-voice-architectural-decisions-featured.png"
---

It happens more often than we admit: architectural decisions get made not through careful analysis, but because one person in the room speaks louder than everyone else. The consequences ripple outward—through the codebase, through the team, through people's careers.

That's the challenge Gien Verschatse shared with us in this installment of Stories on Facilitating Software Architecture and Design. It's a story about what happens when a team lacks the skills to make architectural decisions collaboratively, and how technical choices can mask deeper organizational dysfunction.

## From Phoenix to Ashes

Gien joined a company early in her career to work on a Phoenix project—one of those fresh-start initiatives that promise to do everything better. Six months in, the company killed it. Too slow, not sellable. The team got reassigned to maintain the old product instead.

The old system hadn't aged well. We're talking technologies that were outdated even then. This wasn't just a technical downgrade—it was an emotional one. The team went from building something new to maintaining something nobody wanted to touch.

Still, the team tried to make the best of it. They were enthusiastic about domain-driven design. They had no architects, just software developers figuring things out together. Gien organized an EventStorming session to understand where they were. She worked with the team to map technical debt from an emotional angle: What frustrates you most? What makes your job difficult?

## The EventStorming That Went Nowhere

The EventStorming was a disaster. Gien couldn't get people to step away from how the system currently worked. They were stuck in the present, unable to imagine alternatives. The session that was supposed to open up possibilities just reinforced how trapped everyone felt.

Meanwhile, the team had other dynamics at play. One developer with a dominant personality. A team lead who was the opposite—quiet, less assertive. A manager who'd been promoted from senior developer without the skills the role actually required. "You see that often when software developers get promoted to management positions," Gien observed. "They're very good at their job, which is software development, but it takes a whole different kind of skillset."

Meetings were tense. The team wanted to modernize, but the loudest voice in the room kept winning. That voice wanted to implement an event sourcing system—cutting edge at the time, exciting technology. The decision got made without much thought about consequences.

## The Architecture That Solved Nothing

The event sourcing system got built completely alongside everything that already existed. The emotional wall of technical debt the team had mapped? None of it got tackled. People would only see relief two or three years down the line when they could finally kill parts of the old system.

The new architecture created new problems. The QA team didn't know how to test it. IT didn't know how to deploy it—suddenly there were queues and distributed components they'd never dealt with. The software handled sensitive information and stayed on-premises, which made everything harder.

"We didn't think about it at all," Gien reflected. "The person who was the loudest in the meeting got their way. There was no plan. There was no sitting down and thinking this through. It was just 'this is the latest and greatest and we're going to do that and screw everybody else.'"

Nobody thought about what this would mean for other teams. Nobody had the skills to think through architectural decisions properly. Nobody was there who knew how to facilitate this kind of choice.

## The Exodus

People started leaving. The work wasn't getting better. The job wasn't getting easier. There was no end in sight. Eventually, Gien left too, after a massive burnout. She felt like she'd failed—that she couldn't make it work in that environment.

Looking back fifteen years later, she sees it differently. "It was pretty toxic to work in. The architectural decision that we made was just really bad. I don't know why I stayed. I should have left sooner. It's okay to quit bad environments, bad situations."

The company itself barely survived. At some point, one person was left maintaining the product for remaining customers. The company eventually invested in a different, similar product they acquired instead.

## Unpacking the Dynamics

Several patterns emerge from this story:

- **Architectural decisions as emotional outlets**: The push for event sourcing wasn't really about event sourcing. It was about fear—fear of skills becoming outdated, fear of being stuck in legacy technology forever, fear of career stagnation. The architectural choice became a way to express that fear without naming it.

- **The absent facilitator**: Everyone was a colleague with opinions and skin in the game. Nobody had the role, skills, or distance to facilitate the decision properly. "We were all colleagues," Gien noted. "No one knew how to make architectural decisions. No one really had that role, but also nobody was facilitating this."

- **The promotion trap**: Promoting strong technical people into management without considering whether they have or want to develop management skills creates dysfunction that cascades down. The assumption that "you're just supposed to be able to do" communication and people management sets everyone up to fail.

- **Dominant personalities aren't the problem—how we handle them is**: Gien was clear about this. "The dominant character is not a red flag per se. It's that if the environment and the culture allows that to become something toxic, then you have a problem." Dominant people can contribute well in healthy environments. In unhealthy ones, they steamroll everything.

- **Technical decisions that ignore consequences**: Choosing event sourcing without thinking through deployment, testing, or how it related to existing pain points shows what happens when decisions get made in a vacuum. The technology itself wasn't wrong—the process was.

- **The failure of leaving**: Gien felt like a failure for leaving. Many people do. But staying in toxic situations doesn't make you stronger—it makes you burned out. "Quit sooner. It's okay to quit bad environments."

## What Would Help Now

When asked what she'd do differently with her current experience, Gien described a different approach entirely:

"I would put their proposal next to all the other things that you can do architectural wise to improve the legacy system. I would dig a hell of a lot deeper into the consequences. What is really bothering people? What makes the job unpleasant? I would notice that sooner and bring that up as something not positive about going for that implementation."

She'd also look for the values and fears driving the strong preferences. Why the strong reaction? What's underneath it? "Most people don't analyze their emotions. They definitely don't understand the values or ethics or morals that are pushing them."

By talking about value-based heuristics and preferences instead of emotions directly, you can have the conversation without triggering people's defenses. "We're talking about your emotions," Gien noted, "but in a way that people don't quite get you're talking about emotions. After 20 years in the software industry, which is male dominated, I have found a way to talk about emotions that isn't really talking about emotions."

## The Real Cost

This story isn't really about event sourcing, or FoxPro, or even one dominant developer. It's about what happens when teams lack the skills and structures to make architectural decisions together. When there's no one to facilitate, no one to dig into the values and fears driving preferences, no one to think through consequences beyond the immediate technical excitement.

The cost shows up in burnout, in people leaving, in companies that barely survive. The architectural decision was bad not because event sourcing was wrong, but because the process that led to it was broken. And in software, process and structure aren't separate from technical decisions—they're what makes good technical decisions possible in the first place.

## Further Reading

**Value-based heuristics: **The Psychology of Computer Programming: Silver Anniversary Edition by  Gerald M. Weinberg.  Looks at computer programming as human performance, a social activity, and an individual activity and reviews programming tools. 
