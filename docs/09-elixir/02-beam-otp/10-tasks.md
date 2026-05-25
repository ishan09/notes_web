# Task & Task.Supervisor — Interview Write-up (Elixir / OTP)

---

## 🔹 What is a Task?

A `Task` is a **lightweight abstraction for running concurrent, short-lived work**.

👉 It is essentially a wrapper around a process used for:

* Async execution
* Parallel computation
* Background work (non-persistent)

---

## 🔹 When to Use Task

Use `Task` when:

* Work is **short-lived**
* You need **parallelism**
* You don’t need to maintain state
* You don’t need retries / supervision (basic case)

### Examples:

* Calling external APIs
* Parallel DB queries
* Data transformations
* Fire-and-forget operations

---

## 🔹 Core Task Functions

---

### 1️⃣ Task.async / Task.await

```elixir
task = Task.async(fn -> heavy_work() end)
result = Task.await(task)
```

**Behavior:**

* Spawns a process
* Links it to caller
* Caller waits for result

---

### 2️⃣ Task.await with timeout

```elixir
Task.await(task, 5000)
```

* Raises error if timeout exceeded
* Prevents hanging processes

---

### 3️⃣ Task.async_stream (Parallel processing)

```elixir
Task.async_stream(collection, fn item ->
  process(item)
end)
```

**Features:**

* Processes collection in parallel
* Controlled concurrency
* Handles backpressure

---

### 4️⃣ Task.start (fire-and-forget)

```elixir
Task.start(fn -> do_work() end)
```

* Starts process
* Does NOT link to caller
* No result tracking

---

### 5️⃣ Task.start_link

```elixir
Task.start_link(fn -> do_work() end)
```

* Linked to parent
* Crashes propagate

---

## 🔹 Key Characteristics

* Tasks are **temporary processes**
* Designed for **stateless work**
* Automatically cleaned up after completion
* No built-in retry or persistence

---

## 🔹 Task Failure Behavior

| Function   | On crash                |
| ---------- | ----------------------- |
| async      | Caller crashes (linked) |
| start      | Independent             |
| start_link | Parent crashes          |

---

## 🔹 Task.Supervisor

---

## 🔹 What is Task.Supervisor?

`Task.Supervisor` is used to:
👉 **Supervise and manage Tasks safely**

It provides:

* Fault isolation
* Controlled spawning
* Better error handling

---

## 🔹 Why Not Use Task Directly?

Problems with raw Task:

* Linked to caller → can crash parent
* No central control
* Hard to manage many tasks

👉 Task.Supervisor solves this

---

## 🔹 Defining Task.Supervisor

```elixir
children = [
  {Task.Supervisor, name: MyApp.TaskSupervisor}
]
```

---

## 🔹 Common Functions

---

### 1️⃣ async_nolink

```elixir
Task.Supervisor.async_nolink(
  MyApp.TaskSupervisor,
  fn -> work() end
)
```

* Not linked to caller
* Safe for background work

---

### 2️⃣ async

```elixir
Task.Supervisor.async(
  MyApp.TaskSupervisor,
  fn -> work() end
)
```

* Linked version
* Supervisor tracks it

---

### 3️⃣ start_child

```elixir
Task.Supervisor.start_child(
  MyApp.TaskSupervisor,
  fn -> work() end
)
```

* Fire-and-forget
* Supervised

---

### 4️⃣ async_stream (supervised)

```elixir
Task.Supervisor.async_stream(
  MyApp.TaskSupervisor,
  collection,
  fn item -> process(item) end
)
```

* Parallel processing
* Controlled concurrency

---

## 🔹 Task vs Task.Supervisor

| Feature     | Task         | Task.Supervisor      |
| ----------- | ------------ | -------------------- |
| Supervision | ❌ No         | ✅ Yes                |
| Safety      | Low          | High                 |
| Control     | Limited      | Better               |
| Use case    | Simple async | Production workloads |

---

## 🔹 Task vs GenServer

| Task                     | GenServer   |
| ------------------------ | ----------- |
| Short-lived              | Long-lived  |
| Stateless                | Stateful    |
| No message handling loop | Has mailbox |
| No supervision (basic)   | Supervised  |

---

## 🔹 Internals (Interview Focus)

* Task = process + monitor/link
* Uses `spawn` under the hood
* Returns `%Task{pid, ref}` struct
* `await` listens for reply message

---

## 🔹 Common Pitfalls

* Using `Task.await` without timeout
* Spawning too many tasks → memory pressure
* Using Task for long-lived processes
* Blocking inside tasks (DB, IO without limits)

---

## 🔹 Best Practices

* Use `Task.Supervisor` in production
* Always use timeouts
* Limit concurrency (`async_stream`)
* Avoid unbounded task creation
* Prefer supervised tasks for reliability

---

## 🔹 Interview Questions

* What is Task in Elixir?
* Difference between Task.async and Task.start?
* What is Task.Supervisor?
* When would you use Task vs GenServer?
* What happens if Task crashes?
* Why use async_stream?

---

## 🔥 Deep Dive Questions (Senior)

* How does Task.await work internally?
* What message pattern does Task use?
* How do you control concurrency with async_stream?
* What happens if caller dies before Task completes?

---

## 🎯 One-liner (Interview Ready)

> "Task is used for short-lived asynchronous work, while Task.Supervisor provides a safer, supervised way to run and manage such tasks in production systems."

---
