# REST API Fundamentals - Complete Beginner's Guide

> **Before you start**: This guide assumes no prior web development experience. You'll learn everything from HTTP basics to RESTful API design principles.

---

## Table of Contents

1. [Why REST Exists](#1-why-rest-exists)
2. [HTTP Protocol Fundamentals](#2-http-protocol-fundamentals)
3. [What is REST?](#3-what-is-rest)
4. [Richardson Maturity Model](#4-richardson-maturity-model)
5. [REST API Design Principles](#5-rest-api-design-principles)
6. [Request and Response Structure](#6-request-and-response-structure)
7. [Client-Server Relationship](#7-client-server-relationship)
8. [Why REST?](#8-why-rest)
9. [Alternatives to REST](#9-alternatives-to-rest)
10. [REST API Security Basics](#10-rest-api-security-basics)
11. [REST API Tools & Testing](#11-rest-api-tools--testing)
12. [Building REST APIs](#12-building-rest-apis)
13. [Best Practices & Common Pitfalls](#13-best-practices--common-pitfalls)
14. [Real-World Example: E-Commerce API](#14-real-world-example-e-commerce-api)
15. [Self-Check Questions & Practice](#15-self-check-questions--practice)
16. [Interview Questions](#16-interview-questions)
17. [What's Next?](#17-whats-next)

---

## 1. Why REST Exists

### The Evolution of Web Applications

**1990s - Static Websites**:
```
User ──[Request webpage]──> Server
User <──[HTML page]────── Server
```
- Server sends complete HTML pages
- Every click = full page reload
- No dynamic interaction

**2000s - Dynamic Web Applications**:
```
User ──[Click button]──> Server (processes request)
User <──[New page]───── Server
```
- Server-side rendering (PHP, JSP, ASP)
- Still full page reloads
- Limited user experience

**2010s+ - Single Page Applications (SPAs) + APIs**:
```
Browser ──[API Request: GET /users]──> Server
Browser <──[Data: JSON]──────────── Server
        (JavaScript updates UI - no page reload)
```
- Frontend and backend separated
- Smooth user experience
- Backend becomes an API (Application Programming Interface)

### The Problem: How Do Applications Communicate?

Imagine you're building multiple applications:
- A website (React/Angular)
- A mobile app (iOS/Android)
- An IoT device (smart watch)
- A partner company wants to integrate

**Without REST**: Build separate backends for each!
```
Website ──> Custom Backend 1
Mobile ──> Custom Backend 2
IoT ────> Custom Backend 3
Partner ─> Custom Backend 4
```

**With REST**: One API serves all!
```
Website ─┐
Mobile ──┼──> Single REST API ──> Database
IoT ─────┤
Partner ─┘
```

### The Need for Standardization

**Real-world analogy - Restaurant ordering**:

**Without standards**:
- Customer 1: "I want food item A"
- Customer 2: "Give me menu selection B"
- Customer 3: "Bring dish C"
- Waiter confused!

**With REST standards**:
- All customers: "GET menu", "POST order", "DELETE order #5"
- Waiter understands everyone
- Kitchen knows what to do

**REST provides**:
- Common language (HTTP)
- Standard actions (GET, POST, PUT, DELETE)
- Predictable structure
- Platform independence

---

## 2. HTTP Protocol Fundamentals

### What is HTTP?

**HTTP** (HyperText Transfer Protocol) is the foundation of data communication on the web.

**Simple analogy**: HTTP is like the postal system for the internet.
- You write a letter (request)
- Post office delivers it (HTTP protocol)
- Recipient sends reply (response)

### Client-Server Architecture

```
┌──────────────────┐                    ┌──────────────────┐
│     CLIENT       │                    │     SERVER       │
│                  │                    │                  │
│  - Web Browser   │    HTTP Request    │  - Web Server    │
│  - Mobile App    │ ──────────────────>│  - REST API      │
│  - IoT Device    │                    │  - Business      │
│  - Another Server│    HTTP Response   │    Logic         │
│                  │ <──────────────────│  - Database      │
└──────────────────┘                    └──────────────────┘
```

**Key concepts**:
- **Client**: Initiates requests (asks for data)
- **Server**: Processes requests and sends responses (provides data)
- **Stateless**: Each request is independent (server doesn't remember previous requests)

### HTTP Request-Response Cycle

**Example: Getting user information**

**1. Client sends HTTP Request**:
```http
GET /api/users/123 HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer eyJhbGc...
```

**2. Server processes and sends HTTP Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 85

{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "customer"
}
```

### HTTP Methods (Verbs)

HTTP methods define the action you want to perform on a resource.

| Method | Purpose | Idempotent? | Safe? | Example |
|--------|---------|-------------|-------|---------|
| **GET** | Retrieve data | ✅ Yes | ✅ Yes | Get user details |
| **POST** | Create new resource | ❌ No | ❌ No | Create new user |
| **PUT** | Update entire resource | ✅ Yes | ❌ No | Replace user data |
| **PATCH** | Update partial resource | ❌ No* | ❌ No | Update user email |
| **DELETE** | Remove resource | ✅ Yes | ❌ No | Delete user |
| **HEAD** | Get headers only | ✅ Yes | ✅ Yes | Check if exists |
| **OPTIONS** | Get allowed methods | ✅ Yes | ✅ Yes | CORS preflight |

**Idempotent**: Calling it multiple times has the same effect as calling it once.
**Safe**: Doesn't modify data on the server.

**Examples**:

```http
# GET - Retrieve user (idempotent + safe)
GET /api/users/123
# Call 5 times → same user data each time, nothing changes

# POST - Create user (NOT idempotent)
POST /api/users
Body: {"name": "John", "email": "john@example.com"}
# Call 5 times → creates 5 different users!

# PUT - Update user (idempotent)
PUT /api/users/123
Body: {"name": "John Updated", "email": "john@example.com"}
# Call 5 times → user updated to same state each time

# DELETE - Remove user (idempotent)
DELETE /api/users/123
# Call 5 times → user deleted once, subsequent calls do nothing
```

### HTTP Status Codes

Status codes tell you what happened with your request.

**Analogy**: Like feedback from a vending machine:
- 2xx: "Here's your soda" (Success)
- 3xx: "Soda moved to machine B" (Redirection)
- 4xx: "You didn't insert enough money" (Client error)
- 5xx: "Machine is broken" (Server error)

#### 2xx Success

| Code | Name | When to Use | Example |
|------|------|-------------|---------|
| **200** | OK | Request succeeded | GET /users/123 → user data returned |
| **201** | Created | Resource created | POST /users → new user created |
| **204** | No Content | Success, no body to return | DELETE /users/123 → user deleted |

#### 3xx Redirection

| Code | Name | When to Use | Example |
|------|------|-------------|---------|
| **301** | Moved Permanently | Resource moved forever | Old URL → new URL |
| **302** | Found | Temporary redirect | Login redirect |
| **304** | Not Modified | Cached version is fresh | If-None-Match header |

#### 4xx Client Errors

| Code | Name | When to Use | Example |
|------|------|-------------|---------|
| **400** | Bad Request | Invalid input/validation failed | Missing required field |
| **401** | Unauthorized | Authentication required | No auth token provided |
| **403** | Forbidden | Authenticated but not allowed | Normal user trying admin action |
| **404** | Not Found | Resource doesn't exist | GET /users/999 (doesn't exist) |
| **409** | Conflict | Resource conflict | Username already taken |
| **422** | Unprocessable Entity | Validation error | Invalid email format |
| **429** | Too Many Requests | Rate limit exceeded | More than 100 requests/minute |

#### 5xx Server Errors

| Code | Name | When to Use | Example |
|------|------|-------------|---------|
| **500** | Internal Server Error | Unexpected server error | Database connection failed |
| **502** | Bad Gateway | Upstream server error | Proxy got invalid response |
| **503** | Service Unavailable | Server overloaded/maintenance | Database is down |
| **504** | Gateway Timeout | Upstream server too slow | Request took > 30 seconds |

### HTTP Headers

Headers provide metadata about the request/response.

**Common Request Headers**:
```http
GET /api/users/123 HTTP/1.1
Host: api.example.com                    # Server address
Accept: application/json                 # Format client wants
Content-Type: application/json           # Format of request body
Authorization: Bearer eyJhbGc...         # Authentication token
User-Agent: Mozilla/5.0                  # Client information
Accept-Language: en-US                   # Preferred language
```

**Common Response Headers**:
```http
HTTP/1.1 200 OK
Content-Type: application/json           # Format of response body
Content-Length: 156                      # Size in bytes
Cache-Control: max-age=3600             # Caching rules
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"  # Version identifier
Location: /api/users/456                 # New resource location (201)
```

### Complete HTTP Request/Response Example

**Request**:
```http
POST /api/users HTTP/1.1
Host: api.example.com
Content-Type: application/json
Accept: application/json
Authorization: Bearer eyJhbGc...
Content-Length: 87

{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "role": "customer"
}
```

**Response**:
```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/users/456
Content-Length: 142

{
  "id": 456,
  "name": "Alice Smith",
  "email": "alice@example.com",
  "role": "customer",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Stop and think**: Why would you use GET instead of POST to retrieve data?

<details>
<summary>Answer</summary>
GET is safe and idempotent - it doesn't change server state and can be called multiple times with the same result. POST is for creating resources and can have side effects. Also, GET requests can be cached and bookmarked.
</details>

---

## 3. What is REST?

### Definition

**REST** (Representational State Transfer) is an **architectural style** for designing networked applications, introduced by Roy Fielding in his 2000 PhD dissertation.

**Key point**: REST is NOT a protocol or standard - it's a set of architectural principles.

**Real-world analogy - Library system**:
- **Resources**: Books (users, orders, products)
- **Representations**: Book information on card catalog (JSON/XML)
- **State Transfer**: Borrowing a book = transferring its state from "available" to "borrowed"
- **Uniform interface**: Everyone uses the same checkout process (HTTP methods)

### Core Principles of REST

#### 1. **Resource-Based**

Everything is a resource identified by a URI (Uniform Resource Identifier).

```
❌ NOT resource-based (action-based):
/getUser?id=123
/createUser
/updateUserEmail

✅ Resource-based:
/users/123              # The user resource
/users                  # Collection of users
/users/123/orders       # User's orders (sub-resource)
```

#### 2. **Uniform Interface**

Use standard HTTP methods consistently.

```
GET    /users/123      # Read user
POST   /users          # Create user
PUT    /users/123      # Update user (full)
PATCH  /users/123      # Update user (partial)
DELETE /users/123      # Delete user
```

#### 3. **Stateless Communication**

Each request contains all information needed; server doesn't remember previous requests.

```
❌ Stateful (BAD):
Request 1: Login → Server stores session
Request 2: Get profile → Server uses stored session

✅ Stateless (GOOD):
Request 1: Login → Returns token
Request 2: Get profile + token → Server validates token
```

**Why stateless?**
- Scalability: Any server can handle any request
- Reliability: Server restart doesn't lose state
- Simplicity: No session management needed

#### 4. **Client-Server Separation**

Client and server are independent; they communicate only through the API.

```
┌──────────────┐          ┌──────────────┐
│   Frontend   │          │   Backend    │
│  (React/Vue) │ <──────> │ (Spring Boot)│
│              │   REST   │              │
│  UI Logic    │   API    │  Business    │
│  Display     │          │  Logic       │
└──────────────┘          └──────────────┘
```

**Benefits**:
- Change frontend without changing backend
- Change backend without changing frontend
- Different clients (web, mobile) use same API

#### 5. **Cacheable Responses**

Responses should declare if they can be cached.

```http
HTTP/1.1 200 OK
Cache-Control: max-age=3600    # Cache for 1 hour
ETag: "abc123"                 # Version identifier

# Next request:
GET /users/123
If-None-Match: "abc123"

# Server response:
HTTP/1.1 304 Not Modified      # Use cached version
```

#### 6. **Layered System**

Client doesn't need to know if connected directly to server or through intermediaries.

```
Client → Load Balancer → API Gateway → REST API → Database
   ↑                                        ↑
   └────── Transparent to client ──────────┘
```

### REST vs RPC (Remote Procedure Call)

**RPC-style (NOT RESTful)**:
```
POST /getUser
POST /createUser
POST /deleteUser
POST /updateUserEmail
```
- Focuses on actions (verbs)
- Everything is POST
- Not resource-based

**REST-style**:
```
GET    /users/123
POST   /users
DELETE /users/123
PATCH  /users/123
```
- Focuses on resources (nouns)
- Uses appropriate HTTP methods
- Resource-based URIs

---

## 4. Richardson Maturity Model

Leonard Richardson's model classifies REST APIs into 4 levels. Most production APIs are Level 2.

```
Level 3: HATEOAS (Hypermedia)
    ↑
Level 2: HTTP Verbs + Status Codes
    ↑
Level 1: Resources
    ↑
Level 0: HTTP as transport (RPC)
```

### Level 0: The Swamp of POX (Plain Old XML)

Single endpoint, single HTTP method, actions in request body.

**Example - SOAP**:
```http
POST /api HTTP/1.1

<soap:Envelope>
  <soap:Body>
    <getUser>
      <userId>123</userId>
    </getUser>
  </soap:Body>
</soap:Envelope>
```

**Characteristics**:
- ❌ Single endpoint for everything
- ❌ Only POST method
- ❌ Action specified in body
- ❌ Not RESTful at all

### Level 1: Resources

Multiple resources, but still single HTTP method.

**Example**:
```http
POST /users/getUser
POST /users/createUser
POST /users/deleteUser
POST /orders/getOrder
POST /orders/createOrder
```

**Characteristics**:
- ✅ Separate resources (/users, /orders)
- ❌ Still uses only POST
- ❌ Actions in URL (verbs: get, create, delete)
- 🔶 Partially RESTful

### Level 2: HTTP Verbs + Status Codes

Proper use of HTTP methods and status codes.

**Example**:
```http
GET    /users/123         → 200 OK
POST   /users             → 201 Created
PUT    /users/123         → 200 OK
DELETE /users/123         → 204 No Content
GET    /users/999         → 404 Not Found
POST   /users (invalid)   → 400 Bad Request
```

**Characteristics**:
- ✅ Separate resources
- ✅ Uses HTTP methods correctly
- ✅ Returns appropriate status codes
- ✅ Most production APIs are here
- 🎯 **This is "RESTful enough" for most cases**

### Level 3: HATEOAS (Hypermedia)

API responses include links to related resources (self-discoverable API).

**Example**:
```json
GET /users/123

{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "_links": {
    "self": {
      "href": "/users/123"
    },
    "orders": {
      "href": "/users/123/orders"
    },
    "update": {
      "href": "/users/123",
      "method": "PUT"
    },
    "delete": {
      "href": "/users/123",
      "method": "DELETE"
    }
  }
}
```

**Characteristics**:
- ✅ Everything from Level 2
- ✅ Responses include navigation links
- ✅ Self-documenting API
- ✅ Client can discover available actions
- ❌ Rarely implemented (complex, adds overhead)

### Which Level Should You Use?

**For most applications: Level 2**
- ✅ Good balance of simplicity and RESTfulness
- ✅ Easy to implement
- ✅ Widely understood
- ✅ Supported by all frameworks

**Use Level 3 (HATEOAS) if**:
- Complex workflow navigation
- Public API that needs to be self-documenting
- Long-term API stability is critical

**Example comparison**:

| API Design | Level | Good For |
|------------|-------|----------|
| `POST /rpc` with action in body | 0 | Legacy systems only |
| `POST /createUser`, `POST /getUser` | 1 | Don't use |
| `POST /users`, `GET /users/123` | 2 | **Most APIs (recommended)** |
| Level 2 + hypermedia links | 3 | Complex, long-lived APIs |

---

## 5. REST API Design Principles

### Resource Naming Conventions

#### Rule 1: Use Nouns, Not Verbs

```
❌ BAD (verbs in URL):
/createUser
/getUsers
/updateUser
/deleteUser

✅ GOOD (nouns + HTTP methods):
POST   /users        # Create
GET    /users        # List
PUT    /users/123    # Update
DELETE /users/123    # Delete
```

#### Rule 2: Use Plural Names for Collections

```
❌ BAD:
/user/123
/order/456

✅ GOOD:
/users/123
/orders/456
```

**Why plural?** Consistency with collections:
```
GET /users      # Collection (plural)
GET /users/123  # Single item from collection (still plural base)
```

#### Rule 3: Use Hierarchical Structure for Relationships

```
✅ Sub-resources:
/users/123/orders              # User's orders
/users/123/orders/456          # Specific order of user
/orders/456/items              # Order items
/categories/10/products        # Products in category
```

#### Rule 4: Use Hyphens for Readability

```
❌ BAD:
/useraccounts
/orderitems

✅ GOOD:
/user-accounts
/order-items
```

### HTTP Method Semantics

| Method | Purpose | Request Body | Response Body | Idempotent |
|--------|---------|--------------|---------------|------------|
| **GET** | Read resource | No | Yes | Yes |
| **POST** | Create resource | Yes | Yes (created resource) | No |
| **PUT** | Replace resource (full update) | Yes | Yes (updated resource) | Yes |
| **PATCH** | Update resource (partial) | Yes | Yes (updated resource) | No* |
| **DELETE** | Remove resource | No | Usually no (204) | Yes |

**Examples**:

**GET - Retrieve resource**:
```http
GET /users/123

Response:
200 OK
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30
}
```

**POST - Create new resource**:
```http
POST /users
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "age": 25
}

Response:
201 Created
Location: /users/456
{
  "id": 456,
  "name": "Alice Smith",
  "email": "alice@example.com",
  "age": 25,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**PUT - Full update (replace entire resource)**:
```http
PUT /users/123
{
  "name": "John Updated",
  "email": "john.new@example.com",
  "age": 31
}

Response:
200 OK
{
  "id": 123,
  "name": "John Updated",
  "email": "john.new@example.com",
  "age": 31,
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

**PATCH - Partial update (modify specific fields)**:
```http
PATCH /users/123
{
  "email": "john.newemail@example.com"
}

Response:
200 OK
{
  "id": 123,
  "name": "John Doe",
  "email": "john.newemail@example.com",  # Only email changed
  "age": 30,
  "updatedAt": "2024-01-15T11:15:00Z"
}
```

**DELETE - Remove resource**:
```http
DELETE /users/123

Response:
204 No Content
(empty body)
```

### Idempotency Explained

**Idempotent**: Calling the operation multiple times produces the same result.

```java
// GET is idempotent
GET /users/123  # Returns user data
GET /users/123  # Returns same user data
GET /users/123  # Returns same user data
# Result: Same data, no side effects

// POST is NOT idempotent
POST /users {"name": "John"}  # Creates user (ID: 1)
POST /users {"name": "John"}  # Creates user (ID: 2)
POST /users {"name": "John"}  # Creates user (ID: 3)
# Result: 3 different users created!

// PUT is idempotent
PUT /users/123 {"name": "John Updated"}  # User updated
PUT /users/123 {"name": "John Updated"}  # User already in that state
PUT /users/123 {"name": "John Updated"}  # Still in same state
# Result: User updated once, subsequent calls have no effect

// DELETE is idempotent
DELETE /users/123  # User deleted
DELETE /users/123  # User already deleted (returns 404 or 204)
DELETE /users/123  # Still deleted
# Result: User deleted once, subsequent calls do nothing
```

### Status Code Best Practices

**For successful operations**:
```
GET    /users/123     → 200 OK (resource found)
POST   /users         → 201 Created (new resource)
PUT    /users/123     → 200 OK (resource updated)
PATCH  /users/123     → 200 OK (resource updated)
DELETE /users/123     → 204 No Content (resource deleted)
```

**For errors**:
```
GET    /users/999     → 404 Not Found (doesn't exist)
POST   /users         → 400 Bad Request (invalid data)
       (no email)
POST   /users         → 409 Conflict (email already exists)
       (duplicate)
GET    /admin/users   → 401 Unauthorized (no auth token)
GET    /admin/users   → 403 Forbidden (authenticated but not admin)
POST   /users         → 422 Unprocessable Entity (validation failed)
       (invalid email format)
```

**Error response format**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "issue": "Email format is invalid"
      },
      {
        "field": "age",
        "issue": "Age must be between 0 and 120"
      }
    ]
  }
}
```

---

## 6. Request and Response Structure

### JSON Format

**JSON** (JavaScript Object Notation) is the most common format for REST APIs.

**Why JSON?**
- ✅ Lightweight (less data than XML)
- ✅ Human-readable
- ✅ Easy to parse (native to JavaScript)
- ✅ Language-independent
- ✅ Supports complex data structures

**JSON Types**:
```json
{
  "string": "text value",
  "number": 42,
  "boolean": true,
  "null": null,
  "array": [1, 2, 3],
  "object": {
    "nested": "value"
  }
}
```

### Request Body Examples

**Create user**:
```json
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "country": "USA"
  },
  "interests": ["coding", "music", "travel"]
}
```

**Update user (partial)**:
```json
PATCH /api/users/123
Content-Type: application/json

{
  "email": "john.new@example.com",
  "address": {
    "city": "San Francisco"
  }
}
```

### Response Body Examples

**Single resource**:
```json
GET /api/users/123

{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "country": "USA"
  },
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-15T11:30:00Z"
}
```

**Collection (list)**:
```json
GET /api/users

{
  "data": [
    {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "id": 456,
      "name": "Alice Smith",
      "email": "alice@example.com"
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 10
}
```

### Pagination

For large datasets, return data in pages.

**Query parameters**:
```
GET /api/users?page=1&size=20
GET /api/products?page=2&size=50
```

**Response with pagination metadata**:
```json
{
  "data": [
    { "id": 1, "name": "User 1" },
    { "id": 2, "name": "User 2" }
    // ... 20 users total
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "links": {
    "first": "/api/users?page=1&size=20",
    "next": "/api/users?page=2&size=20",
    "last": "/api/users?page=8&size=20"
  }
}
```

### Filtering and Sorting

**Filtering**:
```
GET /api/products?category=electronics&inStock=true
GET /api/users?role=admin&status=active
GET /api/orders?minAmount=100&maxAmount=1000
```

**Sorting**:
```
GET /api/products?sort=price              # Ascending by price
GET /api/products?sort=-price             # Descending by price
GET /api/users?sort=name,+createdAt       # Multiple fields
```

**Combined**:
```
GET /api/products?category=electronics&sort=-price&page=1&size=20
```

### API Versioning

**Why version?** Breaking changes shouldn't break existing clients.

**URL versioning (most common)**:
```
/api/v1/users
/api/v2/users
/api/v3/users
```

**Header versioning**:
```http
GET /api/users
Accept: application/vnd.myapi.v1+json
```

**Query parameter versioning**:
```
/api/users?version=1
/api/users?version=2
```

**Recommendation**: Use URL versioning (simplest, most visible).

### Content Negotiation

Client specifies desired format using `Accept` header.

```http
GET /api/users/123
Accept: application/json        # JSON format

GET /api/users/123
Accept: application/xml         # XML format

GET /api/users/123
Accept: text/csv                # CSV format
```

**Server response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 123,
  "name": "John Doe"
}
```

---

## 7. Client-Server Relationship

### What is a Client?

**Client** = Any application that consumes the REST API.

```
┌─────────────────────────────────────────────────────┐
│                     CLIENTS                         │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Browser    │  │  Mobile App  │  │   IoT    │ │
│  │              │  │              │  │  Device  │ │
│  │  React/Vue   │  │ Flutter/RN   │  │          │ │
│  │  Angular     │  │ iOS/Android  │  │  Sensor  │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Another API  │  │  Desktop App │  │ CLI Tool │ │
│  │ Microservice │  │   Electron   │  │   cURL   │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────┘
                          │
                          │ HTTP Requests
                          ↓
              ┌───────────────────────┐
              │   REST API SERVER     │
              │   (Spring Boot)       │
              └───────────────────────┘
                          │
                          ↓
              ┌───────────────────────┐
              │      DATABASE         │
              │    (PostgreSQL)       │
              └───────────────────────┘
```

**Client responsibilities**:
- ✅ Render UI (display data to user)
- ✅ Handle user interactions
- ✅ Make API requests
- ✅ Handle API responses
- ✅ Manage client-side state

### What is a Server?

**Server** = Application that exposes the REST API.

**Server responsibilities**:
- ✅ Handle HTTP requests
- ✅ Execute business logic
- ✅ Access database
- ✅ Enforce security/permissions
- ✅ Return HTTP responses
- ✅ Manage server-side state

### Separation of Concerns

**Client**: "What to display" (presentation logic)
**Server**: "What data to return" (business logic)

```
┌──────────────────────────────┐
│         FRONTEND             │
│  - Display user list         │
│  - Handle form submission    │
│  - Show error messages       │
│  - Client-side validation    │
└──────────────────────────────┘
              ↕
    REST API (contract)
              ↕
┌──────────────────────────────┐
│          BACKEND             │
│  - Authenticate users        │
│  - Validate business rules   │
│  - Query database            │
│  - Send email notifications  │
└──────────────────────────────┘
```

**Benefits**:
- ✅ Independent development (frontend/backend teams)
- ✅ Technology flexibility (change frontend framework)
- ✅ Reusability (same API for web, mobile, partners)
- ✅ Scalability (scale frontend and backend independently)

### Stateless Communication

**Stateless**: Server doesn't remember previous requests.

**Analogy**: Every interaction with a librarian starts fresh.

❌ **Stateful (NOT REST)**:
```
Client → Server: "Login as john@example.com"
Server → Client: "OK, I'll remember you"
(Server stores session)

Client → Server: "Get my profile"
Server → Client: "Since I remember you're John, here's your data"
```

✅ **Stateless (REST)**:
```
Client → Server: "Login as john@example.com"
Server → Client: "Here's your token: abc123"

Client → Server: "Get my profile. My token is: abc123"
Server → Client: "Validated abc123, here's your data"
```

**Each request contains all needed information**:
```http
GET /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Token contains:
# - User ID
# - Expiration time
# - Permissions
# Server validates token on every request
```

### Authentication Flow

**1. User logs in**:
```http
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "secret123"
}

Response:
200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": 123,
    "name": "John Doe",
    "role": "customer"
  }
}
```

**2. Client stores token** (localStorage, cookie, memory)

**3. Client includes token in subsequent requests**:
```http
GET /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**4. Server validates token**:
```
Server checks:
1. Is token format valid?
2. Is token signature valid?
3. Is token expired?
4. Does user still exist?
5. Does user have required permissions?

If yes → Process request
If no → Return 401 Unauthorized
```

### Multiple Clients, One API

```
┌──────────────┐
│  Web App     │  GET /api/products
│  (React)     │  ─────────────────┐
└──────────────┘                   │
                                   ↓
┌──────────────┐            ┌───────────────┐
│  Mobile App  │  POST      │   REST API    │
│  (Flutter)   │  /api/     │ (Spring Boot) │
└──────────────┘  orders    └───────────────┘
                      ↑             │
┌──────────────┐     │             ↓
│  Partner API │ ────┘      ┌───────────────┐
│  (External)  │  DELETE    │   Database    │
└──────────────┘  /api/...  └───────────────┘
```

**Benefit**: Change web UI without affecting mobile app or partners.

---

## 8. Why REST?

### Advantages of REST APIs

#### 1. Platform Independence

Any client (any language, any platform) can consume REST API.

```
JavaScript (Browser) ─┐
Java (Android)────────┤
Swift (iOS) ──────────┼──> REST API
Python (Script) ──────┤     (Language-agnostic)
C# (.NET) ────────────┘
```

#### 2. Scalability

Stateless nature enables horizontal scaling.

```
Load Balancer
     │
     ├──> API Server 1
     ├──> API Server 2
     ├──> API Server 3
     └──> API Server 4

(Any server can handle any request)
```

#### 3. Cacheability

Responses can be cached to improve performance.

```
Client → Cache → Check: Is data fresh?
              ↓
         Yes: Return from cache (fast!)
              ↓
         No: → API Server → Update cache → Return
```

#### 4. Flexibility

Supports multiple data formats.

```
Accept: application/json  → JSON response
Accept: application/xml   → XML response
Accept: text/csv          → CSV response
```

#### 5. Widely Adopted

Industry standard with extensive tooling.

- Documentation: Swagger/OpenAPI
- Testing: Postman, cURL, HTTPie
- Monitoring: New Relic, Datadog
- API Gateways: Kong, Apigee, AWS API Gateway

### Use Cases for REST APIs

#### 1. Web Applications (SPA + REST Backend)

```
Single Page Application (React/Vue/Angular)
             ↕ REST API
      Spring Boot Backend
             ↓
         Database
```

**Example**: Gmail, Netflix, Airbnb

#### 2. Mobile Applications

```
iOS App (Swift)  ─┐
                  ├──> REST API ──> Backend
Android App ──────┘
(Kotlin)
```

**Example**: Instagram, Uber, Twitter mobile apps

#### 3. Microservices Communication

```
User Service ──→ Order Service ──→ Payment Service
    ↕ REST          ↕ REST           ↕ REST
  Database        Database          Database
```

#### 4. Third-Party Integrations

```
Your Application ──→ Payment Gateway (Stripe)
                 ──→ Email Service (SendGrid)
                 ──→ SMS Service (Twilio)
                 ──→ Maps API (Google Maps)
```

#### 5. IoT Devices

```
Smart Thermostat ─┐
Smart Light ──────┼──> REST API ──> Cloud Backend
Security Camera ──┘
```

---

## 9. Alternatives to REST

### 1. SOAP (Simple Object Access Protocol)

**What is it?**
- XML-based protocol
- Strict standards (WS-*)
- Built-in security (WS-Security)
- ACID transaction support

**Example**:
```xml
POST /api HTTP/1.1
Content-Type: application/soap+xml

<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header>
    <auth:credentials>...</auth:credentials>
  </soap:Header>
  <soap:Body>
    <m:GetUser>
      <m:UserId>123</m:UserId>
    </m:GetUser>
  </soap:Body>
</soap:Envelope>
```

**When to use SOAP**:
- ✅ Enterprise systems (banking, insurance)
- ✅ Need ACID transactions
- ✅ Strict security requirements
- ✅ Legacy system integration

**Comparison with REST**:

| Feature | REST | SOAP |
|---------|------|------|
| Format | JSON (usually) | XML (always) |
| Protocol | HTTP | HTTP, SMTP, TCP |
| Complexity | Simple | Complex |
| Performance | Faster (less overhead) | Slower (verbose XML) |
| Standards | Flexible | Strict (WS-*) |
| Use case | Modern APIs | Enterprise legacy |

### 2. GraphQL

**What is it?**
- Query language for APIs
- Client specifies exactly what data it needs
- Single endpoint
- Developed by Facebook (2015)

**Example**:
```graphql
POST /graphql
{
  user(id: 123) {
    name
    email
    orders {
      id
      total
      items {
        productName
        quantity
      }
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "orders": [
        {
          "id": 456,
          "total": 150.00,
          "items": [
            {"productName": "Laptop", "quantity": 1},
            {"productName": "Mouse", "quantity": 2}
          ]
        }
      ]
    }
  }
}
```

**When to use GraphQL**:
- ✅ Mobile apps (reduce data fetching)
- ✅ Complex data requirements
- ✅ Need flexible queries
- ✅ Avoid over-fetching/under-fetching

**Comparison with REST**:

| Feature | REST | GraphQL |
|---------|------|----------|
| Endpoints | Multiple (/users, /orders) | Single (/graphql) |
| Data fetching | Fixed structure | Client specifies |
| Over-fetching | Yes (gets all fields) | No (gets only requested) |
| Under-fetching | Yes (multiple requests) | No (single request) |
| Learning curve | Easy | Medium |
| Use case | Standard APIs | Complex data needs |

### 3. gRPC (Google Remote Procedure Call)

**What is it?**
- High-performance RPC framework
- Uses Protocol Buffers (binary format)
- HTTP/2 based
- Strongly typed contracts

**Example - Define service**:
```protobuf
service UserService {
  rpc GetUser (UserRequest) returns (UserResponse);
  rpc CreateUser (CreateUserRequest) returns (UserResponse);
}

message UserRequest {
  int32 id = 1;
}

message UserResponse {
  int32 id = 1;
  string name = 2;
  string email = 3;
}
```

**When to use gRPC**:
- ✅ Microservices communication (internal)
- ✅ High-performance requirements
- ✅ Low latency critical
- ✅ Streaming (bidirectional)

**Comparison with REST**:

| Feature | REST | gRPC |
|---------|------|------|
| Format | JSON (text) | Protocol Buffers (binary) |
| Protocol | HTTP/1.1 | HTTP/2 |
| Performance | Good | Excellent |
| Streaming | No | Yes (bidirectional) |
| Browser support | Yes | Limited |
| Human-readable | Yes | No (binary) |
| Use case | Public APIs | Internal microservices |

### 4. WebSockets

**What is it?**
- Full-duplex communication protocol
- Persistent connection
- Real-time, bidirectional
- Not request-response

**Example**:
```javascript
// Client
const socket = new WebSocket('ws://api.example.com/chat');

// Receive messages
socket.onmessage = (event) => {
  console.log('New message:', event.data);
};

// Send messages
socket.send('Hello server!');
```

**When to use WebSockets**:
- ✅ Real-time applications (chat, gaming)
- ✅ Live updates (stock prices, sports scores)
- ✅ Collaborative editing
- ✅ Streaming data

**Comparison with REST**:

| Feature | REST | WebSockets |
|---------|------|------------|
| Connection | Request-response | Persistent |
| Direction | Client → Server | Bidirectional |
| Real-time | No (polling required) | Yes (push) |
| Overhead | High (new connection each request) | Low (single connection) |
| Use case | Standard CRUD | Real-time updates |

### Comparison Summary

| Feature | REST | SOAP | GraphQL | gRPC | WebSockets |
|---------|------|------|---------|------|------------|
| **Protocol** | HTTP | HTTP/SMTP/TCP | HTTP | HTTP/2 | WebSocket |
| **Format** | JSON/XML | XML | JSON | Binary | Text/Binary |
| **Performance** | Good | Slower | Good | Excellent | Excellent |
| **Learning Curve** | Easy | Hard | Medium | Medium | Medium |
| **Browser Support** | Yes | Yes | Yes | Limited | Yes |
| **Real-time** | No | No | Subscriptions | Streaming | Yes |
| **Use Case** | General APIs | Enterprise | Complex queries | Microservices | Real-time apps |

**Recommendation for beginners**: Start with REST (simplest, most widely used).

---

## 10. REST API Security Basics

### Authentication vs Authorization

**Authentication**: "Who are you?" (Identity verification)
**Authorization**: "What can you do?" (Permission checking)

```
┌──────────────────────────────────────────────┐
│          Authentication                      │
│  User provides credentials                   │
│  System verifies identity                    │
│  Returns token/session                       │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│          Authorization                       │
│  User requests resource                      │
│  System checks permissions                   │
│  Allow or deny based on role                 │
└──────────────────────────────────────────────┘
```

**Example**:
```
Authentication: John logs in → System confirms "Yes, you're John"
Authorization: John tries to delete user → System checks "Is John an admin?"
```

### Common Authentication Methods

#### 1. Basic Auth

Send username/password in header (Base64 encoded).

```http
GET /api/users
Authorization: Basic am9objpwYXNzd29yZDEyMw==
                     ↑
                Base64(john:password123)
```

**Pros**: Simple
**Cons**: ❌ Insecure (credentials in every request), ❌ No expiration

#### 2. Token-Based (JWT)

Server issues token after login; client includes token in requests.

**Login**:
```http
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "secret123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Subsequent requests**:
```http
GET /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**JWT structure**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.     # Header
eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIn0. # Payload (user data)
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  # Signature
```

**Pros**: ✅ Stateless, ✅ Scalable, ✅ Expiration built-in
**Cons**: Can't revoke before expiration (use short expiry + refresh tokens)

#### 3. OAuth 2.0

Delegated authorization (login with Google/Facebook/GitHub).

```
User → "Login with Google"
    ↓
Google → "Allow MyApp to access your profile?"
    ↓
User → "Yes"
    ↓
Google → Returns access token to MyApp
    ↓
MyApp → Uses token to get user info from Google
```

**Pros**: ✅ User doesn't share password with your app, ✅ Standard protocol
**Cons**: More complex to implement

### HTTPS (Always Use in Production!)

**HTTP**: Data sent in plain text (anyone can read it)
**HTTPS**: Data encrypted (secure)

```
❌ HTTP:
GET http://api.example.com/users
Password: secret123 ← Anyone can see this!

✅ HTTPS:
GET https://api.example.com/users
Password: Encrypted ← Can't be read in transit
```

**Always use HTTPS for**:
- Login endpoints
- Any endpoint sending sensitive data
- Production APIs

### CORS (Cross-Origin Resource Sharing)

**Problem**: Browser blocks requests from different origins (security).

```
Frontend: https://myapp.com
API: https://api.example.com
             ↑
        Different origin → Browser blocks!
```

**Solution**: Server explicitly allows specific origins.

```http
# Server response headers
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

### API Keys

Simple authentication for API access.

```http
GET /api/users
X-API-Key: sk_live_51HZT2pLq...
```

**Use cases**:
- Third-party API access
- Rate limiting
- Usage tracking

**Best practices**:
- Don't expose in client code (server-side only)
- Rotate regularly
- Use different keys for dev/prod

### Rate Limiting

Prevent abuse by limiting requests per time window.

```http
GET /api/users

Response Headers:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1642345600

If exceeded:
429 Too Many Requests
{
  "error": "Rate limit exceeded. Try again in 60 seconds."
}
```

---

## 11. REST API Tools & Testing

### 1. Postman

**Most popular API testing tool**.

**Features**:
- Send requests (GET, POST, PUT, DELETE)
- Save requests in collections
- Set headers and authentication
- View responses
- Test automation
- Share with team

**Example workflow**:
```
1. Create collection: "User API"
2. Add request: GET http://localhost:8080/api/users
3. Add header: Authorization: Bearer <token>
4. Click "Send"
5. View response
```

### 2. cURL (Command-Line Tool)

**Test APIs from terminal**.

**GET request**:
```bash
curl https://api.example.com/users/123
```

**POST request**:
```bash
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

**With authentication**:
```bash
curl https://api.example.com/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**DELETE request**:
```bash
curl -X DELETE https://api.example.com/users/123 \
  -H "Authorization: Bearer <token>"
```

### 3. HTTPie

**User-friendly alternative to cURL**.

```bash
# GET request
http GET https://api.example.com/users/123

# POST request
http POST https://api.example.com/users \
  name="John Doe" \
  email="john@example.com"

# With authentication
http GET https://api.example.com/users/me \
  "Authorization: Bearer <token>"
```

### 4. Browser DevTools

**Built-in browser tool for inspecting HTTP traffic**.

**How to use**:
1. Open browser (Chrome/Firefox)
2. Press `F12` → Network tab
3. Interact with website
4. See all API requests/responses

**What you can see**:
- Request method and URL
- Request/response headers
- Request/response body
- Status code
- Response time

### 5. Swagger/OpenAPI

**API documentation standard**.

**Example Swagger UI**:
```yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0

paths:
  /users:
    get:
      summary: List all users
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'

  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Success
        '404':
          description: User not found

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
```

**Benefits**:
- Interactive documentation
- Try API directly from docs
- Auto-generated from code
- Standard format

---

## 12. Building REST APIs

### Backend Frameworks

Different languages, same REST principles.

#### Java - Spring Boot

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        return userService.save(user);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userService.delete(id);
    }
}
```

#### Node.js - Express

```javascript
const express = require('express');
const app = express();

app.get('/api/users/:id', (req, res) => {
  const user = userService.findById(req.params.id);
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const user = userService.save(req.body);
  res.status(201).json(user);
});

app.delete('/api/users/:id', (req, res) => {
  userService.delete(req.params.id);
  res.status(204).send();
});

app.listen(8080);
```

#### Python - Flask

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/users/<int:id>', methods=['GET'])
def get_user(id):
    user = user_service.find_by_id(id)
    return jsonify(user)

@app.route('/api/users', methods=['POST'])
def create_user():
    user = user_service.save(request.json)
    return jsonify(user), 201

@app.route('/api/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    user_service.delete(id)
    return '', 204

app.run(port=8080)
```

### Key Components of a REST API

```
┌─────────────────────────────────────────┐
│          Controller Layer               │
│  - Handle HTTP requests                 │
│  - Validate input                       │
│  - Call service layer                   │
│  - Return HTTP responses                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│          Service Layer                  │
│  - Business logic                       │
│  - Orchestrate operations               │
│  - Call repository layer                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│          Repository Layer               │
│  - Data access                          │
│  - CRUD operations                      │
│  - Query database                       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│              Database                   │
│         (PostgreSQL/MySQL)              │
└─────────────────────────────────────────┘
```

**Example - Spring Boot layered architecture**:

```java
// Model/DTO
public class User {
    private Long id;
    private String name;
    private String email;
    // getters, setters
}

// Repository
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}

// Service
@Service
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public User findById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
    }

    public User save(User user) {
        return repository.save(user);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}

// Controller
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        User user = userService.findById(id);
        return ResponseEntity.ok(user);
    }

    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        User saved = userService.save(user);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody User user) {
        user.setId(id);
        User updated = userService.save(user);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userService.delete(id);
    }
}
```

### Bridge to Spring Boot

**What you'll learn next** (in Spring Boot module):
- `@RestController` - Mark class as REST controller
- `@GetMapping`, `@PostMapping` - Map HTTP methods
- `@PathVariable` - Extract URL parameters
- `@RequestBody` - Parse JSON request body
- `@Valid` - Validate input
- Exception handling with `@ControllerAdvice`
- Response entities and status codes

**Preview**:
```java
@RestController
@RequestMapping("/api/products")
public class ProductController {

    @GetMapping
    public List<Product> getAllProducts() {
        return productService.findAll();
    }

    @GetMapping("/{id}")
    public Product getProduct(@PathVariable Long id) {
        return productService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Product createProduct(@Valid @RequestBody Product product) {
        return productService.save(product);
    }

    @PutMapping("/{id}")
    public Product updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody Product product) {
        return productService.update(id, product);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(@PathVariable Long id) {
        productService.delete(id);
    }
}
```

---

## 13. Best Practices & Common Pitfalls

### Best Practices

#### ✅ 1. Use Plural Nouns for Resources

```
✅ GOOD:
/users
/orders
/products

❌ BAD:
/user
/order
/product
```

#### ✅ 2. Use HTTP Methods Correctly

```
✅ GOOD:
GET    /users          # List users
GET    /users/123      # Get user
POST   /users          # Create user
PUT    /users/123      # Update user
DELETE /users/123      # Delete user

❌ BAD:
GET    /getUsers
POST   /createUser
POST   /updateUser
POST   /deleteUser
```

#### ✅ 3. Return Appropriate Status Codes

```
✅ GOOD:
GET    /users/123  → 200 OK (found)
GET    /users/999  → 404 Not Found (doesn't exist)
POST   /users      → 201 Created (new resource)
DELETE /users/123  → 204 No Content (deleted)
POST   /users      → 400 Bad Request (validation failed)

❌ BAD:
GET /users/999  → 200 OK {"error": "User not found"}
                  ↑ Should be 404, not 200!
```

#### ✅ 4. Version Your API

```
✅ GOOD:
/api/v1/users
/api/v2/users

❌ BAD:
/api/users  (no version, can't make breaking changes)
```

#### ✅ 5. Document Your API

Use Swagger/OpenAPI for interactive documentation.

#### ✅ 6. Handle Errors Consistently

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "issue": "Email format is invalid"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/api/users"
  }
}
```

#### ✅ 7. Use Pagination for Large Datasets

```
GET /api/products?page=1&size=20
```

#### ✅ 8. Validate Input

```java
public class User {
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 50)
    private String name;

    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    private String email;

    @Min(value = 18, message = "Age must be at least 18")
    private int age;
}
```

#### ✅ 9. Use HTTPS in Production

Always encrypt data in transit.

#### ✅ 10. Implement Rate Limiting

Prevent abuse and ensure fair usage.

### Common Pitfalls

#### ❌ 1. Using Verbs in URLs

```
❌ BAD:
/createUser
/getUsers
/updateUser
/deleteUser

✅ GOOD:
POST   /users
GET    /users
PUT    /users/{id}
DELETE /users/{id}
```

#### ❌ 2. Returning 200 for Errors

```
❌ BAD:
GET /users/999
200 OK
{
  "error": "User not found"
}

✅ GOOD:
GET /users/999
404 Not Found
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID 999 not found"
  }
}
```

#### ❌ 3. Exposing Database IDs Directly

```
❌ BAD:
GET /users/1, /users/2, /users/3
(Sequential IDs are guessable)

✅ GOOD:
GET /users/550e8400-e29b-41d4-a716-446655440000
(Use UUIDs or obfuscated IDs)
```

#### ❌ 4. Forgetting Input Validation

```
❌ BAD:
POST /users
{
  "email": "invalid-email",
  "age": -5
}
→ Saved to database without validation!

✅ GOOD:
POST /users
{
  "email": "invalid-email",
  "age": -5
}
→ 400 Bad Request
{
  "error": {
    "details": [
      {"field": "email", "issue": "Invalid email format"},
      {"field": "age", "issue": "Age must be positive"}
    ]
  }
}
```

#### ❌ 5. Not Handling Edge Cases

```
❌ BAD:
DELETE /users/123  (user doesn't exist)
→ 500 Internal Server Error

✅ GOOD:
DELETE /users/123  (user doesn't exist)
→ 404 Not Found or 204 No Content (idempotent)
```

#### ❌ 6. Inconsistent Response Formats

```
❌ BAD:
GET /users/123
→ {"user": {"id": 123, "name": "John"}}

GET /products/456
→ {"id": 456, "name": "Laptop"}

(Inconsistent wrapping)

✅ GOOD:
GET /users/123
→ {"id": 123, "name": "John"}

GET /products/456
→ {"id": 456, "name": "Laptop"}

(Consistent format)
```

#### ❌ 7. Not Using HTTPS

```
❌ BAD:
POST http://api.example.com/auth/login
{
  "email": "john@example.com",
  "password": "secret123"
}
↑ Password sent in plain text!

✅ GOOD:
POST https://api.example.com/auth/login
{
  "email": "john@example.com",
  "password": "secret123"
}
↑ Encrypted connection
```

---

## 14. Real-World Example: E-Commerce API

### Complete API Design

```
BASE URL: https://api.mystore.com/v1
```

#### Product Management

```
# List products with filters
GET /products?category=electronics&minPrice=100&maxPrice=500&sort=-price&page=1&size=20

Response:
200 OK
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Wireless Mouse",
      "description": "Ergonomic wireless mouse",
      "price": 29.99,
      "category": "electronics",
      "inStock": true,
      "imageUrl": "https://cdn.mystore.com/images/mouse.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 156,
    "totalPages": 8
  }
}

# Get product details
GET /products/{id}

Response:
200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Wireless Mouse",
  "description": "Ergonomic wireless mouse with 6 buttons",
  "price": 29.99,
  "category": "electronics",
  "brand": "TechCorp",
  "inStock": true,
  "stockQuantity": 45,
  "images": [
    "https://cdn.mystore.com/images/mouse-1.jpg",
    "https://cdn.mystore.com/images/mouse-2.jpg"
  ],
  "specifications": {
    "weight": "100g",
    "color": "Black",
    "connectivity": "Bluetooth"
  },
  "reviews": {
    "average": 4.5,
    "count": 127
  }
}

# Create product (Admin only)
POST /products
Authorization: Bearer <admin-token>
{
  "name": "Mechanical Keyboard",
  "description": "RGB backlit mechanical keyboard",
  "price": 89.99,
  "category": "electronics",
  "brand": "KeyMaster",
  "stockQuantity": 30
}

Response:
201 Created
Location: /products/660f9511-f30c-52e5-b827-557766551111
{
  "id": "660f9511-f30c-52e5-b827-557766551111",
  "name": "Mechanical Keyboard",
  ...
  "createdAt": "2024-01-15T10:30:00Z"
}

# Update product (Admin only)
PUT /products/{id}
Authorization: Bearer <admin-token>
{
  "name": "Mechanical Keyboard Pro",
  "price": 99.99,
  "stockQuantity": 50
}

Response:
200 OK
{
  "id": "660f9511-f30c-52e5-b827-557766551111",
  "name": "Mechanical Keyboard Pro",
  "price": 99.99,
  ...
  "updatedAt": "2024-01-15T11:00:00Z"
}

# Delete product (Admin only)
DELETE /products/{id}
Authorization: Bearer <admin-token>

Response:
204 No Content
```

#### User Management

```
# Register user
POST /auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}

Response:
201 Created
{
  "id": "770g0622-g41d-63f6-c938-668877662222",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "customer",
  "createdAt": "2024-01-15T10:00:00Z"
}

# Login
POST /auth/login
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}

Response:
200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "770g0622-g41d-63f6-c938-668877662222",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  }
}

# Get current user profile
GET /users/me
Authorization: Bearer <token>

Response:
200 OK
{
  "id": "770g0622-g41d-63f6-c938-668877662222",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "customer",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zipCode": "10001",
    "country": "USA"
  },
  "createdAt": "2024-01-15T10:00:00Z"
}

# Update user profile
PATCH /users/me
Authorization: Bearer <token>
{
  "name": "John Smith",
  "address": {
    "street": "456 Oak Ave",
    "city": "San Francisco"
  }
}

Response:
200 OK
{
  "id": "770g0622-g41d-63f6-c938-668877662222",
  "name": "John Smith",
  ...
  "updatedAt": "2024-01-15T11:30:00Z"
}
```

#### Order Management

```
# Create order
POST /orders
Authorization: Bearer <token>
{
  "items": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2
    },
    {
      "productId": "660f9511-f30c-52e5-b827-557766551111",
      "quantity": 1
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "credit_card"
}

Response:
201 Created
Location: /orders/880h1733-h52e-74g7-d049-779988773333
{
  "id": "880h1733-h52e-74g7-d049-779988773333",
  "userId": "770g0622-g41d-63f6-c938-668877662222",
  "items": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "productName": "Wireless Mouse",
      "quantity": 2,
      "price": 29.99,
      "subtotal": 59.98
    },
    {
      "productId": "660f9511-f30c-52e5-b827-557766551111",
      "productName": "Mechanical Keyboard Pro",
      "quantity": 1,
      "price": 99.99,
      "subtotal": 99.99
    }
  ],
  "subtotal": 159.97,
  "tax": 15.00,
  "shipping": 10.00,
  "total": 184.97,
  "status": "pending",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "zipCode": "10001",
    "country": "USA"
  },
  "createdAt": "2024-01-15T12:00:00Z"
}

# List user's orders
GET /users/me/orders?status=pending&page=1&size=10
Authorization: Bearer <token>

Response:
200 OK
{
  "data": [
    {
      "id": "880h1733-h52e-74g7-d049-779988773333",
      "total": 184.97,
      "status": "pending",
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 5,
    "totalPages": 1
  }
}

# Get order details
GET /orders/{id}
Authorization: Bearer <token>

Response:
200 OK
{
  "id": "880h1733-h52e-74g7-d049-779988773333",
  "userId": "770g0622-g41d-63f6-c938-668877662222",
  "items": [...],
  "total": 184.97,
  "status": "pending",
  "trackingNumber": null,
  "createdAt": "2024-01-15T12:00:00Z"
}

# Update order status (Admin only)
PATCH /orders/{id}/status
Authorization: Bearer <admin-token>
{
  "status": "shipped",
  "trackingNumber": "1Z999AA10123456784"
}

Response:
200 OK
{
  "id": "880h1733-h52e-74g7-d049-779988773333",
  "status": "shipped",
  "trackingNumber": "1Z999AA10123456784",
  "updatedAt": "2024-01-16T10:00:00Z"
}

# Cancel order
POST /orders/{id}/cancel
Authorization: Bearer <token>

Response:
200 OK
{
  "id": "880h1733-h52e-74g7-d049-779988773333",
  "status": "cancelled",
  "cancelledAt": "2024-01-15T14:00:00Z"
}
```

#### Shopping Cart

```
# Get cart
GET /cart
Authorization: Bearer <token>

Response:
200 OK
{
  "items": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "productName": "Wireless Mouse",
      "price": 29.99,
      "quantity": 2,
      "subtotal": 59.98
    }
  ],
  "total": 59.98
}

# Add item to cart
POST /cart/items
Authorization: Bearer <token>
{
  "productId": "660f9511-f30c-52e5-b827-557766551111",
  "quantity": 1
}

Response:
201 Created
{
  "items": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2,
      "subtotal": 59.98
    },
    {
      "productId": "660f9511-f30c-52e5-b827-557766551111",
      "quantity": 1,
      "subtotal": 99.99
    }
  ],
  "total": 159.97
}

# Update cart item quantity
PATCH /cart/items/{productId}
Authorization: Bearer <token>
{
  "quantity": 3
}

Response:
200 OK
{
  "items": [...],
  "total": 189.96
}

# Remove item from cart
DELETE /cart/items/{productId}
Authorization: Bearer <token>

Response:
204 No Content
```

### Error Responses

```json
# 400 Bad Request - Validation error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "issue": "Email format is invalid"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/auth/register"
  }
}

# 401 Unauthorized - Missing/invalid token
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/orders"
  }
}

# 403 Forbidden - Insufficient permissions
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to access this resource",
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/products"
  }
}

# 404 Not Found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Product with ID 550e8400-e29b-41d4-a716-446655440000 not found",
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/products/550e8400-e29b-41d4-a716-446655440000"
  }
}

# 409 Conflict - Resource conflict
{
  "error": {
    "code": "CONFLICT",
    "message": "Email already registered",
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/auth/register"
  }
}

# 500 Internal Server Error
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/orders"
  }
}
```

---

## 15. Self-Check Questions & Practice

### Knowledge Questions

**Answer from memory before checking solutions**.

1. **What is the difference between GET and POST?**

<details>
<summary>Answer</summary>
GET retrieves data (read-only, idempotent, safe). POST creates new resources (has side effects, not idempotent). GET parameters in URL, POST data in body.
</details>

2. **When would you return 404 vs 400?**

<details>
<summary>Answer</summary>
404 (Not Found): Resource doesn't exist (e.g., GET /users/999).
400 (Bad Request): Invalid input/validation failed (e.g., missing required field, invalid email format).
</details>

3. **What makes REST "RESTful"?**

<details>
<summary>Answer</summary>
- Resource-based URLs (nouns, not verbs)
- Proper HTTP methods (GET, POST, PUT, DELETE)
- Stateless communication
- Standard HTTP status codes
- Client-server separation
- Uniform interface
</details>

4. **What is HATEOAS?**

<details>
<summary>Answer</summary>
Hypermedia As The Engine Of Application State - Level 3 of Richardson Maturity Model. API responses include links to related resources, making the API self-documenting and discoverable.
</details>

5. **What is idempotency? Give examples.**

<details>
<summary>Answer</summary>
Operation can be called multiple times with same result. Examples:
- GET /users/123 (idempotent) - always returns same user
- PUT /users/123 (idempotent) - updates to same state
- DELETE /users/123 (idempotent) - deletes once, subsequent calls do nothing
- POST /users (NOT idempotent) - creates new user each time
</details>

6. **Why is REST stateless? What does it mean?**

<details>
<summary>Answer</summary>
Server doesn't remember previous requests. Each request contains all needed information (e.g., authentication token). Benefits: scalability (any server can handle any request), reliability (server restart doesn't lose state), simplicity (no session management).
</details>

7. **When would you use PUT vs PATCH?**

<details>
<summary>Answer</summary>
- PUT: Full update/replace entire resource (send all fields)
- PATCH: Partial update (send only changed fields)

Example:
PUT /users/123 → Must send all user fields
PATCH /users/123 → Send only {"email": "new@example.com"}
</details>

8. **What's the difference between 401 and 403?**

<details>
<summary>Answer</summary>
- 401 Unauthorized: No authentication provided or invalid credentials (not logged in)
- 403 Forbidden: Authenticated but don't have permission (logged in but not admin)
</details>

### Practice Exercises

#### Level 1: Design API Endpoints

Design REST API endpoints for a **blog system** with posts, comments, and users.

<details>
<summary>Solution</summary>

```
# Users
GET    /users                  # List all users
GET    /users/{id}            # Get user profile
POST   /users                 # Register user
PUT    /users/{id}            # Update user
DELETE /users/{id}            # Delete user

# Posts
GET    /posts                 # List all posts
GET    /posts/{id}            # Get post details
POST   /posts                 # Create new post
PUT    /posts/{id}            # Update post
DELETE /posts/{id}            # Delete post
GET    /users/{id}/posts      # Get user's posts

# Comments
GET    /posts/{id}/comments   # Get post comments
POST   /posts/{id}/comments   # Add comment to post
GET    /comments/{id}         # Get comment details
PUT    /comments/{id}         # Update comment
DELETE /comments/{id}         # Delete comment
```
</details>

#### Level 2: Write JSON Request/Response

Write sample JSON request/response for **user registration**.

<details>
<summary>Solution</summary>

**Request**:
```json
POST /api/auth/register
Content-Type: application/json

{
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "password": "SecurePass123!",
  "dateOfBirth": "1990-05-15"
}
```

**Response (Success)**:
```json
201 Created
Location: /api/users/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "role": "user",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Response (Error)**:
```json
400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "password",
        "issue": "Password must be at least 8 characters"
      }
    ]
  }
}
```
</details>

#### Level 3: Map Status Codes to Scenarios

Match the correct HTTP status code to each scenario:

1. User successfully logs in
2. User tries to access admin page without admin role
3. User tries to create account with already-registered email
4. Server database connection fails
5. User requests non-existent resource
6. User sends invalid JSON format
7. User successfully creates new post
8. User successfully deletes their account

<details>
<summary>Solution</summary>

1. **200 OK** - User successfully logs in
2. **403 Forbidden** - User tries to access admin page without admin role
3. **409 Conflict** - User tries to create account with already-registered email
4. **500 Internal Server Error** - Server database connection fails
5. **404 Not Found** - User requests non-existent resource
6. **400 Bad Request** - User sends invalid JSON format
7. **201 Created** - User successfully creates new post
8. **204 No Content** - User successfully deletes their account
</details>

---

## 16. Interview Questions

### Scenario-Based Questions

#### Question 1: Design a REST API for a Booking System

**Scenario**: Design REST API for a hotel booking system (hotels, rooms, bookings, users).

<details>
<summary>Answer</summary>

```
# Hotels
GET    /hotels                      # List all hotels
GET    /hotels/{id}                 # Get hotel details
POST   /hotels                      # Create hotel (Admin)
PUT    /hotels/{id}                 # Update hotel (Admin)
DELETE /hotels/{id}                 # Delete hotel (Admin)

# Rooms
GET    /hotels/{hotelId}/rooms      # List rooms in hotel
GET    /rooms/{id}                  # Get room details
POST   /hotels/{hotelId}/rooms      # Add room (Admin)
PUT    /rooms/{id}                  # Update room (Admin)
DELETE /rooms/{id}                  # Delete room (Admin)

# Search & Availability
GET    /hotels/search?city=NYC&checkIn=2024-02-01&checkOut=2024-02-05
GET    /rooms/{id}/availability?checkIn=2024-02-01&checkOut=2024-02-05

# Bookings
GET    /bookings                    # List user's bookings
GET    /bookings/{id}               # Get booking details
POST   /bookings                    # Create booking
PUT    /bookings/{id}               # Update booking
DELETE /bookings/{id}               # Cancel booking

# Users
GET    /users/me                    # Get current user
PUT    /users/me                    # Update profile
POST   /auth/register               # Register
POST   /auth/login                  # Login
```

**Example - Create booking**:
```json
POST /bookings
Authorization: Bearer <token>
{
  "roomId": "550e8400-e29b-41d4-a716-446655440000",
  "checkInDate": "2024-02-01",
  "checkOutDate": "2024-02-05",
  "guests": 2,
  "specialRequests": "Late check-in"
}

Response:
201 Created
{
  "id": "660f9511-f30c-52e5-b827-557766551111",
  "roomId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "770g0622-g41d-63f6-c938-668877662222",
  "checkInDate": "2024-02-01",
  "checkOutDate": "2024-02-05",
  "guests": 2,
  "totalPrice": 400.00,
  "status": "confirmed",
  "createdAt": "2024-01-15T10:00:00Z"
}
```
</details>

#### Question 2: How would you handle versioning in a production API?

<details>
<summary>Answer</summary>

**Best approach: URL versioning**
```
/api/v1/users
/api/v2/users
```

**Why?**
- ✅ Most visible and explicit
- ✅ Easy to route to different implementations
- ✅ Clear in documentation
- ✅ Works with all clients

**When to create new version?**
- Breaking changes (removing fields, changing data types)
- Major functionality changes
- Different business logic

**How to manage**:
1. Keep v1 running while releasing v2
2. Deprecate v1 with sunset date
3. Notify clients in advance
4. Monitor v1 usage
5. Eventually remove v1

**Example deprecation header**:
```http
GET /api/v1/users
Deprecation: true
Sunset: Wed, 11 Nov 2024 23:59:59 GMT
Link: </api/v2/users>; rel="successor-version"
```
</details>

#### Question 3: Explain idempotency with examples

<details>
<summary>Answer</summary>

**Idempotency**: Calling operation multiple times produces same result as calling once.

**Why it matters**: Network failures, retries, duplicate requests

**Examples**:

**GET (Idempotent)**:
```
GET /users/123  # Returns user
GET /users/123  # Returns same user
GET /users/123  # Returns same user
Result: No change to server state
```

**PUT (Idempotent)**:
```
PUT /users/123 {"name": "John Updated"}  # Updates user
PUT /users/123 {"name": "John Updated"}  # Already in that state
PUT /users/123 {"name": "John Updated"}  # Still in same state
Result: User updated once
```

**DELETE (Idempotent)**:
```
DELETE /users/123  # Deletes user (200 OK or 204 No Content)
DELETE /users/123  # Already deleted (404 Not Found or 204 No Content)
DELETE /users/123  # Still deleted
Result: User deleted once
```

**POST (NOT Idempotent)**:
```
POST /users {"name": "John"}  # Creates user ID 1
POST /users {"name": "John"}  # Creates user ID 2
POST /users {"name": "John"}  # Creates user ID 3
Result: 3 different users created!
```

**Real-world scenario**:
```
User clicks "Submit Order" button
→ Network timeout
→ User clicks again
→ Without idempotency: 2 orders created!
→ With idempotency token: Only 1 order created

POST /orders
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```
</details>

#### Question 4: When would you use PUT vs PATCH?

<details>
<summary>Answer</summary>

**PUT**: Full replacement of resource
```json
PUT /users/123
{
  "name": "John Updated",
  "email": "john@example.com",
  "age": 31,
  "address": {
    "street": "123 Main St",
    "city": "New York"
  }
}
```
- Send ALL fields (even unchanged ones)
- Replaces entire resource
- Idempotent

**PATCH**: Partial update
```json
PATCH /users/123
{
  "email": "john.new@example.com"
}
```
- Send only changed fields
- Other fields remain unchanged
- Usually not idempotent (depends on implementation)

**When to use**:
- **PUT**: When client has full resource representation
- **PATCH**: When updating specific fields (mobile apps, forms with few fields)

**Example - Mobile app updating user notification settings**:
```json
PATCH /users/me/settings
{
  "emailNotifications": false
}
```
Updating one setting shouldn't require sending entire user profile.
</details>

---

## 17. What's Next?

### Learning Path

**You've learned REST API fundamentals!** Now you're ready to:

#### **1. Spring Boot REST API Development** (Hands-on implementation)
- Building REST controllers with `@RestController`
- Request mapping with `@GetMapping`, `@PostMapping`, etc.
- Input validation with `@Valid`
- Exception handling with `@ControllerAdvice`
- Testing REST APIs with MockMvc

**Next file**: [Spring Boot REST API](../01-java/02-spring-ecosystem/spring-boot/03-rest-api.md)

#### **2. API Documentation**
- Swagger/OpenAPI specification
- Interactive API documentation
- API versioning strategies

#### **3. Advanced Topics**
- **Microservices Communication**
  - Service-to-service REST calls
  - Feign clients
  - Circuit breakers (Resilience4j)
  - [Microservices Communication](../03-architecture/microservices/04-communication.md)

- **API Security**
  - JWT authentication
  - OAuth 2.0
  - API keys and rate limiting
  - [Spring Security](../01-java/02-spring-ecosystem/spring-security/)

- **Performance Optimization**
  - Caching strategies
  - Pagination best practices
  - Asynchronous processing

#### **4. Alternative Technologies**
- GraphQL API development
- gRPC for microservices
- WebSockets for real-time applications

### Practice Projects

**Build these projects to reinforce learning**:

1. **Todo List API** (Beginner)
   - CRUD operations for todos
   - User authentication
   - Categories/tags

2. **Blog API** (Intermediate)
   - Posts, comments, users
   - Search and filtering
   - Pagination
   - File uploads (images)

3. **E-Commerce API** (Advanced)
   - Products, orders, cart
   - Payment integration
   - Order tracking
   - Admin dashboard

### Recommended Tools to Master

1. **Postman** - API testing
2. **cURL** - Command-line requests
3. **Swagger UI** - API documentation
4. **Git** - Version control
5. **Docker** - Containerization

---

## Summary

**In 3 sentences**:
- REST is an architectural style using HTTP for building scalable, stateless APIs where resources are accessed via standard HTTP methods (GET, POST, PUT, DELETE).
- The Richardson Maturity Model defines 4 levels of REST, with Level 2 (HTTP verbs + status codes) being the most common in production.
- REST's stateless, resource-based design enables multiple clients (web, mobile, IoT) to consume the same API, making it the foundation of modern web applications and microservices.

**Key Takeaways**:
1. ✅ REST = Resource-based URLs + HTTP methods + Status codes
2. ✅ Stateless communication (each request is self-contained)
3. ✅ Use correct HTTP methods: GET (read), POST (create), PUT/PATCH (update), DELETE (remove)
4. ✅ Return appropriate status codes (2xx success, 4xx client error, 5xx server error)
5. ✅ Design with nouns (resources), not verbs (actions)
6. ✅ Version your API for breaking changes
7. ✅ Always use HTTPS in production
8. ✅ Document your API (Swagger/OpenAPI)

---

## Navigation

**Prerequisites:**
- ✅ Basic HTTP knowledge (covered in this file)
- ✅ JSON format (covered in this file)

**Next Topics:**
- [Spring Boot REST API Development](../01-java/02-spring-ecosystem/spring-boot/03-rest-api.md) - Build REST APIs with Spring Boot
- [Spring Security](../01-java/02-spring-ecosystem/spring-security/) - Secure your APIs
- [Microservices Communication](../03-architecture/microservices/04-communication.md) - REST in microservices

**Related:**
- [Spring Boot Auto-Configuration](../01-java/02-spring-ecosystem/spring-boot/01-auto-configuration.md)
- [Spring Data JPA](../01-java/02-spring-ecosystem/spring-data/) - Database integration

**External Resources:**
- [Roy Fielding's Dissertation](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) - Original REST definition
- [Richardson Maturity Model](https://martinfowler.com/articles/richardsonMaturityModel.html) - Martin Fowler's explanation
- [HTTP Status Codes](https://httpstatuses.com/) - Complete reference
- [REST API Tutorial](https://restfulapi.net/) - Additional examples

---

**Module Index:** [Prerequisites](./README.md) | **Main Index:** [Learning Roadmap](../README.md)
