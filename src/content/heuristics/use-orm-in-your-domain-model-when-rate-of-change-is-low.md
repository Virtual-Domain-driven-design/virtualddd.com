---
title: "Use ORM in your domain model when rate of change is low"
slug: "use-orm-in-your-domain-model-when-rate-of-change-is-low"
status: "Published"
question: "When can it be appropriate to use ORM mapping in my domain model?"
type: ["design-heuristics"]
authors: ["Kenny Schwegler"]
submitter: "Kenny Schwegler"
tags: ["Strategic design"]
---

### Short description

When your domain model does not change quickly you can decide to use a ORM mapping framework (for instance: JPA, EntityFramework) in your domain. This way we don't need to create mapping between the domain model and the repository model.

### Examples

A user inbox for keeping communication message to the customer, this does not change that fast.

### Context

When we implement domain models with hexagonal or clean architecture we need to seperate the domain model from the repository model and create mappers. For small domains that don't change fast this can be a lot of work.
