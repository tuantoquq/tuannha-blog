---
outline: deep
---

# Hidden Performance Issues Backend Engineers Often Overlook

Many backend systems feel “fine” in development but slowly become **sluggish, unstable, or expensive** in production. Often, the root causes are subtle performance issues that are easy to miss in code reviews and local testing.

This article focuses on **five common hidden performance problems**:

- **N+1 queries**
- **Connection pool exhaustion**
- **Wrong caching strategy**
- **Slow I/O**
- **Blocking logic in critical paths**

For each, we’ll look at **how to detect it**, **why it happens**, and **how to fix it**.

---

## 1. N+1 Queries

### 1.1 What Is the N+1 Query Problem?

The **N+1 query problem** happens when you:

1. Run **one query** to fetch a list of records.
2. Then run **N additional queries** to fetch related data for each record.

Example (pseudo-code):

```ts
// 1 query
const users = await db.user.findMany();

// N queries (one per user)
for (const user of users) {
  user.posts = await db.post.findMany({ where: { userId: user.id } });
}
```

If there are 100 users, you just executed **101 queries** instead of 1–2.

### 1.2 Why It’s Dangerous

- Looks fine in development with **small datasets**
- Becomes extremely slow with **real production data**
- Creates **database load spikes** and increases latency

### 1.3 How to Detect N+1

::: tip Detection Techniques

- Enable **query logging** (e.g. slow query logs, ORM debug mode)
- Look for **repeated queries** inside loops
- Use APM tools (New Relic, Datadog, OpenTelemetry) to inspect **database spans**
- Profile endpoints against **realistic data volumes**
  :::

### 1.4 How to Fix N+1

#### a) Use Joins or Includes / Preloads

```ts
// Example: using an ORM with eager loading
const usersWithPosts = await db.user.findMany({
  include: {
    posts: true,
  },
});
```

#### b) Use IN Queries / Batch Loading

```ts
const users = await db.user.findMany();
const userIds = users.map((u) => u.id);

const posts = await db.post.findMany({
  where: { userId: { in: userIds } },
});

// group posts by userId in memory
```

#### c) Use a DataLoader Pattern (GraphQL / APIs)

Use a **batching layer** (e.g. DataLoader) to combine many small queries into fewer large ones.

---

## 2. Connection Pool Exhaustion

### 2.1 What It Is

Most backends use **connection pools** to talk to databases or external services. Each connection is a limited resource.

**Connection pool exhaustion** happens when:

- All connections are **checked out** and never returned in time
- New requests are **blocked** waiting for a free connection
- Eventually, you see **timeouts** and cascading failures

### 2.2 Common Causes

- Long-running queries
- Blocking operations while holding connections
- Forgetting to **close/return** connections in error paths
- Too small pool size for traffic patterns

### 2.3 Symptoms

- Increasing **request latency** over time
- Many requests stuck on **“waiting for connection”**
- Database shows high number of **idle in transaction** sessions

### 2.4 How to Detect

::: tip What to Check

- Database metrics: active connections, wait time, “too many connections” errors
- Application logs: “pool timeout”, “connection acquisition timeout”
- APM traces: long spans around **DB connection acquisition**
  :::

### 2.5 How to Fix / Prevent

- **Always** release connections in a `finally` block:

```ts
const client = await pool.connect();
try {
  await client.query('...');
} finally {
  client.release();
}
```

- Use **short transactions**; don’t hold connections while:
  - Waiting on network calls
  - Doing CPU-heavy work
- Tune pool size based on:
  - Number of app instances
  - Database capacity
- Add **timeouts** and circuit breakers for slow queries.

---

## 3. Wrong Caching Strategy

Caching can **dramatically improve performance**, but a bad strategy can:

- Return **stale data**
- Cause **cache stampedes**
- Waste memory and increase complexity

### 3.1 Common Caching Mistakes

#### a) Caching Everything, Forever

```ts
cache.set('users', users); // no TTL, no invalidation
```

**Problems:**

- Data becomes **stale**
- Memory usage grows without bound
- Hard to reason about correctness

#### b) Caching at the Wrong Layer

- Caching **per instance** instead of shared (e.g. in-memory cache on each node)
- Duplicated caches at API, service, and DB layers

#### c) No Strategy for Invalidation

- “We’ll just restart the service when data is wrong”
- Manual purges only

### 3.2 Good Caching Patterns

::: tip Principles

- Cache **read-heavy**, **expensive**, and **stable** data
- Use **TTL** (time-to-live) and/or **event-based invalidation**
- Keep cache keys **predictable and namespaced**
- Prefer a **shared cache** (e.g. Redis) for multiple instances
  :::

#### Example: Read-Through Cache with TTL

```ts
async function getUserProfile(id: string) {
  const key = `user:profile:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const user = await db.user.findUnique({ where: { id } });

  if (user) {
    await redis.set(key, JSON.stringify(user), { EX: 300 }); // 5 min
  }

  return user;
}
```

### 3.3 Avoiding Cache Stampedes

When a popular key expires, **many requests** may hit the database at once.

Mitigations:

- **Locking / single-flight**: one request recomputes, others wait
- **Stale-while-revalidate**: serve slightly stale data while refreshing in background
- Add **jitter** to TTLs to avoid synchronized expirations.

---

## 4. Slow I/O (Disk, Network, External Services)

### 4.1 Why Slow I/O Hurts More Than You Think

Even if your CPU usage is low, your app can be:

- **I/O-bound** (waiting on disk, network, external APIs)
- Introducing **latency spikes** due to slow dependencies

### 4.2 Examples of Hidden Slow I/O

- Writing **large logs** synchronously on every request
- Calling external APIs serially in a loop
- Reading big files or generating reports **on the main request path**

### 4.3 How to Detect Slow I/O

::: tip Observability

- Use APM to break down request time by:
  - DB calls
  - External API calls
  - Disk operations
- Add **timers/metrics** around I/O operations
- Check system metrics: disk IOPS, network latency, error rates
  :::

### 4.4 How to Fix / Mitigate

- **Parallelize** independent I/O where safe:

```ts
const [user, orders] = await Promise.all([getUser(id), getUserOrders(id)]);
```

- Offload heavy I/O to **background jobs**:
  - Report generation
  - Bulk exports
  - Large file processing
- Use **timeouts** and circuit breakers for external services
- Use **asynchronous** I/O APIs where available.

---

## 5. Blocking Logic in Hot Paths

### 5.1 What Is Blocking Logic?

Blocking logic is any operation that:

- **Blocks the main thread** (in single-threaded runtimes like Node.js)
- Holds locks or shared resources for too long
- Performs heavy **CPU-bound work** on the request path

### 5.2 Examples

- Heavy JSON serialization/deserialization
- Complex in-memory loops over large collections
- Synchronous crypto or compression on the main thread
- Using blocking libraries in an async framework

### 5.3 Symptoms

- High **latency under load** even with low DB/CPU metrics
- Event loop lag (Node.js) or thread pool saturation (.NET/Java)
- “Everything slows down when we add more traffic”

### 5.4 How to Detect

::: tip Tools

- Measure **event loop lag** (Node.js) or thread pool usage
- Use profilers (flame graphs) to identify **hot CPU paths**
- Look for **sync** APIs in async code (`fs.readFileSync`, `bcrypt.hashSync`, etc.)
  :::

### 5.5 How to Fix

- Move CPU-heavy work to:
  - **Worker threads**
  - **Background jobs**
  - Separate **compute services**
- Use **non-blocking** versions of APIs where possible
- Keep critical request paths **thin**: validate → call domain/service → respond

---

## 6. Putting It All Together

### 6.1 Checklist for a “Slow API” Investigation

```text
1. Check database:
   - Slow queries?
   - N+1 patterns?
   - Connection pool timeouts?

2. Check cache:
   - Hit ratio?
   - Stampedes on popular keys?
   - Overly long TTLs or missing invalidation?

3. Check I/O:
   - External API latency?
   - Disk performance?
   - Serial vs parallel calls?

4. Check application:
   - Blocking logic on main paths?
   - Heavy CPU in controllers/handlers?
   - Lack of timeouts and circuit breakers?
```

---

## 7. Best Practices Summary

::: tip Performance Best Practices

- **N+1 Queries**
  - Use **eager loading**, joins, or batch loading
  - Avoid database calls inside tight loops
- **Connection Pools**
  - Always **release connections** (use `finally`)
  - Keep transactions **short**
- **Caching**
  - Cache **read-heavy** data with TTL
  - Design **invalidation** and handle stampedes
- **Slow I/O**
  - Parallelize independent calls
  - Move heavy I/O to **background jobs**
- **Blocking Logic**
  - Avoid CPU-heavy work in request handlers
  - Use async/non-blocking APIs and worker threads
    :::

---

## 8. Conclusion

Backend performance issues often come from **subtle design and implementation choices**, not just obvious “slow code”. N+1 queries, connection pool exhaustion, poor caching, slow I/O, and blocking logic can quietly erode your system’s reliability and user experience.

By proactively **monitoring**, **profiling**, and applying the patterns in this article, you can:

- Detect problems **before** they become incidents
- Design APIs and services that **scale gracefully**
- Keep your infrastructure costs **under control**

Make performance reviews part of your regular backend design and code review process—future you (and your on-call engineers) will be grateful.
