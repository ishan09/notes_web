# LiveView and Real-Time UI

Phoenix LiveView lets you build interactive user interfaces with server-rendered HTML and persistent connections.

## Core Concepts

- **Stateful server-side UI** with minimal client-side JavaScript
- **Events** are sent from the browser to the server
- **Diffs** update only the changed parts of the page
- **PubSub** helps broadcast updates to multiple clients

## How LiveView Works

```
Browser                        Server (LiveView Process)
  │                                      │
  ├── HTTP request ──────────────────── mount/2 called
  │   (initial render)                   │  (initial state assigned)
  │◄─── Full HTML ──────────────────── render/1 called
  │                                      │
  ├── WebSocket upgrade ────────────── connected
  │                                      │
  ├── User event (click/input) ───────► handle_event/3
  │                                      │  (state updated)
  │◄── DOM diff only ──────────────── render/1 called
  │                                      │  (only changed parts sent)
```

Each LiveView is a **stateful BEAM process**. State lives in the process. When the process crashes, LiveView automatically reconnects and re-mounts — the user sees a seamless reload.

## State Maintenance

State is held in the LiveView process `socket.assigns`. The framework calls `render/1` after every state change and computes a minimal diff. The diff (not full HTML) is sent over the WebSocket.

## DOM Updates

LiveView sends **morphdom-compatible diffs** — a compact representation of only the changed nodes. The `liveview.js` client library applies these diffs to the real DOM. This means a single button click sends bytes, not full page HTML.

## Why It Matters

- Faster development for interactive apps
- Less duplication between front-end and back-end logic
- A good fit for dashboards, admin tools, and real-time workflows
- No need for a separate API or client-side state management library

## Common Questions (With Answers)

1. **What is LiveView?**
   LiveView is a Phoenix library that lets you build interactive, real-time UIs with server-rendered HTML over a persistent WebSocket connection. The server holds state; the client only renders diffs.

2. **How does it differ from traditional Phoenix?**
   Traditional Phoenix is stateless request/response. LiveView maintains a stateful server-side process per connected client and pushes DOM updates over WebSocket without full page reloads.

3. **How does it avoid writing JS?**
   The `liveview.js` client library handles WebSocket lifecycle and DOM patching automatically. You write only Elixir for interactivity — events, state changes, and rendering all happen server-side.

4. **How are DOM updates sent?**
   As minimal diffs over the WebSocket. LiveView tracks which parts of the rendered template changed and sends only those parts. The client applies them with morphdom-style patching.

5. **What happens if a LiveView process crashes?**
   The client automatically reconnects and triggers a fresh `mount/2`. The user sees the page reload. Because BEAM processes are isolated, the crash doesn’t affect other connected clients or other parts of the app.

6. **How is state maintained?**
   In `socket.assigns` inside the LiveView process. The process lives for the duration of the WebSocket connection. State is lost if the process terminates — you re-initialize in `mount/2`.

7. **What problem does LiveView solve?**
   It enables interactive UIs with server-rendered HTML and minimal client JS, reducing duplication between front-end and back-end.

8. **How do you broadcast updates to multiple LiveViews?**
   Subscribe to a PubSub topic in `mount/2` and handle incoming messages with `handle_info/2`, then update assigns to trigger a re-render.

## Advanced Questions (With Answers)

1. **When would you still prefer a client-heavy JavaScript approach?**
   When you need offline support, heavy client-side computation, complex browser APIs (canvas, WebRTC), or when the latency of a server round-trip per interaction is unacceptable.

2. **What’s a key capacity planning concern with LiveView?**
   Each connected client holds server-side state (a process with memory). You must plan memory and CPU for concurrent connections — LiveView apps have higher per-user resource cost than stateless HTTP APIs.

3. **How do you avoid doing slow work on user event handlers?**
   Offload to background jobs or separate processes, keep `handle_event/3` fast, and update the UI asynchronously by sending messages to `self()` and handling them in `handle_info/2`.

4. **What’s a pitfall with PubSub and LiveView under clustering?**
   PubSub delivery across nodes depends on your adapter and cluster health; partitions or misconfigurations can cause missing updates. Use Phoenix.PubSub with a distributed adapter (like Redis) for multi-node setups.

5. **What is a good rule for LiveView state size?**
   Keep `socket.assigns` small and derived. Store IDs and minimal computed data; fetch or compute heavy data on demand with caching strategies where appropriate. Large assigns increase memory per connection and slow diffs.


# Phoenix LiveView — `handle_info/2` (Interview Write-up)

---

## 🔹 What is `handle_info/2` in LiveView?

`handle_info/2` is a callback used to **handle asynchronous messages** sent to the LiveView process.

👉 Just like GenServer:

* LiveView is a **process**
* It has a **mailbox**
* `handle_info` handles **non-UI messages**

---

## 🔹 When is `handle_info/2` used?

Use it when:

* Receiving messages via `send/2`
* Handling `:DOWN` (monitoring)
* Receiving PubSub events
* Handling Task results
* Timers (`Process.send_after`)

---

## 🔹 Function Signature

```elixir
def handle_info(message, socket) do
  {:noreply, socket}
end
```

---

## 🔹 Key Differences vs GenServer

| Aspect  | GenServer           | LiveView             |
| ------- | ------------------- | -------------------- |
| State   | `state`             | `socket.assigns`     |
| Return  | `{:noreply, state}` | `{:noreply, socket}` |
| Purpose | Backend logic       | UI + state           |

---

## 🔹 Basic Example (Manual Message)

```elixir
def mount(_params, _session, socket) do
  send(self(), :load_data)
  {:ok, socket}
end

def handle_info(:load_data, socket) do
  {:noreply, assign(socket, :data, fetch_data())}
end
```

👉 Common pattern:

* Trigger async work in `mount`
* Handle in `handle_info`

---

## 🔹 Timer Example

```elixir
def mount(_, _, socket) do
  Process.send_after(self(), :tick, 1000)
  {:ok, assign(socket, count: 0)}
end

def handle_info(:tick, socket) do
  Process.send_after(self(), :tick, 1000)

  {:noreply, update(socket, :count, &(&1 + 1))}
end
```

---

## 🔹 PubSub Example

```elixir
def mount(_, _, socket) do
  Phoenix.PubSub.subscribe(MyApp.PubSub, "updates")
  {:ok, socket}
end

def handle_info({:update, data}, socket) do
  {:noreply, assign(socket, :data, data)}
end
```

👉 Used for real-time updates

---

## 🔹 Task Integration (Important)

```elixir
def mount(_, _, socket) do
  task =
    Task.async(fn ->
      heavy_work()
    end)

  {:ok, assign(socket, task_ref: task.ref)}
end
```

---

### Handle success

```elixir
def handle_info({ref, result}, socket) do
  Process.demonitor(ref, [:flush])

  {:noreply, assign(socket, :result, result)}
end
```

---

### Handle failure

```elixir
def handle_info({:DOWN, ref, :process, _pid, reason}, socket) do
  {:noreply, assign(socket, :error, reason)}
end
```

---

## 🔹 Monitoring Example

```elixir
def mount(_, _, socket) do
  pid = spawn(fn -> Process.sleep(1000) end)
  ref = Process.monitor(pid)

  {:ok, assign(socket, ref: ref)}
end

def handle_info({:DOWN, ref, :process, _pid, reason}, socket) do
  {:noreply, assign(socket, :status, {:down, reason})}
end
```

---

## 🔹 Internal Flow (Interview Insight)

1. LiveView runs as a BEAM process
2. Messages arrive in mailbox
3. Phoenix invokes `handle_info/2`
4. State updated via `socket`
5. Diff is sent to client

---

## 🔹 Important Notes

* `handle_info` is **async**
* Does NOT trigger directly from UI events
* UI events use:

  * `handle_event/3`

---

## 🔹 handle_info vs handle_event

| Function     | Trigger                  |
| ------------ | ------------------------ |
| handle_event | UI (click, form, etc.)   |
| handle_info  | Internal/system messages |

---

## 🔹 Common Pitfalls

* Not matching `ref` → wrong task handling
* Forgetting `Process.demonitor` → stale messages
* Doing heavy work inside `handle_info` → blocks UI
* Ignoring `:DOWN` → hidden failures

---

## 🔹 Best Practices

* Keep `handle_info` lightweight
* Offload heavy work to Tasks
* Always handle both success + failure
* Use PubSub for external events
* Use timers carefully (avoid loops without control)

---

## 🔹 Interview Questions

* What is `handle_info` in LiveView?
* Difference between `handle_event` and `handle_info`?
* How do you handle async tasks in LiveView?
* How do you handle failures?

---

## 🔥 Deep Dive (Senior Level)

* What happens if LiveView process crashes?
* How does LiveView handle mailbox backlog?
* How are diffs calculated after `handle_info`?

---

## 🎯 One-liner (Interview Ready)

> "`handle_info/2` in LiveView handles asynchronous messages sent to the LiveView process, enabling background work, PubSub updates, and task handling without blocking UI interactions."

---
