---
layout: doc
---

# Backend Knowledge Base

Welcome to the Backend section of TDev Blog. This space curates practical guides, design principles, and production-ready patterns for building resilient services. Expect actionable write-ups drawn from real-world backend engineering work.

Our backend content focuses on:

- **API architecture** – resource modeling, contracts, versioning
- **Performance engineering** – diagnosing latency and scaling bottlenecks
- **Operational excellence** – production debugging and hardening techniques

---

## 📚 Available Articles

### [Common API Design Mistakes and How to Avoid Them](/backend/api-convention)

Learn how to build predictable APIs that are easy to evolve and consume. The article covers:

- Consistent naming rules and resource-oriented URLs
- Versioning strategies that won’t break clients
- Designing idempotent operations and using idempotency keys
- Pagination pitfalls (offset vs cursor) and metadata standards
- Crafting consistent response envelopes with proper status codes

::: tip Why read it?
Ship APIs that are self-explanatory, safe to extend, and pleasant for frontend and third-party integrations.
:::

---

### [Hidden Performance Issues Backend Engineers Often Overlook](/backend/common-problem)

A deep dive into the subtle issues that silently slow down production services:

- Detecting and fixing N+1 queries
- Preventing connection pool exhaustion
- Choosing the right caching strategy and avoiding stampedes
- Mitigating slow I/O and external dependencies
- Eliminating blocking logic on hot paths

Try to follow the exact format of the previous section.
::: tip Why read it?
Gain a checklist-driven approach to diagnosing latency spikes before they wake you up at 3 AM.
:::

---

### [Common NestJS Issues and How to Fix Them](/backend/nestjs-common-issues)

A practical troubleshooting guide for NestJS developers covering:

- Dependency injection and circular dependency resolution
- Module configuration and provider scope issues
- Request lifecycle, guards, and interceptor timing
- Database integration with TypeORM and Prisma
- Authentication strategy and JWT configuration
- Testing patterns and mocking best practices
- Production-ready error handling and performance optimization

::: tip Why read it?
Avoid common NestJS pitfalls and learn systematic approaches to debugging framework-specific issues.
:::

---

## 🎯 Topics Covered

### API Design

- Resource modeling, versioning, idempotency
- Pagination conventions and response schemas

### Performance Engineering

- Query optimization, connection pools, caching layers
- Observability-driven troubleshooting

### Production Readiness

- Health checks, error envelopes, monitoring hooks
- Operational guardrails for stable releases

---

## 💡 Coming Soon

- Event-driven architecture patterns
- Resilient messaging and retries
- Observability fundamentals for backend teams
- Scaling databases without fear

---

::: info About This Section
Every article aims to be copy-paste friendly with real commands, code snippets, and checklists you can use immediately.
:::
