---
outline: deep
---

# Common API Design Mistakes and How to Avoid Them

Designing clean, predictable APIs is critical for maintainability, client experience, and long-term evolution of your backend. This guide highlights **common API design mistakes** and provides **practical patterns** to avoid them, focusing on:

- **Naming rules**
- **Versioning**
- **Idempotency**
- **Pagination traps**
- **Inconsistent response structures**

---

## 1. Naming Rules: Keep It Consistent and Resource-Oriented

### 1.1 Mistake: Verb-based, Inconsistent Endpoints

```http
GET /getUsers
POST /createUser
DELETE /removeUserById
```

**Problems:**

- Mix of verbs (`get`, `create`, `remove`) and nouns (`Users`, `User`)
- Hard to guess new endpoints
- Not aligned with RESTful conventions

### 1.2 Recommendation: Noun-based, Resource-Oriented

Use **plural nouns** for collections and **consistent patterns**:

```http
GET    /users          # list users
POST   /users          # create user
GET    /users/{id}     # get user by id
PATCH  /users/{id}     # update partial user
PUT    /users/{id}     # replace user
DELETE /users/{id}     # delete user
```

::: tip Naming Guidelines

- Use **lowercase-kebab-case** for paths: `/user-profiles`, `/access-tokens`
- Prefer **nouns** (resources) over verbs (actions)
- Keep resource names **consistent** across services: `users`, `orders`, `payments`
- Use **sub-resources** for hierarchical relations: `/users/{id}/orders`
  :::

### 1.3 Mistake: Encoding Actions in Paths Instead of Methods

```http
POST /users/123/activate
POST /users/123/deactivate
```

Sometimes actions are necessary, but overusing them leads to RPC-style APIs.

**Better:**

```http
POST /users/123/activation       # create activation resource
DELETE /users/123/activation     # remove activation
```

Or use a **command-style** endpoint only when truly needed:

```http
POST /users/123:activate
```

---

## 2. Versioning: Avoid Breaking Clients Silently

### 2.1 Mistake: No Versioning at All

Changing responses or behavior without a version strategy **breaks existing clients** unexpectedly.

```http
GET /users
```

At `t0`: returns `{ id, name }`  
At `t1`: suddenly returns `{ id, fullName, status }`

### 2.2 Recommendation: Explicit Versioning Strategy

Most common approaches:

- **URL versioning (simple, explicit)**:

```http
GET /v1/users
GET /v2/users
```

- **Header-based versioning (clean URLs)**:

```http
GET /users
Accept: application/vnd.myapp.v1+json
```

::: tip Practical Advice

- Start with **URL versioning** for simplicity: `/api/v1/...`
- Treat **breaking changes** as a new major version
- Avoid creating new versions for **non-breaking changes** (adding fields)
  :::

### 2.3 Mistake: Inconsistent Versioning Inside the Same API

```http
GET /api/v1/users
GET /api/orders     # no version
```

Keep versioning **consistent** across all resources of the same API.

---

## 3. Idempotency: Safe Retries Without Side Effects

### 3.1 Mistake: Non-idempotent Operations Without Protection

```http
POST /payments
Body: { "orderId": "123", "amount": 100 }
```

If the client retries the request due to a timeout, you might **charge twice**.

### 3.2 Recommendation: Use Idempotency Keys for Sensitive Operations

Use a header like `Idempotency-Key` to uniquely identify a client operation:

```http
POST /payments
Idempotency-Key: 7b8e9b74-0abc-4f52-9c8a-91e4c4d27e8c
Body: { "orderId": "123", "amount": 100 }
```

On the server side:

1. Check if this `Idempotency-Key` was seen before.
2. If yes, **return the same result** as the previous call.
3. If no, process and **store the result** keyed by the idempotency key.

### 3.3 Idempotent vs Non-idempotent Methods

::: info HTTP Semantics

- **Safe** (no state change): `GET`, `HEAD`
- **Idempotent**: `PUT`, `DELETE`, `PATCH` (should be designed to be)
- **Non-idempotent** by default: `POST`
  :::

#### Mistake: Misusing POST for Idempotent Updates

```http
POST /users/123
```

Better:

```http
PUT /users/123      # replace user (idempotent)
PATCH /users/123    # partial update; design it to be idempotent
```

---

## 4. Pagination Traps: Performance and UX Pitfalls

### 4.1 Mistake: Offset-based Pagination Only

```http
GET /users?offset=0&limit=20
GET /users?offset=20&limit=20
```

**Problems:**

- Expensive queries on large datasets (`OFFSET` in SQL)
- **Inconsistent results** if new data is inserted between requests

### 4.2 Recommendation: Cursor-based Pagination for Large Lists

```http
GET /users?limit=20
GET /users?limit=20&cursor=eyJpZCI6IjEyMyJ9
```

Example response:

```json
{
  "data": [
    { "id": "120", "name": "Alice" },
    { "id": "121", "name": "Bob" }
  ],
  "pagination": {
    "nextCursor": "eyJpZCI6IjEyMSJ9",
    "hasNextPage": true
  }
}
```

::: tip Pagination Guidelines

- Always return **metadata**: `total`, `limit`, `cursor/offset`, `hasNextPage`
- Keep pagination **consistent** across all list endpoints
- For admin/internal APIs, offset can be acceptable; for user-facing, prefer **cursor-based**
  :::

### 4.3 Mistake: Inconsistent Parameter Names

```http
GET /users?page=1&size=20
GET /orders?offset=0&limit=20
```

Choose a **standard** and stick to it:

```http
GET /users?page=1&pageSize=20
GET /orders?page=1&pageSize=20
```

Or:

```http
GET /users?limit=20&cursor=...
```

---

## 5. Inconsistent Response Structures

### 5.1 Mistake: Different Shapes Per Endpoint

```json
// /users/123
{
  "id": "123",
  "name": "Alice"
}

// /orders/456
{
  "order": {
    "id": "456",
    "total": 100
  },
  "status": "OK"
}
```

Clients must handle **multiple formats**, increasing complexity and bugs.

### 5.2 Recommendation: Standard Response Envelope

Define a **common response structure**:

```json
// Success
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Alice"
  },
  "error": null,
  "meta": {
    "requestId": "abc-123",
    "timestamp": "2025-01-01T10:00:00Z"
  }
}
```

```json
// Error
{
  "success": false,
  "data": null,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found",
    "details": null
  },
  "meta": {
    "requestId": "abc-123",
    "timestamp": "2025-01-01T10:00:01Z"
  }
}
```

::: tip Benefits of a Standard Envelope

- Easier client-side error handling
- Consistent logging and tracing (`requestId`, `timestamp`)
- Makes **pagination**, **filtering**, and **sorting** metadata predictable
  :::

### 5.3 Mistake: Ignoring HTTP Status Codes

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": false,
  "error": "User not found"
}
```

This forces clients to inspect the body to detect errors.

**Better:**

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

---

## 6. Example: Putting It All Together

### 6.1 Well-designed User API

```http
GET /api/v1/users?page=1&pageSize=20
GET /api/v1/users/{id}
POST /api/v1/users
PATCH /api/v1/users/{id}
DELETE /api/v1/users/{id}
```

**List Response:**

```json
{
  "success": true,
  "data": [
    { "id": "123", "name": "Alice" },
    { "id": "124", "name": "Bob" }
  ],
  "error": null,
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 52,
      "totalPages": 3,
      "hasNextPage": true
    },
    "requestId": "req-123"
  }
}
```

### 6.2 Idempotent Payment Creation

```http
POST /api/v1/payments
Idempotency-Key: 7b8e9b74-0abc-4f52-9c8a-91e4c4d27e8c

{
  "orderId": "123",
  "amount": 100.0,
  "currency": "USD"
}
```

```json
{
  "success": true,
  "data": {
    "id": "pay_001",
    "orderId": "123",
    "status": "COMPLETED"
  },
  "error": null,
  "meta": {
    "requestId": "req-xyz",
    "idempotencyKey": "7b8e9b74-0abc-4f52-9c8a-91e4c4d27e8c"
  }
}
```

---

## 7. Best Practices Checklist

::: tip API Design Checklist

- **Naming**
  - Use **plural nouns** and resource-oriented URLs
  - Keep **kebab-case** paths and consistent naming
  - Use sub-resources for relationships (`/users/{id}/orders`)
- **Versioning**
  - Start with **URL-based** versioning (`/api/v1/...`)
  - Only bump major versions for **breaking changes**
- **Idempotency**
  - Use **idempotency keys** for critical operations (payments, orders)
  - Design `PUT` / `PATCH` operations to be idempotent
- **Pagination**
  - Provide consistent parameters (`page`/`pageSize` or `limit`/`cursor`)
  - Include pagination metadata in responses
- **Responses**
  - Use a **standard response envelope**
  - Use **proper HTTP status codes**
  - Include metadata: `requestId`, `timestamp`, `pagination`
    :::

---

## 8. Conclusion

Small API design decisions compound over time. Inconsistent naming, missing versioning, non-idempotent operations, poor pagination, and irregular response structures all **increase integration cost** and **slow down development**.

By following the conventions in this guide, you can build APIs that are:

- **Predictable** for clients
- **Safe** to evolve
- **Easy** to debug and monitor
- **Friendly** for frontend and third-party consumers

Start by standardizing one area (naming or responses), then gradually apply these principles across all your services.
