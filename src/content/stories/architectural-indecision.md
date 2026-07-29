---
title: "Navigating Architectural Indecision: What to do when teams stay silent"
slug: "architectural-indecision"
status: "Published"
episode: 4
publishedDate: 2025-10-14
hosts: ["Andrea Magnorsky", "Kenny Schwegler", "Andrew Harmel-Law"]
authors: ["Andrea Magnorsky", "Kenny Schwegler", "Andrew Harmel-Law"]
tags: ["software architecture", "team collaboration", "facilitating software architecture and design", "adr", "technical leadership", "collaborative software design"]
youtube: "https://youtu.be/hYOztFDJSmM"
podcast: "https://player.captivate.fm/episode/a6cf2188-2539-4986-8975-a44af952981d/"
curatedHeuristics: ["value-lived-experience-over-theoretical-principles", "prioritise-system-integrity-over-local-convenience", "respect-apathy-in-decision-making", "ask-what-does-it-take-to-go-along-with-a-decision", "proxy-accountability-to-unblock-decisions", "address-dissent-by-enabling-commitment", "generate-experience-through-practical-experimentation"]
seoTitle: "Navigating Team Indecision in Software Architecture"
seoMetadescription: "What to do when a team stays silent and no decision gets made — a real story about giving developers ownership of their own technical choices."
featuredImageSquared: "./_assets/architectural-indecision-featured-squared.png"
featuredImage: "./_assets/architectural-indecision-featured.png"
---

You gather the team, present a critical architectural decision, and open the floor for input. You are aiming for collaboration, for shared ownership. But you are met with silence. Or perhaps a hesitant deference: "You're the architect, you decide.”

This is a common and uncomfortable moment for anyone facilitating software architecture and design. How do we balance the ideal of democratic, team-led decisions with the practical need to move forward, especially when a team feels uncertain or unequipped?

In our recent story of Facilitating Software Architecture and Design we talked about the heart of this challenge. It provides a valuable lesson in leading by listening and knowing when to step in.

## A Story of Growth and Hesitation

An organisation was scaling rapidly, with plans to grow from eight to over one hundred developers in the next 2 years. The existing codebase, built on vanilla JavaScript, wouldn't support this growth. The CTO mandated a move to a modern framework, and the choice was narrowed to Vue or React.

The architect in this story, Kenny, wanted the team to make the call. His goal was to foster a culture of decentralised decision-making. However, the team was relatively junior. A few had some experience with React, one preferred Vue, and a couple of others had no strong opinion either way. A consultant on the project was a React expert, but relying solely on their advice felt wrong, as they wouldn't be there to live with the long-term consequences.

The discussion stalled. The burden of the decision fell onto a single mid-level developer who felt immense pressure. They were uncomfortable being the one to make a choice that would affect the entire future of the company’s front-end development. What if they chose wrong? The fear of future blame created paralysis.

Seeing the team stuck in a state of indecision, the architect shifted his approach. He didn't force a vote or push the developer to make a call. Instead, he states that there is an indecision and once people recognised the same, spoke their mind, he offered a way out by asking for their consent: "Do you want me to make the decision?"

The team agreed. With their consent, he made the call to go with React. But the process didn't end there. His next question was just as important: "What do you need to go along with this?"

The answer was clear: training. And so, training was arranged for the entire team. The decision was made, the pressure was relieved, and a constructive path forward was established.

## Deconstructing the Silence

This story highlights a crucial aspect of our work: silence doesn't always mean apathy. When a team won't decide, it's often rooted in deeper issues.

**Fear of Accountability:** Most developers have worked in codebases where they’ve felt the pain of a poor decision made years ago. This creates a natural fear of being the person responsible for the next "bad" decision. They are acutely aware that what seems right today might cause significant problems tomorrow.

**Lack of Experience:** Sometimes, the team genuinely doesn't have enough information or experience to form a strong, well-reasoned opinion. In these cases, asking them to decide is asking them to guess.

**It's Okay Not to Have an Opinion:** We often assume everyone wants to be involved in every major decision. The reality is that some people are happy to trust the judgement of others and focus on their work. Forcing participation from those who would rather abstain can be counterproductive.

## Practical Tools for the Facilitator

Navigating these situations requires more than just technical knowledge; it demands empathy and a flexible approach. The story offers a few powerful techniques.



**1. Ask for Consent to Decide through a climate report**
This is a simple but profound move. When faced with silence or indecision, instead of making an autocratic decision, you offer to take on the responsibility as a service to the team. It respects their autonomy while providing a way to unblock progress. Start with what we call a climate report from Deep democracy, and start with what you observe factually: “I see you cannot make a decision”. This will invite someone to speak up. Once people agree with the observation and describe their problem, but do not come up with a solution, you can propose one: “I can help by taking on the weight of this decision."



**2. Make "Disagree and Commit" Meaningful**
The phrase "disagree and commit" is often used as a way to shut down discussion. A more constructive approach is to follow up with, "What do you need to commit?" This question transforms a command into a negotiation. It acknowledges dissent and actively seeks to address the concerns of those who are not fully on board. The answer might be training, a proof-of-concept, or simply an agreement to review the decision in six months. It builds buy-in by showing you value the team's perspective even if the final decision goes another way.



**3. Create Psychological Safety**
People need to feel safe to voice uncertainty or a dissenting opinion without fear of negative consequences. As a facilitator, you can proxy for those who are hesitant. If someone shares a valid concern privately, you can offer to bring it to the group yourself. Using tools like Architecture Decision Records (ADRs) also helps by formally documenting the context, the trade-offs, and the reasoning behind a choice. This shifts the focus from who made the decision to why the decision was made, based on the information available at the time.

## The Goal is Progress, Not Perfect Consensus

Facilitating software architecture is less about enforcing patterns and more about navigating the complex human dynamics of a team. While we should always strive to enable teams to own their decisions, our primary role is to ensure the system and the team can move forward in a healthy way.

When faced with silence, our first job is not to force a decision but to understand its cause. By creating safety, asking for consent, and committing to support the team, we can turn moments of indecision into opportunities for growth and trust.

This is a challenge many of us face. How have you helped your teams move past indecision? We would be interested to hear about your experiences.
