# gRPC - Zero to Hero

> **Before you start**: You should know basic networking (HTTP, TCP) and have read [REST API Fundamentals](./03-rest-api.md). This guide takes you from "what is RPC?" all the way to production-grade gRPC services.

---

## Table of Contents

1. [Why gRPC Exists — The Problem It Solves](#1-why-grpc-exists)
2. [What is RPC? (The Concept)](#2-what-is-rpc-the-concept)
3. [Protocol Buffers (Protobuf) — The Serialization Layer](#3-protocol-buffers-protobuf)
4. [gRPC Core Concepts](#4-grpc-core-concepts)
5. [The Four Communication Patterns](#5-the-four-communication-patterns)
6. [gRPC vs REST vs GraphQL](#6-grpc-vs-rest-vs-graphql)
7. [Writing Your First .proto File](#7-writing-your-first-proto-file)
8. [Building a gRPC Server (Java / Spring Boot)](#8-building-a-grpc-server-java--spring-boot)
9. [Building a gRPC Client](#9-building-a-grpc-client)
10. [Metadata, Headers, and Interceptors](#10-metadata-headers-and-interceptors)
11. [Error Handling — Status Codes](#11-error-handling--status-codes)
12. [Authentication & Security](#12-authentication--security)
13. [Load Balancing & Service Discovery](#13-load-balancing--service-discovery)
14. [Deadlines and Cancellation](#14-deadlines-and-cancellation)
15. [gRPC in Production — Best Practices](#15-grpc-in-production--best-practices)
16. [gRPC-Web — Browser Support](#16-grpc-web--browser-support)
17. [Observability — Tracing, Metrics, Logging](#17-observability--tracing-metrics-logging)
18. [Common Pitfalls](#18-common-pitfalls)
19. [Interview Questions](#19-interview-questions)
20. [What's Next?](#20-whats-next)

---

## 1. Why gRPC Exists

### The REST Pain Points (at Scale)

REST with JSON works great for public APIs, but inside a microservices system:

```
Problem 1: Serialization Overhead
  JSON: { "user_id": 123, "name": "Alice", "email": "alice@example.com" }
  → Text parsing, flexible but SLOW at high volume

Problem 2: No Contract
  REST has no enforced schema at runtime.
  Client and server can silently disagree on field types.

Problem 3: Only Request-Response
  What if a server needs to stream 1 million records to a client?
  REST: multiple paginated calls, lots of overhead.

Problem 4: HTTP/1.1 Head-of-Line Blocking
  One slow request blocks the next on the same connection.
```

### What gRPC Gives You

| Problem | gRPC Solution |
|---------|---------------|
| Slow JSON | Binary Protocol Buffers (5–10× smaller, faster) |
| No contract | `.proto` files as the single source of truth |
| Only req/res | 4 streaming patterns (unary, client, server, bidirectional) |
| HTTP/1.1 limits | Built on HTTP/2 (multiplexed, compressed headers) |
| Code duplication | Code generation from `.proto` in 10+ languages |

**gRPC is Google's open-source RPC framework** — released in 2016, now a CNCF project. It powers internal Google services, Netflix, Dropbox, Square, and most modern microservice platforms.

---

## 2. What is RPC? (The Concept)

**RPC = Remote Procedure Call** — call a function on another machine as if it were local.

```
Local call:
  int result = calculator.add(5, 3);  // just a function call

Remote call (without RPC framework):
  1. Serialize arguments to bytes
  2. Send over network (TCP/HTTP)
  3. Remote machine deserializes
  4. Executes the function
  5. Serializes result
  6. Sends back
  7. You deserialize

RPC (with framework):
  int result = calculatorStub.add(5, 3);  // LOOKS like a local call
  // Framework handles all 7 steps above transparently
```

### RPC History (Brief)

```
1980s  CORBA, DCE/RPC    — first RPC frameworks (complex, brittle)
1990s  XML-RPC, SOAP     — web-friendly but verbose XML
2000s  REST              — simpler, stateless, HTTP-native
2015   gRPC (Google)     — modern RPC with HTTP/2 + Protobuf
```

---

## 3. Protocol Buffers (Protobuf)

Protobuf is gRPC's **serialization format** — it's independent of gRPC and can be used on its own.

### How It Works

```
You write:          user.proto
    ↓ protoc compiler
Generated:          UserOuterClass.java (or user_pb2.py, etc.)

Your code uses the generated classes — no manual serialization ever.
```

### Protobuf vs JSON

```
JSON:
{
  "user_id": 12345,
  "name": "Alice",
  "email": "alice@example.com",
  "active": true
}
→ 73 bytes (text)

Protobuf binary (equivalent):
08 B9 60 12 05 41 6C 69 63 65 1A 11 61 6C 69 63
65 40 65 78 61 6D 70 6C 65 2E 63 6F 6D 20 01
→ ~30 bytes (binary, ~2.5× smaller)
→ ~5-10× faster to serialize/deserialize
```

### Field Numbers — The Key Concept

```protobuf
message User {
  int32  user_id = 1;   // field number 1
  string name    = 2;   // field number 2
  string email   = 3;   // field number 3
  bool   active  = 4;   // field number 4
}
```

- **Field numbers** (not names!) go into the binary wire format.
- This enables **backward compatibility**: add new fields freely; old decoders ignore unknown field numbers.
- **NEVER reuse a field number** — it breaks backward compatibility.

### Scalar Types

| Protobuf Type | Java Type | Notes |
|---------------|-----------|-------|
| `int32`       | int       | Use for counts, IDs |
| `int64`       | long      | Large numbers, timestamps |
| `float`       | float     | Single precision |
| `double`      | double    | Double precision |
| `bool`        | boolean   | True/false |
| `string`      | String    | UTF-8 text |
| `bytes`       | ByteString| Binary data |
| `uint32`      | int       | Unsigned 32-bit |

### Complex Types

```protobuf
// Enums
enum Status {
  STATUS_UNSPECIFIED = 0;  // Always have a 0 value (proto3 default)
  STATUS_ACTIVE      = 1;
  STATUS_INACTIVE    = 2;
}

// Nested messages
message Address {
  string street = 1;
  string city   = 2;
  string zip    = 3;
}

message User {
  int32   user_id  = 1;
  string  name     = 2;
  Address address  = 3;  // nested
  Status  status   = 4;  // enum
}

// Repeated (list)
message OrderList {
  repeated Order orders = 1;  // like List<Order>
}

// Map
message Config {
  map<string, string> settings = 1;  // like Map<String, String>
}

// Optional (proto3 explicit optional)
message SearchRequest {
  string query         = 1;
  optional int32 limit = 2;  // explicitly tracks presence
}

// Well-known types (google/protobuf/)
import "google/protobuf/timestamp.proto";
import "google/protobuf/any.proto";
import "google/protobuf/empty.proto";

message Event {
  google.protobuf.Timestamp created_at = 1;  // Use instead of int64 for time
}
```

### Proto3 vs Proto2

You'll almost always use **proto3** (default since 2016):
- All fields are optional by default (no `required` keyword)
- Default values for missing fields (0, "", false, empty list)
- Simpler, cleaner syntax

---

## 4. gRPC Core Concepts

### The Stack

```
Your Code
    ↓
gRPC Stub (generated from .proto)
    ↓
gRPC Framework (channel, serialization, retry, auth)
    ↓
HTTP/2 (multiplexed streams, header compression)
    ↓
TLS (optional but recommended in production)
    ↓
TCP
```

### Key Terms

| Term | What It Means |
|------|---------------|
| **Service** | A set of RPC methods (defined in .proto) |
| **Stub** | Auto-generated client-side proxy |
| **Channel** | Connection abstraction to a server (manages HTTP/2 connections) |
| **Deadline** | Timeout for an RPC call |
| **Metadata** | Key-value headers (like HTTP headers) |
| **Interceptor** | Middleware for cross-cutting concerns (auth, logging) |
| **Status** | gRPC result code (OK, NOT_FOUND, UNAVAILABLE…) |
| **Stream** | A long-lived connection for sending multiple messages |

### HTTP/2 Under the Hood

```
HTTP/1.1:  one request per connection (or pipelining, still serial)
           Client ──[REQ1]──────────────[REQ2]──────────────► Server

HTTP/2:    many streams multiplexed on ONE connection
           Client ──[REQ1 stream 1]─────────────────────────► Server
                  ──[REQ2 stream 3]─────────────────────────►
                  ──[REQ3 stream 5]─────────────────────────►
           ◄─────────────────────────[RES3 stream 5]─────────
           ◄─────────────────────────[RES1 stream 1]─────────

→ No head-of-line blocking at HTTP level
→ Header compression (HPACK) reduces overhead
→ Server push capability
```

---

## 5. The Four Communication Patterns

This is gRPC's superpower over REST.

### Pattern 1: Unary RPC (like REST)

```
Client ──[Request]──► Server
Client ◄──[Response]── Server

One request, one response. Same as REST.
Use when: Simple CRUD operations, queries.
```

```protobuf
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
}
```

### Pattern 2: Server-Side Streaming

```
Client ──[Request]──► Server
Client ◄──[msg1]────── Server
Client ◄──[msg2]────── Server
Client ◄──[msg3]────── Server
Client ◄──[END]──────── Server

One request, stream of responses.
Use when: Download a large dataset, real-time feed, log tailing.
```

```protobuf
service ReportService {
  rpc StreamTransactions(DateRangeRequest) returns (stream Transaction);
}
```

### Pattern 3: Client-Side Streaming

```
Client ──[msg1]──► Server
Client ──[msg2]──► Server
Client ──[msg3]──► Server
Client ──[END]───► Server
Client ◄──[Response]── Server

Stream of requests, one response.
Use when: File upload, batch insert, sensor data aggregation.
```

```protobuf
service UploadService {
  rpc UploadFile(stream FileChunk) returns (UploadResponse);
}
```

### Pattern 4: Bidirectional Streaming

```
Client ──[msg1]──► Server
Client ◄──[ack1]── Server
Client ──[msg2]──► Server
Client ──[msg3]──► Server
Client ◄──[ack2]── Server
...full duplex...

Use when: Chat, real-time collaboration, live gaming, IoT telemetry.
```

```protobuf
service ChatService {
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}
```

---

## 6. gRPC vs REST vs GraphQL

| Aspect | REST | GraphQL | gRPC |
|--------|------|---------|------|
| **Protocol** | HTTP/1.1 or 2 | HTTP/1.1 or 2 | HTTP/2 |
| **Format** | JSON (text) | JSON (text) | Protobuf (binary) |
| **Schema** | Optional (OpenAPI) | Required (.graphql) | Required (.proto) |
| **Type safety** | Loose | Strong | Strict |
| **Streaming** | SSE/WebSocket hack | Subscriptions | Native (4 patterns) |
| **Code gen** | Optional | Optional | First-class |
| **Browser support** | ✅ Native | ✅ Native | ⚠️ Needs gRPC-Web |
| **Human readable** | ✅ Yes | ✅ Yes | ❌ Binary |
| **Caching** | ✅ HTTP caching | ⚠️ Complex | ❌ Not HTTP-native |
| **Best for** | Public APIs | Flexible client needs | Internal microservices |
| **Learning curve** | Low | Medium | Medium-High |

### When to Choose gRPC

✅ **Use gRPC when**:
- Internal service-to-service communication
- High throughput, low latency requirements
- Strong typing and contract enforcement needed
- Streaming data (logs, telemetry, events)
- Polyglot microservices (Java + Go + Python communicating)

❌ **Avoid gRPC when**:
- Public-facing browser APIs (use REST or GraphQL + gRPC internally)
- Simple CRUD with no performance constraints
- Team unfamiliar with Protobuf toolchain
- Need easy debugging with curl/Postman (JSON is much easier)

---

## 7. Writing Your First .proto File

### File Structure

```protobuf
// File: src/main/proto/user/v1/user_service.proto

syntax = "proto3";                          // Always proto3

package user.v1;                            // Package namespace

option java_package = "com.example.user.v1";         // Java package
option java_outer_classname = "UserServiceProto";     // Wrapper class name
option java_multiple_files = true;                    // One file per message

import "google/protobuf/timestamp.proto";   // Well-known types

// ─── Messages ──────────────────────────────────────

message User {
  int64                     user_id    = 1;
  string                    name       = 2;
  string                    email      = 3;
  UserStatus                status     = 4;
  google.protobuf.Timestamp created_at = 5;
}

enum UserStatus {
  USER_STATUS_UNSPECIFIED = 0;
  USER_STATUS_ACTIVE      = 1;
  USER_STATUS_SUSPENDED   = 2;
}

message GetUserRequest {
  int64 user_id = 1;
}

message CreateUserRequest {
  string name  = 1;
  string email = 2;
}

message UpdateUserRequest {
  int64  user_id = 1;
  string name    = 2;  // Only update provided fields
  string email   = 3;
}

message DeleteUserRequest {
  int64 user_id = 1;
}

message ListUsersRequest {
  int32 page_size  = 1;
  string page_token = 2;
}

message ListUsersResponse {
  repeated User  users          = 1;
  string         next_page_token = 2;
}

// ─── Service ───────────────────────────────────────

service UserService {
  rpc GetUser    (GetUserRequest)    returns (User);
  rpc CreateUser (CreateUserRequest) returns (User);
  rpc UpdateUser (UpdateUserRequest) returns (User);
  rpc DeleteUser (DeleteUserRequest) returns (google.protobuf.Empty);
  rpc ListUsers  (ListUsersRequest)  returns (ListUsersResponse);

  // Streaming example
  rpc WatchUser  (GetUserRequest)    returns (stream User);
}
```

### Naming Conventions (Google API Design Guide)

```
Package:   lowercase, use versioning (user.v1, payment.v2)
Messages:  PascalCase (GetUserRequest, UserStatus)
Fields:    snake_case (user_id, created_at)
Enums:     PascalCase; values UPPER_SNAKE_CASE with type prefix
Services:  PascalCase with "Service" suffix
RPCs:      PascalCase verb-noun (GetUser, CreateOrder, ListProducts)
```

---

## 8. Building a gRPC Server (Java / Spring Boot)

### Maven Setup

```xml
<!-- pom.xml -->
<properties>
    <grpc.version>1.63.0</grpc.version>
    <protobuf.version>3.25.3</protobuf.version>
</properties>

<dependencies>
    <!-- gRPC Spring Boot Starter (LogNet) -->
    <dependency>
        <groupId>net.devh</groupId>
        <artifactId>grpc-server-spring-boot-starter</artifactId>
        <version>3.1.0.RELEASE</version>
    </dependency>

    <!-- Protobuf runtime -->
    <dependency>
        <groupId>com.google.protobuf</groupId>
        <artifactId>protobuf-java</artifactId>
        <version>${protobuf.version}</version>
    </dependency>
</dependencies>

<build>
    <extensions>
        <extension>
            <groupId>kr.motd.maven</groupId>
            <artifactId>os-maven-plugin</artifactId>
            <version>1.7.1</version>
        </extension>
    </extensions>
    <plugins>
        <plugin>
            <groupId>org.xolstice.maven.plugins</groupId>
            <artifactId>protobuf-maven-plugin</artifactId>
            <version>0.6.1</version>
            <configuration>
                <protocArtifact>com.google.protobuf:protoc:${protobuf.version}:exe:${os.detected.classifier}</protocArtifact>
                <pluginId>grpc-java</pluginId>
                <pluginArtifact>io.grpc:protoc-gen-grpc-java:${grpc.version}:exe:${os.detected.classifier}</pluginArtifact>
            </configuration>
            <executions>
                <execution>
                    <goals>
                        <goal>compile</goal>
                        <goal>compile-custom</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### application.yml

```yaml
grpc:
  server:
    port: 9090          # gRPC port (separate from HTTP 8080)
    security:
      enabled: false    # Set true for TLS in production

spring:
  application:
    name: user-service
```

### Implementing the Service

```java
// UserServiceImpl.java
@GrpcService  // This annotation registers it as a gRPC service
public class UserServiceImpl extends UserServiceGrpc.UserServiceImplBase {

    private final UserRepository userRepository;

    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // ─── Unary RPC ────────────────────────────────────

    @Override
    public void getUser(GetUserRequest request,
                        StreamObserver<User> responseObserver) {
        try {
            UserEntity entity = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

            User response = toProto(entity);

            responseObserver.onNext(response);    // Send the response
            responseObserver.onCompleted();        // Signal done
        } catch (Exception e) {
            responseObserver.onError(
                Status.NOT_FOUND
                    .withDescription("User not found: " + request.getUserId())
                    .withCause(e)
                    .asRuntimeException()
            );
        }
    }

    @Override
    public void createUser(CreateUserRequest request,
                           StreamObserver<User> responseObserver) {
        // Validate
        if (request.getEmail().isBlank()) {
            responseObserver.onError(
                Status.INVALID_ARGUMENT
                    .withDescription("Email cannot be empty")
                    .asRuntimeException()
            );
            return;
        }

        UserEntity entity = new UserEntity();
        entity.setName(request.getName());
        entity.setEmail(request.getEmail());
        entity = userRepository.save(entity);

        responseObserver.onNext(toProto(entity));
        responseObserver.onCompleted();
    }

    // ─── Server Streaming RPC ─────────────────────────

    @Override
    public void watchUser(GetUserRequest request,
                          StreamObserver<User> responseObserver) {
        // Simulate watching for changes (in real life: use a queue/pub-sub)
        try {
            for (int i = 0; i < 5; i++) {
                UserEntity entity = userRepository.findById(request.getUserId())
                    .orElseThrow();
                responseObserver.onNext(toProto(entity));
                Thread.sleep(1000); // Send update every second
            }
            responseObserver.onCompleted();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            responseObserver.onError(Status.CANCELLED.asRuntimeException());
        }
    }

    // ─── Mapper ───────────────────────────────────────

    private User toProto(UserEntity entity) {
        return User.newBuilder()
            .setUserId(entity.getId())
            .setName(entity.getName())
            .setEmail(entity.getEmail())
            .setStatus(UserStatus.USER_STATUS_ACTIVE)
            .build();
    }
}
```

### Client Streaming Example (File Upload)

```java
@Override
public StreamObserver<FileChunk> uploadFile(
        StreamObserver<UploadResponse> responseObserver) {

    return new StreamObserver<FileChunk>() {
        private final ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        private String fileName;

        @Override
        public void onNext(FileChunk chunk) {
            // Called for EACH chunk the client sends
            fileName = chunk.getFileName();
            try {
                buffer.write(chunk.getContent().toByteArray());
            } catch (IOException e) {
                responseObserver.onError(
                    Status.INTERNAL.withCause(e).asRuntimeException());
            }
        }

        @Override
        public void onError(Throwable t) {
            // Client aborted the stream
            log.error("Upload stream error", t);
        }

        @Override
        public void onCompleted() {
            // Client finished sending — now respond
            storageService.save(fileName, buffer.toByteArray());
            responseObserver.onNext(
                UploadResponse.newBuilder()
                    .setSuccess(true)
                    .setBytesSaved(buffer.size())
                    .build()
            );
            responseObserver.onCompleted();
        }
    };
}
```

---

## 9. Building a gRPC Client

### Sync Blocking Client

```java
// UserServiceClient.java
@Component
public class UserServiceClient {

    @GrpcClient("user-service")  // Refers to config below
    private UserServiceGrpc.UserServiceBlockingStub blockingStub;

    public User getUser(long userId) {
        GetUserRequest request = GetUserRequest.newBuilder()
            .setUserId(userId)
            .build();

        try {
            return blockingStub
                .withDeadlineAfter(5, TimeUnit.SECONDS)  // Always set a deadline!
                .getUser(request);
        } catch (StatusRuntimeException e) {
            if (e.getStatus().getCode() == Status.Code.NOT_FOUND) {
                return null; // Handle gracefully
            }
            throw e;
        }
    }
}
```

### application.yml (Client Config)

```yaml
grpc:
  client:
    user-service:                        # Must match @GrpcClient("user-service")
      address: static://localhost:9090   # Or discovery://user-service for Eureka
      negotiation-type: plaintext        # Use TLS in production
```

### Async Non-Blocking Client

```java
@GrpcClient("user-service")
private UserServiceGrpc.UserServiceStub asyncStub;  // No "Blocking" in name

public CompletableFuture<User> getUserAsync(long userId) {
    CompletableFuture<User> future = new CompletableFuture<>();

    asyncStub.withDeadlineAfter(5, TimeUnit.SECONDS)
        .getUser(
            GetUserRequest.newBuilder().setUserId(userId).build(),
            new StreamObserver<User>() {
                @Override
                public void onNext(User user) {
                    future.complete(user);
                }

                @Override
                public void onError(Throwable t) {
                    future.completeExceptionally(t);
                }

                @Override
                public void onCompleted() {
                    // For unary this is called right after onNext
                }
            }
        );

    return future;
}
```

### Server Streaming Client

```java
public void watchUser(long userId) {
    asyncStub.watchUser(
        GetUserRequest.newBuilder().setUserId(userId).build(),
        new StreamObserver<User>() {
            @Override
            public void onNext(User user) {
                System.out.println("Update: " + user.getName());
            }

            @Override
            public void onError(Throwable t) {
                System.err.println("Stream error: " + t.getMessage());
            }

            @Override
            public void onCompleted() {
                System.out.println("Stream ended");
            }
        }
    );
}
```

---

## 10. Metadata, Headers, and Interceptors

### Metadata (like HTTP Headers)

```java
// Attaching metadata to a call
Metadata headers = new Metadata();
Metadata.Key<String> AUTH_KEY =
    Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
headers.put(AUTH_KEY, "Bearer " + token);

stub = MetadataUtils.attachHeaders(stub, headers);
User user = stub.getUser(request);
```

### Server Interceptor (Authentication Middleware)

```java
@Component
public class AuthInterceptor implements ServerInterceptor {

    private static final Metadata.Key<String> AUTH_KEY =
        Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);

    @Override
    public <Req, Res> ServerCall.Listener<Req> interceptCall(
            ServerCall<Req, Res> call,
            Metadata headers,
            ServerCallHandler<Req, Res> next) {

        String token = headers.get(AUTH_KEY);

        if (token == null || !isValid(token)) {
            call.close(
                Status.UNAUTHENTICATED.withDescription("Missing or invalid token"),
                new Metadata()
            );
            return new ServerCall.Listener<>() {}; // No-op listener
        }

        // Add user info to context for use in service methods
        Context ctx = Context.current()
            .withValue(USER_CONTEXT_KEY, extractUser(token));

        return Contexts.interceptCall(ctx, call, headers, next);
    }

    private boolean isValid(String token) { /* JWT validation */ return true; }
}
```

### Client Interceptor (Logging)

```java
@Component
public class LoggingClientInterceptor implements ClientInterceptor {

    @Override
    public <Req, Res> ClientCall<Req, Res> interceptCall(
            MethodDescriptor<Req, Res> method,
            CallOptions callOptions,
            Channel next) {

        log.info("gRPC call: {}", method.getFullMethodName());
        long startTime = System.currentTimeMillis();

        return new ForwardingClientCall.SimpleForwardingClientCall<>(
                next.newCall(method, callOptions)) {

            @Override
            public void start(Listener<Res> responseListener, Metadata headers) {
                super.start(new ForwardingClientCallListener
                        .SimpleForwardingClientCallListener<>(responseListener) {
                    @Override
                    public void onClose(Status status, Metadata trailers) {
                        long duration = System.currentTimeMillis() - startTime;
                        log.info("gRPC {} completed: {} in {}ms",
                            method.getFullMethodName(), status.getCode(), duration);
                        super.onClose(status, trailers);
                    }
                }, headers);
            }
        };
    }
}
```

---

## 11. Error Handling — Status Codes

gRPC uses well-defined status codes (similar to HTTP status codes but different).

### Status Code Reference

| Code | HTTP Equivalent | When to Use |
|------|-----------------|-------------|
| `OK` | 200 | Success |
| `INVALID_ARGUMENT` | 400 | Bad input (client's fault) |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `ALREADY_EXISTS` | 409 | Duplicate resource |
| `PERMISSION_DENIED` | 403 | Authenticated but not authorized |
| `UNAUTHENTICATED` | 401 | Not authenticated |
| `RESOURCE_EXHAUSTED` | 429 | Rate limited, quota exceeded |
| `FAILED_PRECONDITION` | 412 | System not in right state |
| `UNIMPLEMENTED` | 501 | RPC not implemented |
| `INTERNAL` | 500 | Server bug (unexpected error) |
| `UNAVAILABLE` | 503 | Service temporarily down (retryable) |
| `DEADLINE_EXCEEDED` | 504 | Timeout |
| `CANCELLED` | — | Client cancelled the call |

### Throwing Errors in Server

```java
// Simple
throw Status.NOT_FOUND
    .withDescription("User with id " + userId + " not found")
    .asRuntimeException();

// With cause (for logging, NOT sent to client for security)
throw Status.INTERNAL
    .withDescription("Database error")
    .withCause(dbException)  // cause stays server-side
    .asRuntimeException();

// With rich error details (google.rpc.Status)
Metadata trailer = new Metadata();
com.google.rpc.Status richStatus = com.google.rpc.Status.newBuilder()
    .setCode(Code.INVALID_ARGUMENT.getNumber())
    .setMessage("Validation failed")
    .addDetails(Any.pack(BadRequest.newBuilder()
        .addFieldViolations(FieldViolation.newBuilder()
            .setField("email")
            .setDescription("Invalid email format")
            .build())
        .build()))
    .build();
trailer.put(StatusProto.STATUS_DETAILS_KEY, richStatus);
call.close(Status.INVALID_ARGUMENT, trailer);
```

### Handling Errors in Client

```java
try {
    User user = stub.getUser(request);
} catch (StatusRuntimeException e) {
    Status status = e.getStatus();

    switch (status.getCode()) {
        case NOT_FOUND:
            return Optional.empty();
        case UNAVAILABLE:
            // Retry with backoff
            throw new ServiceUnavailableException();
        case DEADLINE_EXCEEDED:
            throw new TimeoutException("User service timed out");
        default:
            log.error("Unexpected gRPC error: {}", status);
            throw new RuntimeException(e);
    }
}
```

---

## 12. Authentication & Security

### TLS (Production Must-Have)

```yaml
# Server
grpc:
  server:
    security:
      enabled: true
      certificate-chain: classpath:certs/server.crt
      private-key: classpath:certs/server.key

# Client
grpc:
  client:
    user-service:
      address: static://user-service:9090
      negotiation-type: tls
      security:
        trust-cert-collection: classpath:certs/ca.crt
```

### JWT Auth Pattern

```
Client                          Server
  │                               │
  │─── Metadata: Bearer <JWT> ───►│
  │                               │── AuthInterceptor validates JWT
  │                               │── Puts User in gRPC Context
  │                               │── Routes to service method
  │◄───────── Response ───────────│
```

```java
// In service, retrieve user from Context (set by interceptor)
@Override
public void getUser(GetUserRequest request, StreamObserver<User> observer) {
    AuthenticatedUser caller = USER_CONTEXT_KEY.get(); // set by interceptor
    if (!caller.canAccessUser(request.getUserId())) {
        observer.onError(Status.PERMISSION_DENIED
            .withDescription("Cannot access another user's data")
            .asRuntimeException());
        return;
    }
    // proceed...
}
```

### Mutual TLS (mTLS) — Service-to-Service

```
Client Service                  Server Service
      │                               │
      │── presents client cert ──────►│
      │◄─── presents server cert ─────│
      │── both sides verify ──────────│
      │── encrypted channel ──────────│

→ Both sides proven: no impersonation possible
→ Best practice for internal microservice mesh
```

---

## 13. Load Balancing & Service Discovery

### Client-Side Load Balancing (gRPC native)

```java
// gRPC natively supports client-side LB via name resolution
ManagedChannel channel = ManagedChannelBuilder
    .forTarget("dns:///user-service.internal:9090")  // DNS resolves multiple IPs
    .defaultLoadBalancingPolicy("round_robin")        // or "pick_first"
    .usePlaintext()
    .build();
```

### Spring Cloud Discovery

```yaml
grpc:
  client:
    user-service:
      address: discovery:///user-service  # Eureka/Consul service name
      negotiation-type: plaintext
```

### Load Balancing Options

| Method | How it Works | Best For |
|--------|-------------|----------|
| Client-side (DNS) | Client resolves multiple IPs, round-robins | Simple internal setup |
| Service mesh (Istio/Linkerd) | Sidecar proxy intercepts and balances | Kubernetes production |
| Envoy proxy | L7 proxy understands gRPC streams | Complex routing needs |

> **gRPC vs REST load balancing**: HTTP/2 multiplexing means one TCP connection carries many RPCs — naive L4 load balancers send everything to one backend. Use L7-aware balancers (Envoy, Nginx 1.13+, Istio) or gRPC's own client-side LB.

---

## 14. Deadlines and Cancellation

**Always set deadlines.** Without them, a slow/broken server will cause your client to hang forever, cascading failures through the whole system.

```java
// Client sets deadline
User user = stub
    .withDeadlineAfter(3, TimeUnit.SECONDS)  // Absolute: 3s from now
    .getUser(request);

// Deadlines propagate automatically!
// If service A calls B with 5s deadline, and B calls C,
// C inherits the remaining time (say 4.2s). This prevents
// downstream calls from running longer than useful.
```

### Checking for Deadline/Cancellation in Server

```java
@Override
public void longOperation(Request request, StreamObserver<Response> observer) {
    for (DataChunk chunk : largeDataset) {
        // Check if client cancelled or deadline expired
        if (Context.current().isCancelled()) {
            observer.onError(Status.CANCELLED.asRuntimeException());
            return;  // Stop work — client doesn't want results anymore
        }
        processChunk(chunk);
        observer.onNext(convertToResponse(chunk));
    }
    observer.onCompleted();
}
```

---

## 15. gRPC in Production — Best Practices

### Schema Evolution (Backward Compatibility)

```protobuf
// SAFE changes (backward compatible):
// ✅ Add new fields (with new field numbers)
// ✅ Change field names (binary uses numbers, not names)
// ✅ Add new RPC methods to a service

// BREAKING changes (avoid):
// ❌ Delete a field number (even if you delete the field, reserve the number)
// ❌ Change a field's type
// ❌ Reuse a field number for a different field
// ❌ Rename an RPC method

// Best practice: reserve deleted field numbers
message User {
  reserved 3, 4;          // old phone, old address fields
  reserved "phone";       // reserve name too
  int64  user_id = 1;
  string name    = 2;
  // fields 3 and 4 are gone but reserved — won't be accidentally reused
}
```

### API Versioning

```protobuf
// Version in package name, not the RPC name
package user.v1;  // → user.v2 when breaking changes needed

// Allows running v1 and v2 side by side during migration
```

### Keep Interfaces Small and Focused

```protobuf
// ❌ One huge service
service EverythingService {
  rpc GetUser ...
  rpc GetProduct ...
  rpc GetOrder ...
  rpc ProcessPayment ...
}

// ✅ Single-responsibility services
service UserService    { rpc GetUser ... }
service ProductService { rpc GetProduct ... }
service OrderService   { rpc GetOrder ... }
service PaymentService { rpc ProcessPayment ... }
```

### Health Checks

```protobuf
// Use the standard gRPC health checking protocol
// proto: grpc/health/v1/health.proto (part of grpc-services)

service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}
```

```java
// Spring Boot auto-configures health check if you add:
@Bean
public HealthStatusManager healthStatusManager() {
    return new HealthStatusManager();
}

// Set service health status
healthStatusManager.setStatus("UserService", ServingStatus.SERVING);
healthStatusManager.setStatus("UserService", ServingStatus.NOT_SERVING);
```

### Reflection (for grpcurl / debugging)

```yaml
grpc:
  server:
    reflection:
      enabled: true  # Only in dev/staging!
```

```bash
# With reflection enabled, use grpcurl to test without knowing .proto:
grpcurl -plaintext localhost:9090 list
grpcurl -plaintext localhost:9090 describe user.v1.UserService
grpcurl -plaintext -d '{"user_id": 1}' localhost:9090 user.v1.UserService/GetUser
```

---

## 16. gRPC-Web — Browser Support

Browsers can't use raw HTTP/2 gRPC (CORS and HTTP/2 trailer issues). Solution: **gRPC-Web** with an Envoy proxy.

```
Browser ──[gRPC-Web/HTTP1]──► Envoy ──[gRPC/HTTP2]──► gRPC Server
```

### Envoy Config Snippet

```yaml
# envoy.yaml
filter_chains:
  - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          http_filters:
            - name: envoy.filters.http.grpc_web   # Translates gRPC-Web ↔ gRPC
            - name: envoy.filters.http.cors
            - name: envoy.filters.http.router
```

### Alternative: gRPC Transcoding

Convert gRPC to REST automatically (for backward-compat with REST clients):

```protobuf
import "google/api/annotations.proto";

service UserService {
  rpc GetUser(GetUserRequest) returns (User) {
    option (google.api.http) = {
      get: "/v1/users/{user_id}"   // REST endpoint auto-generated
    };
  }
}
```

---

## 17. Observability — Tracing, Metrics, Logging

### Metrics with Micrometer

```java
// grpc-spring-boot-starter auto-exports metrics to Micrometer:
// grpc.server.calls.started{method="GetUser", service="UserService"}
// grpc.server.calls.completed{status="OK"}
// grpc.server.call.duration (histogram)
```

```yaml
management:
  endpoints:
    web:
      exposure:
        include: prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

### Distributed Tracing with OpenTelemetry

```xml
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-grpc-1.6</artifactId>
</dependency>
```

```java
// gRPC automatically propagates trace context via metadata
// Trace IDs flow: Service A → gRPC metadata → Service B → Service C
// View in Jaeger/Zipkin/Grafana Tempo
```

### Structured Logging Pattern

```java
// In interceptor, log all calls with consistent fields:
log.info("gRPC call",
    kv("method", method.getFullMethodName()),
    kv("status", status.getCode()),
    kv("duration_ms", duration),
    kv("user_id", callContext.getUserId()),
    kv("trace_id", traceId)
);
```

---

## 18. Common Pitfalls

### ❌ Forgetting Deadlines

```java
// BAD — hangs forever if server is slow/down
User user = stub.getUser(request);

// GOOD
User user = stub.withDeadlineAfter(5, TimeUnit.SECONDS).getUser(request);
```

### ❌ Blocking in Async Handlers

```java
// BAD — blocks gRPC thread pool
@Override
public void getUser(GetUserRequest req, StreamObserver<User> obs) {
    Thread.sleep(5000);  // NEVER block here!
}

// GOOD — use async/reactive or executor
@Override
public void getUser(GetUserRequest req, StreamObserver<User> obs) {
    CompletableFuture.runAsync(() -> {
        User user = fetchUser(req.getUserId());
        obs.onNext(user);
        obs.onCompleted();
    }, executor);
}
```

### ❌ Ignoring onError in StreamObserver

```java
// BAD — unhandled errors crash silently
asyncStub.getUser(req, new StreamObserver<User>() {
    public void onNext(User u)  { handle(u); }
    public void onError(Throwable t) { /* TODO */ }  // empty!
    public void onCompleted()    { }
});

// GOOD
public void onError(Throwable t) {
    log.error("getUser failed", t);
    fallbackHandler.handle(t);
}
```

### ❌ Not Versioning Your .proto

```
// Bad: changing proto in place — breaks deployed clients
// Good: package user.v1 → package user.v2 for breaking changes
```

### ❌ Using HTTP/1.1 Load Balancer with gRPC

```
L4 load balancer (AWS NLB, old Nginx) → sends ALL gRPC calls to ONE pod
→ Use Envoy, Istio, or AWS ALB (HTTP/2 aware)
```

### ❌ Sending Sensitive Data Without TLS

```yaml
# BAD in production:
negotiation-type: plaintext

# GOOD:
negotiation-type: tls
```

---

## 19. Interview Questions

### Fundamentals

**Q: What is gRPC and how does it differ from REST?**
> gRPC is a high-performance RPC framework using HTTP/2 as transport and Protocol Buffers as serialization. Unlike REST (text-based JSON over HTTP/1.1), gRPC uses binary encoding (5–10× smaller, faster), HTTP/2 (multiplexed streams, header compression), and supports 4 communication patterns — including server, client, and bidirectional streaming. REST is better for public APIs; gRPC excels at internal microservice communication.

**Q: What are Protocol Buffers?**
> Protobuf is a language-neutral binary serialization format. You define messages in `.proto` files; the `protoc` compiler generates type-safe code. Wire format uses field numbers (not names), enabling backward compatibility — new fields can be added without breaking existing clients.

**Q: Explain the four gRPC communication patterns.**
> 1. **Unary** — one request, one response (like REST)  
> 2. **Server streaming** — one request, stream of responses (e.g., large dataset download)  
> 3. **Client streaming** — stream of requests, one response (e.g., file upload)  
> 4. **Bidirectional streaming** — full duplex; both sides stream simultaneously (e.g., chat, telemetry)

### Design & Architecture

**Q: When would you choose gRPC over REST?**
> gRPC for: internal service-to-service where latency and throughput matter; streaming data; polyglot environments needing strong type safety; when you need bidirectional streaming. REST for: public-facing APIs; browser clients (without gRPC-Web); when discoverability and human readability matter; simple CRUD with no performance constraints.

**Q: How does gRPC handle backward compatibility?**
> Via field numbers in Protobuf. Adding new fields with new numbers is safe — old decoders ignore unknown fields. Never delete or reuse field numbers; use `reserved` to mark retired ones. For breaking changes, version the package (`user.v1` → `user.v2`).

**Q: How does gRPC load balancing work? Why is it different from REST?**
> HTTP/2 multiplexing means one TCP connection handles many RPCs — L4 load balancers (which operate at TCP level) route everything to one backend. gRPC needs L7-aware balancers (Envoy, Istio, AWS ALB) or client-side load balancing where the client resolves multiple server IPs and distributes calls itself.

**Q: What are gRPC interceptors and when would you use them?**
> Interceptors are middleware that wrap every RPC call (server or client side). Used for: authentication/authorization, logging, metrics collection, distributed tracing, retry logic, rate limiting — any cross-cutting concern you don't want in every service method.

### Deep Dive

**Q: Why must you always set deadlines in gRPC?**
> Without deadlines, a slow or hung downstream service keeps your thread/connection occupied indefinitely, eventually exhausting resources and causing cascading failures. Deadlines also propagate automatically — if service A has a 5s budget and passes 4s remaining to service B, B won't run longer than useful.

**Q: How would you implement authentication in gRPC?**
> Using a server interceptor that reads a `authorization` metadata key (like an HTTP header). The interceptor validates the JWT/token and either closes the call with `UNAUTHENTICATED` or stores the user in the gRPC Context for downstream service methods to read.

---

## 20. What's Next?

- **Practice**: [Evans gRPC Practical Guide](https://grpc.io/docs/guides/)
- **Tool**: `grpcurl` — curl for gRPC. Test services from the command line.
- **Advanced**: Service mesh (Istio) + gRPC for zero-trust mTLS automatically
- **Related notes**:
  - [REST API Fundamentals](./03-rest-api.md) — understand the alternative
  - [Microservices Communication](../03-architecture/microservices/04-communication.md) — REST vs gRPC vs Messaging in context
  - [Networking Fundamentals](../03-architecture/system-design/04-networking-fundamentals.md) — HTTP/2 deep dive
  - [Kafka Guide](../03-architecture/messaging/kafka-comprehensive-guide.md) — async alternative to gRPC streaming

---

*Zero to Hero: You now understand gRPC from first principles (why RPC, why Protobuf, why HTTP/2) through production concerns (TLS, load balancing, deadlines, observability). Start with unary RPCs, get comfortable with .proto files, then explore streaming patterns.*
