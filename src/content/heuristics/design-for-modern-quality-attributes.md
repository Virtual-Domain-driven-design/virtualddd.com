---
title: "Design for Modern Quality Attributes"
slug: "design-for-modern-quality-attributes"
status: "Published"
question: "What non-functional attributes are critical for maintaining quality in complex, modern systems?"
type: ["design-heuristics"]
authors: ["Anne-Marie Charrett"]
submitter: "Anne-Marie Charrett"
tags: ["Quality", "Software Architecture", "Software Design"]
---

Treat testability, observability, and recoverability as first-class design concerns, not afterthoughts. A system that cannot be easily tested, understood in production, or quickly restored is inherently low-quality. Build in the necessary instrumentation, APIs, and deployment mechanisms from the start.

## Example

During the design phase for a new service, we must explicitly define how it will be observed via metrics and distributed tracing. The design is not considered complete until these aspects are addressed.
