---
title: "The true cost of \"The simplest thing to do\""
slug: "true-cost-simplest-thing-to-do"
status: "Published"
episode: 8
publishedDate: 2025-12-09
guests: ["krisztina-hirth"]
hosts: ["Andrea Magnorsky", "Kenny Schwegler"]
authors: ["Krisztina Hirth", "Andrea Magnorsky", "Kenny Schwegler"]
tags: ["facilitating software architecture and design", "strategic design", "technical debt", "legacy modernisation", "engineering culture", "event-driven architecture"]
youtube: "https://youtu.be/eyJhUqGJgbA"
podcast: "https://player.captivate.fm/episode/b9001bb9-070a-4c03-89e4-faf221c37778/"
curatedHeuristics: ["permit-contained-failure-to-foster-learning", "distinguish-between-tigers-and-mice-in-design", "domain-events-must-carry-their-own-context", "the-goal-is-the-right-outcome-not-being-right", "mistrust-simplicity-achieved-without-thought", "a-decision-is-what-gets-implemented"]
seoTitle: "The True Cost of \"The Simplest Thing to Do”"
seoMetadescription: "Krisztina Hirth on how choosing 'simple' technical events over real domain events produced 90% noise and an eight-month cleanup."
featuredImageSquared: "./_assets/true-cost-simplest-thing-to-do-featured-squared.png"
featuredImage: "./_assets/true-cost-simplest-thing-to-do-featured.png"
---

As architects and senior engineers, we often face a difficult choice: when do we intervene, and when do we step back? What happens when you see a team heading towards a decision you know is going to have a negative net effect, but they won't be convinced otherwise? Do you enforce your view, or do you let them learn from experience?

Krisztina Hirth shared a story with us from the beginning of her journey at PayFit, during a company-wide initiative to modernise the architecture. It’s a story about a one-day implementation that took eight months to fix, and why, in the end, it was one of the best things that could have happened.

## The Stalemate Over "Domain" Events

We have decided to move towards an event-driven architecture to improve scalability and flexibility. I was working with one of the first teams to adopt this new paradigm. They were a small, fast-moving team, very proud of the software they had built.

We scheduled a meeting to agree on which domain events they should publish. The keyword here is *domain*. A domain event signals that something important has happened from a business perspective. However, the team saw it differently. To them, an event was just a "technical JSON something sent to the messaging" system. The word "domain" was just another buzzword, and it was being completely ignored.

For over an hour, I tried to explain the difference. I could see that their proposed technical events would lead to a cascade of problems, primarily duplicated logic across many other teams that would consume these events. But they wouldn't budge. Two team members were silent, and one was passionately defending their approach. His primary reason? The repository was so clean, and he didn't want to "mess it up."

I was speechless. After an hour of trying every angle—explaining nicely, showing potential problems—I realised we were not making any progress. I couldn't make the decision for them. Even if I had forced my solution, would they have implemented it with any real understanding or commitment? Probably not.

## A Deliberate Step Back

At that moment, I had to decide what was truly important. My goal wasn't to be right or to create the "perfect" event on day one. This was the very beginning of our transformation. My goal was to give the team the opportunity to start learning. And what is the most effective way to learn? By failing.

I often think of a quote from statistician George Box: "It is inappropriate to be concerned about mice when there are tigers abroad." In this situation, getting the event design perfect from the start was a mouse. The tiger was getting the team engaged with the new architecture, thinking about events, and building real-world experience.

So, I gave up trying to convince them. I decided to let them proceed.

## The Spectacular Failure

I didn't expect them to fail so spectacularly, but they did.

Their service had a very high throughput. Within a month, this one small team was publishing 90% of all the events in the entire company. Of those millions of events, perhaps one per day was actually useful. The rest was noise.

Just as I had anticipated, every other team that consumed these events had to write complex filtering logic to discard the useless information. The duplicated code I had warned them about was now a reality, spread across multiple services.

About a month later, a member of the team contacted me. He shared the logs, showing that they were completely flooding the message bus. I pointed out that the logs themselves were adding to the noise and asked him to consider the money we were throwing away on useless processing and storage.

Two months after our initial meeting, he came back. "I'm so sorry we didn't listen to you," he said. They finally understood. They had the proof.

## The Eight-Month Fix and the Real Success

The team now owned the problem. They triggered the solution, came to me, and asked, "How should we fix it?"

This was the turning point. They invested the time they had tried to save initially. They spent about ten hours talking to the consumer teams to understand what they *actually* needed. This process, which should have happened at the start, was now driven by a deep understanding of the problem. They curated a list of five specific, valuable domain events. The noise dropped from 90% of the system's traffic to just 1%.

But here’s the crucial lesson: while the initial mistake took one day to implement, it took us **eight months** to fully correct it. We had to go through every consuming service and remove all the wasteful filtering logic that had been built to cope with the noise.

This story became the perfect illustration for every lesson I ever wanted to share about domain events.

- **It was a powerful lesson for the team.** They learned first hand the cost of choosing the "easy" way and the difference between a technical event and a domain event.

- **It created a compelling internal story.** The team itself presented two internal talks about their journey, sharing what they learned from their mistake.

- **It gave us evidence for leadership.** I could use this data to show that "going fast" is often an illusion. A one-day task that creates eight months of corrective work is not fast. It highlights the need to invest time in proper design and thinking.

- **It led to systemic improvement.** The experience resulted in a new, company-wide RFC process for proposing domain events. Now, anyone who wants to publish an event must explain the business value and context, and the proposal is discussed publicly.



Looking back, the entire eight-month saga was a huge success. It was an asynchronous domain modelling session, played out in production. The team needed to see the consequences for themselves. My role wasn't to prevent them from making a mistake, but to ensure it was a safe one to make and to be there to help them learn from it. Sometimes, the most valuable thing we can do is step back and let the lesson unfold.
