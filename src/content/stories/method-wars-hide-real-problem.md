---
title: "When Method Wars Hide the Real Problem"
slug: "method-wars-hide-real-problem"
status: "Published"
episode: 17
publishedDate: 2026-04-07
authors: ["Simon Wardley", "Andrea Magnorsky", "Kenny Schwegler", "Andrew Harmel-Law"]
tags: ["facilitating software architecture and design", "software architecture", "governance", "sociotechnical systems", "stakeholder communication", "power dynamics"]
youtube: "https://youtu.be/uM_X2ypvaA0"
podcast: "https://player.captivate.fm/episode/f124eda9-769d-442e-ac9f-b1a12d478ec6/"
seoTitle: "Why Method Wars Hide the Real Architecture Problem"
seoMetadescription: "Simon Wardley on how mapping the evolution of components ended the methodology wars on HS2 — context matters more than picking the right method."
featuredImageSquared: "./_assets/method-wars-hide-real-problem-featured-squared.png"
featuredImage: "./_assets/method-wars-hide-real-problem-featured.png"
---

We fight about Agile versus Six Sigma, build versus buy, in-house versus outsourced. We pick our methodology camps and defend them. But most of these battles miss the point entirely.

That's the challenge Simon Wardley shared with us in this installment of Stories on Facilitating Software Architecture and Design. It's a story about how HS2, Britain's high-speed rail project, avoided the typical government IT disaster by doing something simple: looking at their landscape before picking their methods.

## The Sunday Afternoon That Changed Everything

James Finley, CIO for HS2, had a problem. They needed to build a virtual railway before building the physical one—because it's cheaper to mess up a virtual landscape than the English countryside. The typical approach would be to group components by domain (engineering, back office, infrastructure), outsource to different partners, and watch the cost overruns pile up.

James spent a Sunday afternoon doing something different. He mapped the entire system.

Not just a component diagram. Not just an architecture graph. A proper map. He started with users at the top—architects who needed to virtually walk through the railway, engineers who needed geographical information. Then he traced down through their needs: GIS systems, land registry, project information systems, risk management. Finally, he asked a critical question about each component: how evolved is it?

## The Axis That Changes Everything

Some components sat firmly in commodity territory. Power, compute, data centers—utterly standard. But land referencing systems? Custom built. 3D visualization for this specific railway? Novel, evolving, uncertain.

This is where the map reveals what methodology wars obscure. When you plot components on an evolution axis from genesis to commodity, you stop arguing about whether Agile or Six Sigma is "better." You start seeing that you need both.

Genesis and custom-built components on the left side of the map? Build in-house with Agile. Change is constant, so you need methods good at reducing the cost of change. Products in the middle? Off-the-shelf with Lean approaches, focused on reducing waste. Commodities on the right? Outsource to utility providers if they exist, use Six Sigma if you're building them yourself.

James took the map back to his team. They challenged it, refined it, challenged it again. Then they built the system using multiple methods simultaneously. They delivered ahead of schedule, under budget—remarkable for any government engineering project.

## The Story We Tell Ourselves

Simon's told this story at various conferences. At Agile conferences, he says "Agile has its place, but it's not appropriate everywhere." They want to burn him. At Six Sigma conferences, same story, same reaction. Scaled Agile Framework devotees? Same problem.

The issue isn't chaos in most organizations. It's too much order. Too much "this is our chosen methodology" with no attention to context. We pick our camp and then force every problem to fit our solution.

The worst part? When projects fail using the wrong method, we generate predictable excuses. "We didn't specify the requirements well enough" is the classic one. But you can't specify novel work well enough. That's the whole point. The work is going to change. You need methods that embrace that, not fight it.

## Why Military Backgrounds Help

James had an advantage. He came from the Navy, where situational awareness isn't optional. Military folks understand viscerally why maps matter, why context matters, why looking at the landscape before picking your approach isn't just nice—it's survival.

For people without that background, especially those who've spent 20 years applying one methodology everywhere, suggesting they look at context sounds like "you've been doing it wrong for 20 years." Which they have. But if they're senior, they really don't want to hear it.

## The Politics of Visibility

When you map a system, things become visible. That's powerful. It's also dangerous.

Andrew raised the problem of weaponized silence—people deliberately withholding context to keep their map in a certain shape. Simon's solution from his research groups: use multiple perspectives. When mapping an industry like AI or transport, break into seven different groups, each mapping from their own angle. Then aggregate.

You can hide the Eiffel Tower in your map of Paris. But if it appears in six other maps, it sticks out. The aggregation dilutes individual political power while preserving everyone's contribution.

This also handles the dominant personality problem. Yes, loud voices will shape their group's map. But you're looking for signals across all the maps, not any single view.

## Stories Versus Maps

Simon made a subtle point about why maps work better than stories for design discussions. We're told great leaders are great storytellers. So when you challenge someone's story, you're challenging their leadership. They get defensive.

Challenge a map instead. It's not personal. It's about whether this component is really a commodity or still custom-built. Whether these users actually need this capability. Whether this boundary makes sense.

He once mapped culture itself—using Brexit supporters and opponents. Two groups who couldn't agree on anything in story form. But they could have productive arguments about where components sat on the map. The map created safe space for challenge.

## Unpacking the Dynamics

- **Context blindness creates methodology wars**: We argue Agile versus Six Sigma because we're not looking at what we're building. If we mapped it, we'd see we need both in different places.

- **Contract structures encode context ignorance**: Traditional government contracts bundle genesis, custom, product, and commodity components together, then wonder why costs spiral. The contract structure assumes one approach fits all.

- **The excuse loop prevents learning**: "We didn't specify well enough" → try to specify better → fail again → repeat. Without understanding context, we can't break the loop.

- **Seniority invests in methodology**: Twenty years using one approach creates identity and expertise. Suggesting context matters threatens that investment.

- **Multiple perspectives defeat politics**: Individual actors can shape their local view, but patterns emerge across aggregated maps that no single voice can suppress.

- **Safe challenge requires depersonalization**: Moving from story to map moves criticism from "you're wrong" to "this representation might be incomplete."

## The Practice Problem

You can't learn mapping from a book any more than you can learn guitar from a book. At some point, you have to map something real. Andrea described joining Simon's transport research group specifically to practice—to see how mapping works on systems, not just theory.

The caution Simon offers: maps get people fired. Not because mapping is wrong, but because it makes visible what was comfortable to ignore. Political toes get stepped on. Power structures based on information asymmetry get threatened.

Start small if you're not at the top. Map a problem space with your immediate team. Practice the challenge process. Build the muscle before taking it to senior stakeholders who've built careers on the approaches you're implicitly questioning.

James Finley didn't revolutionize government IT delivery with exotic new methods. He used Agile where it fit, products where they fit, outsourcing where it fit. The revolution was looking at the landscape first, then picking tools that matched what he saw. Everything else followed from that one Sunday afternoon spent mapping instead of methodologizing.

## Further Reading

**Wardley Mapping**: Simon Wardley, *On Being Lost* - Free online resource unpacking how maps expose context blindness and defeat one-size-fits-all methodologies in real projects (https://medium.com/@swardley/on-being-lost-2cf99e43f582).

**Facilitation Practice**: Simon Wardley (Leading Edge Forum), *Situational Awareness Research Groups* - Community resource for hands-on mapping practice in transport and other sectors, as Andrea did to build real skills.
