# PubSub: Topics, Broadcasts, Real-Time Patterns

Phoenix PubSub supports broadcasting messages to subscribers, enabling real-time updates across processes (and across nodes with the right setup).

## Core Concepts

- **Topic**: a string-like identifier representing a broadcast channel.
- **Subscribe**: a process registers interest in a topic.
- **Broadcast**: publish a message to all subscribers of a topic.
- **Fan-out**: one message goes to many processes.

## Practical Notes

- Choose topic naming conventions that encode scoping, such as `user:123` or `order:456`.
- Treat PubSub as an event bus for notifications, not as a source of truth.
- Keep payloads small and pass IDs; fetch heavy data separately if needed.

## Setup — Already Included in Phoenix

Phoenix apps include PubSub in the supervision tree automatically:

```elixir
# lib/my_app/application.ex
children = [
  MyApp.Repo,
  {Phoenix.PubSub, name: MyApp.PubSub},   # ← PubSub supervisor
  MyAppWeb.Endpoint,
]
```

## Subscribe and Broadcast — Core API

```elixir
# Subscribe the calling process to a topic
Phoenix.PubSub.subscribe(MyApp.PubSub, "orders:123")

# Broadcast to all subscribers of a topic
Phoenix.PubSub.broadcast(MyApp.PubSub, "orders:123", {:order_updated, order})

# Broadcast from any process — subscribers receive it as a plain message
# In a GenServer that subscribed:
def handle_info({:order_updated, order}, state) do
  # React to the event
  {:noreply, %{state | order: order}}
end
```

## Topic Naming Conventions

```elixir
# Scope by entity type + ID
"user:#{user_id}"          # e.g. "user:42"
"order:#{order_id}"        # e.g. "order:99"
"room:#{room_id}"          # e.g. "room:lobby"

# Broadcast-to-all channels
"notifications:all"
"system:alerts"

# Tenant-scoped topics
"tenant:#{org_id}:orders"
```

## PubSub with LiveView — Most Common Pattern

LiveView can subscribe and react to PubSub events automatically:

```elixir
defmodule MyAppWeb.OrderLive do
  use MyAppWeb, :live_view

  def mount(%{"id" => id}, _session, socket) do
    order = MyApp.Orders.get_order!(id)

    # Subscribe to updates for this order
    if connected?(socket) do     # only subscribe for WebSocket connections, not SSR
      Phoenix.PubSub.subscribe(MyApp.PubSub, "order:#{id}")
    end

    {:ok, assign(socket, order: order)}
  end

  # Called when a PubSub message arrives for the subscribed topic
  def handle_info({:order_updated, updated_order}, socket) do
    {:noreply, assign(socket, order: updated_order)}
  end

  def handle_info({:order_cancelled, _}, socket) do
    {:noreply, push_navigate(socket, to: ~p"/orders")}
  end
end
```

## Broadcasting from a Context or Webhook

```elixir
defmodule MyApp.Orders do
  alias MyApp.Repo
  alias MyApp.Order

  def update_order(order, params) do
    result =
      order
      |> Order.changeset(params)
      |> Repo.update()

    case result do
      {:ok, updated_order} ->
        # Notify all subscribers (LiveViews, channels, GenServers)
        Phoenix.PubSub.broadcast(MyApp.PubSub, "order:#{updated_order.id}", {:order_updated, updated_order})
        {:ok, updated_order}

      {:error, changeset} ->
        {:error, changeset}
    end
  end
end
```

## local_broadcast vs broadcast

```elixir
# broadcast — sends to all nodes in the cluster (through the PubSub adapter)
Phoenix.PubSub.broadcast(MyApp.PubSub, topic, message)

# local_broadcast — sends only to subscribers on the current node
Phoenix.PubSub.local_broadcast(MyApp.PubSub, topic, message)
```

Use `local_broadcast` when:
- You know all relevant subscribers are on the same node
- You want to avoid cross-node overhead for node-local events

## PubSub vs Phoenix Channels

| | PubSub | Channels |
|---|--------|----------|
| Direction | Server → subscriber processes | Bidirectional (client ↔ server) |
| Client | Any BEAM process | Browser/mobile JS client |
| Transport | In-process messages | WebSocket |
| Use case | Server-side fan-out | Real-time client communication |

Channels use PubSub under the hood for broadcasting to multiple connected clients.

## Common Questions (With Answers)

1. **What is PubSub used for in Phoenix?**
   Broadcasting events so multiple processes can react, often used for LiveView updates, presence, and real-time notifications.

2. **What is a topic?**
   A logical channel name that groups subscribers and broadcasts.

3. **What should you send in a PubSub payload?**
   Typically a small message with IDs and minimal context. Avoid huge payloads that cause memory and serialization overhead.

4. **Is PubSub guaranteed delivery?**
   It is best-effort within the cluster and depends on runtime health. Don’t use it as a durable queue.

5. **What’s the difference between PubSub and a job queue?**
   PubSub notifies subscribers now; a job queue provides durable, retryable work processing with acknowledgements.

## Advanced Questions (With Answers)

1. **What’s a common pitfall when broadcasting too much?**
   You can overwhelm subscribers, create mailbox growth, and trigger latency spikes. Add throttling and coalescing where needed.

2. **How does PubSub interact with clustering?**
   Cross-node PubSub requires appropriate adapters and reliable clustering. Partitions can cause missed broadcasts and inconsistent UI updates.

3. **How do you debug “some clients don’t get updates”?**
   Check topic naming, subscribe lifecycle, node connectivity, PubSub adapter configuration, and whether the subscriber process is overloaded.

4. **What’s a safe pattern for “refresh data” events?**
   Broadcast an event containing IDs and a version/nonce, then each subscriber fetches or recomputes data locally with caching.

5. **When should you use an external broker instead of PubSub?**
   When you need durability, replay, cross-system integration, or strong delivery semantics (Kafka, RabbitMQ, etc.).
