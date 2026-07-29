---
title: "Domain Experiments with Mike Wojtyna"
slug: "domain-experiments-with-mike-wojtyna"
status: "Done"
datetime: 2023-06-29T17:00:00.000+00:00
typeOfSession: "talk"
level: ["Advanced", "Intermediate", "Beginner"]
tags: ["software design", "software architecture"]
video: "https://www.youtube.com/embed/bl0E7-ov4gw"
organiser: "Kenny Schwegler"
coOrganisers: ["Krisztina Hirth"]
guests: ["mike-wojtyna"]
seoMetadescription: "Mike Wojtyna on designing for requirements nobody can foresee: treating the domain as something to experiment against rather than specify up front."
featuredImage: "./_assets/domain-experiments-with-mike-wojtyna-featured.jpg"
---

 Our clients don't know what they need.
This happens because no one can foresee the future. Requirements will evolve and change rapidly over the lifecycle of the project. That's why we need to constantly refine systems. We can keep building and discarding prototypes, but it's extremely costly. Often we can't afford to rewrite everything from scratch only because some new domain insights were discovered.
This eventually leads to a mismatched model. Is there another way?
We can focus on domain only and refine our model through examples, until we find the right conceptual contours ([http://ddd.fed.wiki.org/view/welcome-visitors/view/conceptual-contours](http://ddd.fed.wiki.org/view/welcome-visitors/view/conceptual-contours)). Each such iteration of the model is a kind of experiment challenging the upfront decisions.
During this presentation I'm going to show how you can use example mapping combined with business-oriented TDD to be able to run rapid experiments directly on the domain model, without a need to rewrite the system again. 
