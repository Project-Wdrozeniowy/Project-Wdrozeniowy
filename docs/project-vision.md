# Orbita: product vision and priorities

This document defines product direction and decision-making priorities. It is
not a feature-completion report or an independent implementation backlog. The
current project plan and Jira determine exact scope, priorities, acceptance
criteria, and dependencies. Verify current behaviour in source code and tests;
use the [documentation map](README.md) to find technical references and the
[developer guides](guides/README.md) for contribution rules.

## Product vision

Orbita is a full-stack social platform combining a Reddit-like forum/social
network with an open, interactive analytics platform. Its core philosophy is
**transparency, user control, and predictability**.

Traditional social platforms collect extensive behavioural data while exposing
only a limited portion to users. Orbita aims to make analytics understandable,
accessible, and useful, so users can investigate data rather than merely view
static dashboards.

The intended experience lets users:

- Explore aggregated, anonymized platform analytics, including activity,
  engagement, trends, categories, popular topics, and audience statistics.
- Understand how their own posts perform and explore possible reasons behind
  that performance.
- Access their own analytics and view other users' public analytics, subject to
  privacy settings.
- Investigate and compare data interactively.

These capabilities express the product vision; they do not imply that every
capability is currently implemented or included in the current MVP scope.

## Product constraints

**Transparency does not mean mandatory public disclosure.** Users retain control
over their personal information. Analytics must respect privacy settings, data
minimization, GDPR, and applicable EU and Polish requirements. Apply privacy by
design when choosing what data to collect, expose, and use.

Accessibility is a product constraint, with **WCAG 2.2 AA as an engineering
target**. These privacy and accessibility goals guide implementation decisions;
stating them does not establish verified legal compliance or accessibility
conformance.

An AI assistant for interpreting statistics and advising creators is a potential
future feature, **not a current MVP requirement**.

### EU and Polish regulatory compliance

Orbita is a small academic project with potential commercial or public use in
the EU. Design the product with applicable **EU and Polish regulations** in mind,
particularly GDPR, privacy and data protection, cookies and tracking,
user-generated content, and accessibility.

For relevant features:

- Verify which legal requirements actually apply to the current project scope
  and intended deployment, using current authoritative sources. Academic status
  alone does not establish which obligations apply.
- Distinguish mandatory obligations, recommended best practices, and requirements
  applicable only to future public or commercial operation. Record material
  assumptions and unresolved applicability questions.
- Apply privacy by design, data minimization, user control, and accessibility
  principles from the start.
- Assess AI-related and other new or evolving legal requirements when relevant
  to a feature or deployment. Their inclusion here does not make AI part of the
  current MVP.
- Favor proportionate, practical solutions without sacrificing applicable
  compliance requirements or introducing unnecessary enterprise-level
  complexity.

Do not assume or claim regulatory compliance without verification. Raise
significant legal or product decisions, and unresolved questions that materially
affect the task, with the user or team for clarification before implementing the
dependent approach.

## Academic context and priorities

Orbita is an **engineering diploma project at a Polish university**, developed
without a specific commercial client but designed to demonstrate realistic
commercial or societal potential.

The project is evaluated on:

- Innovation and meaningful functionality.
- Technical quality, architecture, and maintainability.
- Practical application of engineering skills.
- A coherent, working product that can be demonstrated.
- Clear contributions from individual team members.

Prioritize **valuable, complete, end-to-end functionality** over unnecessary
complexity, speculative abstractions, or excessive refactoring. The intended MVP
combines a functional social core with interactive analytics as its primary
differentiator. Resolve scope and ordering through the current project plan and
Jira, rather than treating this vision as authorization to expand a task.

The goal is to help the team deliver a coherent, technically sound product that
demonstrates Orbita's original vision, not merely to complete Jira tickets.
