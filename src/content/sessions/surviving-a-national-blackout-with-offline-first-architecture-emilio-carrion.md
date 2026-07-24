---
title: "Surviving a National Blackout with Offline-First Architecture | Emilio Carrión"
slug: "surviving-a-national-blackout-with-offline-first-architecture-emilio-carrion"
status: "Published"
datetime: 2026-08-05T18:00:00.000+12:00
wordpressPublishedDate: 2026-07-12
typeOfSession: "talk"
level: ["Intermediate"]
tags: ["software design", "software architecture", "chaos-engineering"]
video: "https://youtube.com/live/3MHn4rRjuJ8"
meet: "https://meet.google.com/koo-vzyo-yoq"
humantix: "https://events.humanitix.com/surviving-a-national-blackout-with-offline-first-architecture-emilio-carrion"
organiser: "Andrea Magnorsky"
featuredImage: "./_assets/surviving-a-national-blackout-with-offline-first-architecture-emilio-carrion-featured.png"
---

We design for high availability assuming connectivity is always present. But what happens when a nationwide power outage leaves warehouses in the dark and cloud systems completely unreachable?

During a major blackout that impacted most of Spain’s power grid, Mercadona Online had thousands of active orders mid-fulfillment across warehouses. While central systems went down, logistics operations had to continue.

In this session, Emilio breaks down the architectural decisions — and the business trade-offs behind them — that made system survival possible:

- Local-first as a first-class citizen: how edge nodes operated in “bunker mode” with on-site compute, keeping warehouse operations running without central systems.

- The split-brain dilemma: managing state divergence between physical reality and the central database, and the rules that determined which side wins.

- The resurrection problem: reconciling millions of offline transactions once connectivity was restored, including race conditions and data recovery challenges.

Every decision in this architecture was driven by real business constraints: SLAs with physical warehouses, perishable goods with expiration times, and logistics costs measured in thousands per minute of downtime.

This is not a theoretical chaos engineering talk — it is a real-world case study of how architectural trade-offs made years earlier kept a critical business running when everything else failed.

Emilio Carrión | Staff Engineer at Mercadona Tech
