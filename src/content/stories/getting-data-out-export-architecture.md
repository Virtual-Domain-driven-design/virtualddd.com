---
title: "Someone Went on Holiday and Handed Over a Laptop Full of Scripts"
slug: "getting-data-out-export-architecture"
status: "Published"
episode: 27
publishedDate: 2026-09-01
guests: ["kathryn-hempstalk"]
hosts: ["Andrea Magnorsky", "Kenny Schwegler"]
tags: ["facilitating software architecture and design", "sociotechnical systems", "stakeholder alignment", "team collaboration", "legacy modernisation", "engineering culture", "data engineering", "data as a product", "team topologies"]
youtube: "https://youtu.be/7NO0iKut_D0"
podcast: "https://player.captivate.fm/episode/ff0130df-1405-47d6-875c-eb15ae4b7b8a/"
seoTitle: "Getting Data Out: The Requirement Nobody Designed For"
seoMetadescription: "Getting data out of an application is a first-class design problem. Learn how one team replaced 200 hand-copied scripts with templates, and what it cost."
featuredImageSquared: "./_assets/getting-data-out-export-architecture-featured-squared.png"
featuredImage: "./_assets/getting-data-out-export-architecture-featured.png"
---

We tend to think about how data gets into an application. The forms, the validation, the transactional database quietly recording everything in neat rows. What we think about far less is how that data comes back out — and who is on the other end trying to get it. Because it turns out the person who needs a weekly report is rarely a software engineer, and "just use the API" is not the helpful answer we imagine it to be.

In this episode of Stories of Facilitating Software Design and Architecture, Andrea Magnorsky and Kenny Schwegler are joined by Kathryn Hempstalk, a data and AI professional who describes herself as having done machine learning "since before it was cool." She brought a story from her time as head of data and AI at a company handling retail crime reports. It is, in her words, "a bit of a tragic tale" — one that starts with a graduate manually emailing spreadsheets and ends up asking a much bigger question about where data teams and software teams draw their fences.

## The Manual Process That Grew Legs

The product takes shoplifting reports from supermarkets and big retailers. Staff enter reports, the platform consolidates them, and law enforcement can look at the results. Simple enough on the way in. The trouble was on the way out.

The customers were loss prevention experts, not developers. They didn't want an API. They wanted a spreadsheet. So before Kat joined, the company solved this the way small companies often do — they hired someone fresh out of university to write Python and SQL scripts, export the data, and email it to customers by hand.

It worked, in the sense that customers got what they asked for. But it was one person pressing buttons. And when that person went on holiday, they literally handed their laptop to someone else so the reports could keep going out.

## When "A Bit of Automation" Becomes the Load-Bearing Wall

At some point the laptop landed with an engineer, who reasonably thought "this is a bit scary." So they added some automation — a Windows virtual machine, scripts synced through GitHub, scheduled tasks firing off at set times, output files dropped into Azure Blob Storage and emailed out as download links.

No more manually pressing buttons. But the underlying problem didn't go away. It just got faster to reproduce. As the business grew, the team ballooned to three or four people whose entire day was copying scripts, tweaking them slightly for each customer, and setting schedules.

Everyone lost. The analysts weren't using their skills. Customers waited weeks for a change as simple as adding a column, because the backlog was enormous. And every new customer meant more scripts, edging towards needing another person. Kat was blunt about the risk of the copy-paste approach: "Very scary if something was wrong with one of the scripts and you found out with one of the later copies."

## The Right Tool Doing the Thing It Was Built For

When Kat arrived, one of her tasks was adding a data warehouse. The reports had been running off a mirror of the production server — which meant they were slow, expensive to keep at production scale for one task, and prone to timing out. Big customers entered thousands of reports a day, and a report could take a couple of hours to run. If a second one started during that window, there was a good chance it fell over. People spent nights and weekends keeping it alive.

The warehouse, running on Snowflake, changed the physics. Queries that took hours on the SQL server came back in under a couple of minutes. Kat's favourite moment came from one of the insights team, who ran a big query and assumed they'd made a mistake because it returned almost instantly. "And then I realized I had done something wrong — that I'd even forgotten to filter it." It had scanned the entire dataset that fast.

The first step was deliberately boring: same queries, same data structures, just running on compute designed for the job. Over time they layered in views and materialised tables so the joins were pre-prepared, using DBT to manage it as infrastructure as code.

## Two Hundred Reports That Were Really Five

Here is where the story stops being about technology. There were still 200 custom reports. But because they'd been built by copy-paste, the team realised there were really only five or six underlying shapes. They could collapse 200 into a handful of templates — change it once, it changes for everyone.

The catch: templating meant customers would get data in a slightly different format, and would have to change their own systems that read that data. That was not a technical migration. It was a series of difficult conversations.

And the customer success team, whose job was keeping customers happy, wanted no part of delivering that message. "No, I'm out," Kat recalls them saying. "I don't wanna give the customer bad news." So the responsibility landed back on the data team, who reframed it: standardised data, delivered more reliably, available on demand through self-service rather than waiting two months for a change.

## The Order They Chose Cost Them a Year

Most customers were happy once it was framed as an improvement. Only a minority clung to their customised email reports. But the migration still took about two years, with a full year spent just moving customers onto the templates.

Kat's honest reflection on this is the sharpest practical lesson in the whole story. They started with the friendly customers to build momentum and confidence — which felt right. But the resistant customers were the ones who kept saying "I can't do it until this date," and everyone waited on them.

"If we'd dealt with them upfront, even though it would've been a hard conversation to have, it would've actually moved faster for everybody."

There was also a nice detail about what broke and why. Customer-defined attributes used to arrive as new columns, and customers would email complaining "you changed the format" — when effectively the customers themselves had changed it, by adding a field. In the templated version, anything that could shift column order or add columns became a nested JSON field instead, so a new attribute never reordered the spreadsheet and never broke someone's downstream integration.

## Where Data Teams and Software Teams Stop Talking

The conversation opened out into something bigger: the boundary between data engineering and software engineering, and how badly the two disciplines tend to conceptualise it. As Andrea put it, borrowing the proverb, "clear fences make good neighbours" — and when those fences aren't there, you get confusion and rework.

Kat's answer was to embed data people into software teams to build relationships and catch problems early — a database field change that would ripple into the warehouse and every report downstream, or a new aggregation that could make the interface faster. They also used CubeJS as a layer between the C# application and the warehouse, so engineers could ask for fields and filters without writing SQL by hand.

But embedding people raised the question every team topologies reader will recognise: is this permanent, or a temporary bridge? The answer was "it depends." Some teams needed a data engineer permanently. Others needed a machine learning engineer for a couple of months. And the part they admitted they did poorly at first was the handover — what goes with the person when they leave, and what stays with the team.

When they skipped that conversation, systems broke silently. "It might be the customer who said, 'Did you know this thing was broken?'" Their eventual fix was to route everything through the product managers as the first point of contact.

## The Patterns Worth Noticing

- **Getting data out is a first-class requirement, not an afterthought.** The whole saga started because export was never designed. Kat's own conclusion: if they'd thought about how data leaves the system upfront, they'd have saved years of frustration — and GDPR-style access requests mean this isn't optional anyway.

- **Manual processes don't stay small.** "A bit of automation" on a virtual machine became a load-bearing part of the system that fell over on public holidays when nobody was around to restart it.

- **The order you migrate people in is an architectural decision.** Starting with easy customers felt safe, but the hard customers set the pace for everyone. Sequencing is design.

- **The people who deliver the message matter.** Customer success wouldn't carry bad news, so the technical team had to. Knowing who owns which conversation is as important as knowing who owns which service.

- **Contracts exist even when nobody writes them down.** A column heading, a column order, a CSV format — customers were integrating against all of these. Changing them silently broke real systems.

- **Embedding is a bridge with a plan, not a permanent arrangement by default.** Without an explicit handover of ownership, embedded work leaves orphaned systems that fail quietly.

## One Thing to Sit With

The part I keep returning to is Kat's discovery about the customers who insisted they needed the scheduled email. When the team checked the tracking, most of those emails were never opened. People didn't want the report. They wanted the confidence that the data was there if they ever needed it. Before you build robustness into a system, it's worth asking whether the thing people are attached to is the feature itself — or the reassurance it happens to provide. Those two things call for very different solutions.

## Further Reading

- *Team Topologies* by Matthew Skelton and Manuel Pais — directly relevant to the embedding question and the collaboration-versus-permanent-team tension Andrea and Kat discussed.

- *Data Mesh* by Zhamak Dehghani — for the "data as a product" idea Kenny raised, and the argument that product owners should own their data and its downstream consumers.

- *Fundamentals of Data Engineering* by Joe Reis and Matt Housley — a grounded overview of the warehouse, pipeline, and orchestration tooling that runs through this story.

- *Domain-Driven Design* by Eric Evans — for the underlying theme of boundaries and contracts between systems and the teams that own them.

- *Accelerate* by Nicole Forsgren, Jez Humble, and Gene Kim — on why manual, fragile processes and slow change cycles hurt both delivery and the people doing the work.
