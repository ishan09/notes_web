# DynamicSupervisor — Interview Write-up (Elixir / OTP)

---

## 🔹 What is DynamicSupervisor?

`DynamicSupervisor` is an OTP behaviour used to **dynamically start and supervise child processes at runtime**, instead of defining all children upfront.

👉 Unlike `Supervisor`, where children are static, `DynamicSupervisor` allows:

* Adding/removing children on demand
* Managing large, dynamic workloads (e.g., jobs, sessions, connections)

---

## 🔹 When to Use DynamicSupervisor

Use it when:

* Number of processes is **not known beforehand**
* Processes are **short-lived or dynamic**
* You need to spawn processes per:

  * request
  * job
  * user/session
  * background task

### Examples:

* Job processing systems (like Oban-style workers)
* WebSocket / LiveView session processes
* Per-user stateful processes
* Task workers

---

## 🔹 Basic Structure

### Define Supervisor

```elixir
defmodule MyApp.WorkerSupervisor do
  use DynamicSupervisor

  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end
end
```

---

### Define Worker

```elixir
defmodule MyApp.Worker do
  use GenServer

  def start_link(arg) do
    GenServer.start_link(__MODULE__, arg)
  end

  def init(state) do
    {:ok, state}
  end
end
```

---

### Start Child Dynamically

```elixir
DynamicSupervisor.start_child(
  MyApp.WorkerSupervisor,
  {MyApp.Worker, :some_arg}
)
```

---

## 🔹 Restart Strategy

DynamicSupervisor typically uses:

```elixir
strategy: :one_for_one
```

👉 Meaning:

* If a child crashes → only that child is restarted

---

## 🔹 Child Spec

Worker must define a **child_spec** (auto-generated if using `use GenServer`)

Custom example:

```elixir
def child_spec(arg) do
  %{
    id: __MODULE__,
    start: {__MODULE__, :start_link, [arg]},
    restart: :transient
  }
end
```

---

## 🔹 Restart Options

| Option     | Meaning               |
| ---------- | --------------------- |
| :permanent | Always restart        |
| :transient | Restart only on crash |
| :temporary | Never restart         |

---

## 🔹 Key Characteristics

* No predefined children list
* Children are started via API (`start_child`)
* Each child is independent
* Supervisor does NOT track order or dependencies

---

## 🔹 Internals (Interview Focus)

* Maintains an internal **registry of children**
* Uses **process monitoring** to detect crashes
* Applies restart strategy when child exits
* Does NOT restart itself unless parent supervisor handles it

---

## 🔹 DynamicSupervisor vs Supervisor

| Feature            | Supervisor            | DynamicSupervisor |
| ------------------ | --------------------- | ----------------- |
| Children           | Static                | Dynamic           |
| Defined at startup | Yes                   | No                |
| Use case           | Core system processes | Runtime workers   |
| start_child        | Limited               | Primary API       |

---

## 🔹 Common Patterns

### 1. Worker Pool

* Spawn multiple workers dynamically
* Use Registry for lookup

---

### 2. Per-Request Process

* Spawn process per job/request
* Auto cleanup on completion

---

### 3. Sharding

* Multiple DynamicSupervisors
* Distribute load across them

---

## 🔹 Limitations / Pitfalls

* No built-in load balancing
* Can become bottleneck if:

  * Too many children
  * High churn rate
* Requires external tracking (Registry/ETS)

---

## 🔹 Best Practices

* Use `Registry` to track processes
* Avoid long-running blocking work inside children
* Prefer `:transient` restart for jobs
* Monitor system using `:observer`

---

## 🔹 Interview Questions

* What is DynamicSupervisor?
* Difference vs Supervisor?
* When would you use it?
* How are children started?
* What happens when a child crashes?
* Can it become a bottleneck?
* How do you scale it?

---

## 🔥 Deep Dive Questions (Senior)

* How does DynamicSupervisor track children internally?
* What happens if DynamicSupervisor crashes?
* How would you distribute load across multiple DynamicSupervisors?
* How do you avoid mailbox overload in high churn systems?

---

## 🎯 One-liner (Interview Ready)

> "DynamicSupervisor is used to manage dynamically created processes at runtime, where the number and lifecycle of children are not known in advance, providing fault tolerance with minimal overhead."

---
