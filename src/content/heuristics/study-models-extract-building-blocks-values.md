---
title: "Study models by extracting their building blocks and values"
slug: "study-models-extract-building-blocks-values"
status: "Published"
question: "How do you understand a model deeply enough to know if it fits your context?"
type: ["guiding-heuristics"]
authors: ["Kenny Schwegler", "Andrea Magnorsky", "Rebecca Wirfs-Brock"]
submitter: "Rebecca Wirfs-Brock"
tags: ["model-thinking", "critical-thinking", "process-models", "decision-making"]
focusKeyphrase: "critically engaging models"
metaDescription: "Study models intentionally by pulling out their building blocks, understanding their beliefs, and recognizing what areas they focus on."
---

When you encounter any model—whether it's team topologies, the five stages of grief, or a domain model—engage with it intentionally rather than accepting it wholesale. Pull out its building blocks (the concrete elements it tells you to work with), understand the beliefs and values embedded in it (what it optimizes for, what it considers important), and recognize what areas it focuses on and what it deliberately leaves out. Models by definition are distillations that leave things out, and understanding what's missing is as important as understanding what's included.

### Example

When comparing Team Topologies and the Spotify model, you can see different building blocks addressing similar problems. Team Topologies has explicit team types and interaction modes but no explicit building block for learning. The Spotify model has chapters and guilds specifically for learning and skill development. Team Topologies focuses on optimizing for fast flow and minimizing cognitive load, while the Spotify model emphasizes learning for growing individual skills and organizational capabilities. By extracting these elements, you can see what each model values and decide which aspects fit your context.

### Context

This approach works best when you can compare and contrast multiple models that address similar problem spaces. The comparison reveals what each model adds or omits. You might find that no single model fits perfectly, and you'll need to adapt elements from different models or add missing pieces that matter to you. If you care about something but there's no building block for it in the model you're adopting, you'll have to keep emphasizing it explicitly to people because the model won't reinforce it naturally.

### Related Heuristics

- **Compare models addressing similar problems to reveal trade-offs** - Directly extends this heuristic by creating the comparative framework needed to extract and evaluate building blocks across models.

- **Ask what people value instead of only asking why they do things** - Complements the values-extraction focus by providing techniques for uncovering the beliefs embedded in both models and organizational practices.

### When This Might Not Apply

This heuristic becomes difficult when only one model exists for your problem space (no comparison point available), making it hard to see what the model prioritizes versus what it omits. It also requires sufficient organizational maturity to engage in critical questioning—in highly hierarchical or time-pressured environments, people may not have space to study models deeply before they're mandated into use.

### Variations

For remote or distributed teams studying models together, create a shared artifact that explicitly maps building blocks and values so people can contribute asynchronously. When working with domain experts unfamiliar with modeling language, translate building blocks into domain terminology they already use rather than introducing new vocabulary. In organizations where models are politically charged, frame the extraction as "understanding the model's problem-solving approach" rather than "critiquing the model."

### Related Concepts

- Rebecca Wirfs-Brock and Mathias Verraes, *Essays on critically engaging with models* - Foundational work exploring how models shape our problem-solving approaches and the importance of intentional engagement with their embedded beliefs.
