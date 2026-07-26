---
title: "It's like 10,000 streams when what you need is a queue - Chris Simon"
slug: "its-like-10000-streams-when-what-you-need-is-a-queue-chris-simon"
status: "Done"
datetime: 2026-05-26T18:00:00.000+12:00
typeOfSession: "talk"
level: ["Beginner", "Intermediate", "Advanced"]
tags: ["event-driven architecture"]
video: "https://youtube.com/live/tYtfeuRAubg"
meet: "https://meet.google.com/ksm-nqwx-chu"
humantix: "https://events.humanitix.com/streams-queues-chris-simon"
organiser: "Andrea Magnorsky"
guests: ["chris-simon"]
seoTitle: "When You Need a Queue, Not Event-Driven Architecture"
seoMetadescription: "Chris Simon on a team that adopted event-driven architecture and hit head-of-line blocking on day one — and when a queue was what they actually needed."
featuredImage: "./_assets/its-like-10000-streams-when-what-you-need-is-a-queue-chris-simon-featured.png"
---

🎶🎵 A new dev team adopted E-D-A

Got head of line blocking, on their very first day

Isn't it ironic, don't you think 🎶🎵

The last few years have seen widespread adoption of Event-Driven Architecture, supported by DDD practices such as event storming. But what does that orange sticky note become when we start implementing our design? Common implementation choices include event sourcing, streaming platforms like Kafka and queuing systems like RabbitMQ.

Unfortunately not every orange sticky note has the same operational needs, and many teams remain confused about the differences between these options, resulting in the selection of the wrong paradigm for their needs.

This can lead to unnecessary complexity & operational challenges such as head of line blocking, dropped messages, challenges dealing with failed messages, difficulty with adaptive scaling and inadvertently increasing coupling between services.

In this talk we'll bring that orange sticky note into the runtime of our system. We’ll start with a deep dive into the similarities and differences between event streaming platforms such as Kafka and queueing systems such as RabbitMq, Azure Service Bus & AWS SNS/SQS.

We’ll then look at ways to assess your orange sticky notes to work out which messaging and persistence paradigms suit each one, helping you build more resilient, scalable and loosely coupled event-driven architectures.



**About Chris Simon**



Chris is a technology coach and advisor helping technology teams drive business success. His focus is on helping startups realise their vision and new CTOs flourish in their roles. He also supports executives & boards with strategic technology advice, and engineering teams with training, mentoring and consulting in architecture, quality, domain-driven design and test driven development.

He is a regular meetup & conference speaker ([https://chrissimon.au/speaking/](https://chrissimon.au/speaking/)) and to support teams using Domain-Driven Design, he recently launched [https://contextive.tech](https://contextive.tech/) & co-founded the DDD Australia meetup and the ADAConf ([https://adaconf.org](https://adaconf.org/)) conference
