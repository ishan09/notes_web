# Testing with ExUnit

ExUnit is Elixir's built-in testing framework. It is lightweight, expressive, and a natural fit for functional code.

## Core Concepts

- `describe` blocks organize related tests
- `setup` prepares shared test data
- Assertions verify expected outcomes
- Async tests can run in parallel when safe
- Mocks and stubs help isolate external dependencies

## Basic Test Structure

```elixir
defmodule MyApp.AccountsTest do
  use ExUnit.Case, async: true   # async: true — runs in parallel with other async tests

  # setup runs before EACH test in this module
  setup do
    user = %{id: 1, name: "Alice", email: "alice@example.com", active: true}
    {:ok, user: user}    # returned map is merged into the test context
  end

  describe "deactivate/1" do
    test "deactivates an active user", %{user: user} do
      assert {:ok, updated} = MyApp.Accounts.deactivate(user)
      assert updated.active == false
    end

    test "returns error for already inactive user", %{user: user} do
      inactive = %{user | active: false}
      assert {:error, :already_inactive} = MyApp.Accounts.deactivate(inactive)
    end
  end
end
```

## Key Assertions

```elixir
# Basic equality
assert result == expected

# Pattern match — great for tagged tuples
assert {:ok, %{id: id}} = create_user(params)
assert id != nil

# Refute — inverse of assert
refute user.active

# Exception assertion
assert_raise ArgumentError, fn -> bad_function() end
assert_raise ArgumentError, ~r/invalid/, fn -> bad_function() end

# Message passing assertions (for processes/GenServers)
send(self(), :hello)
assert_received :hello          # checks mailbox NOW (no wait)
assert_receive :hello, 500      # waits up to 500ms

refute_receive :unwanted_msg, 100  # asserts no message arrives within 100ms

# Approximate equality for floats
assert_in_delta 3.14, :math.pi(), 0.01
```

## Testing with Ecto (DataCase)

Phoenix generates a `DataCase` module for DB tests:

```elixir
defmodule MyApp.Accounts.UserTest do
  use MyApp.DataCase   # wraps each test in a DB transaction, rolls back after

  test "creates a user with valid params" do
    params = %{name: "Bob", email: "bob@example.com"}
    assert {:ok, user} = MyApp.Accounts.create_user(params)
    assert user.email == "bob@example.com"
    assert user.id != nil
  end

  test "returns changeset error for missing email" do
    assert {:error, changeset} = MyApp.Accounts.create_user(%{name: "Bob"})
    assert %{email: ["can't be blank"]} = errors_on(changeset)
  end
end
```

`DataCase` uses `Ecto.Adapters.SQL.Sandbox` — each test gets its own DB transaction that's
rolled back at the end, keeping tests isolated without manual cleanup.

## Testing HTTP Endpoints (ConnCase)

```elixir
defmodule MyAppWeb.UserControllerTest do
  use MyAppWeb.ConnCase   # provides conn setup

  setup %{conn: conn} do
    user = insert(:user)    # using ex_machina factory
    token = generate_token(user)
    conn = put_req_header(conn, "authorization", "Bearer #{token}")
    {:ok, conn: conn, user: user}
  end

  test "GET /api/users/:id returns user", %{conn: conn, user: user} do
    response =
      conn
      |> get(~p"/api/users/#{user.id}")  # ~p sigil for verified routes
      |> json_response(200)

    assert response["id"] == user.id
    assert response["email"] == user.email
  end

  test "GET /api/users/:id returns 404 for unknown user", %{conn: conn} do
    conn
    |> get(~p"/api/users/99999")
    |> json_response(404)
  end

  test "requires authentication", %{conn: _conn} do
    # Use a fresh conn without auth header
    build_conn()
    |> get(~p"/api/users/1")
    |> json_response(401)
  end
end
```

## Testing GenServers

```elixir
defmodule MyApp.CacheTest do
  use ExUnit.Case, async: true

  setup do
    # Start a fresh GenServer for each test
    {:ok, pid} = MyApp.Cache.start_link(name: nil)   # no global name = isolated
    {:ok, cache: pid}
  end

  test "stores and retrieves values", %{cache: cache} do
    :ok = MyApp.Cache.put(cache, :key, "value")
    assert {:ok, "value"} = MyApp.Cache.get(cache, :key)
  end

  test "returns error for missing key", %{cache: cache} do
    assert :error = MyApp.Cache.get(cache, :nonexistent)
  end
end
```

Drive the public API — never call `:sys.get_state/1` unless you're specifically testing
internal state for debugging purposes.

## Mocking with Mox

`Mox` is the standard Elixir mocking library. It works by defining behaviour contracts.

```elixir
# 1. Define a behaviour
defmodule MyApp.EmailAdapter do
  @callback send_email(to :: String.t(), subject :: String.t(), body :: String.t()) ::
              {:ok, String.t()} | {:error, term()}
end

# 2. Production implementation
defmodule MyApp.SendgridAdapter do
  @behaviour MyApp.EmailAdapter
  def send_email(to, subject, body), do: Sendgrid.send(to, subject, body)
end

# 3. In config/test.exs — use mock in test env
config :my_app, :email_adapter, MyApp.MockEmailAdapter

# 4. In test_helper.exs
Mox.defmock(MyApp.MockEmailAdapter, for: MyApp.EmailAdapter)

# 5. In tests
defmodule MyApp.NotifierTest do
  use ExUnit.Case, async: true
  import Mox

  # Verify all expectations are called
  setup :verify_on_exit!

  test "sends welcome email after signup" do
    expect(MyApp.MockEmailAdapter, :send_email, fn to, subject, _body ->
      assert to == "user@example.com"
      assert subject =~ "Welcome"
      {:ok, "sent"}
    end)

    MyApp.Accounts.register_user(%{email: "user@example.com", name: "Alice"})
  end
end
```

## Async Safety Rules

```elixir
# SAFE to use async: true when:
use ExUnit.Case, async: true    # pure functions, no shared state
use MyApp.DataCase, async: true # Ecto Sandbox handles DB isolation

# NOT SAFE with async: true when:
# - Writing to global ETS tables without isolation
# - Starting globally named GenServers (name collisions between tests)
# - Using Application.put_env/3 (process-global config)
# - Testing PubSub with global topic names (broadcasts can cross test boundaries)
```

## Common Questions (With Answers)

1. **Why is ExUnit simple but effective?**
   It is built into the language, integrates well with Elixir tooling, and supports the patterns needed for unit and integration testing.

2. **When should tests run asynchronously?**
   When tests are isolated and don’t share mutable external resources (DB, files, global config). If they do, async can create flaky tests.

3. **What kinds of behavior are best covered with integration tests?**
   Boundaries like DB interactions, HTTP endpoints, and message-based workflows where unit tests can miss wiring issues.

4. **How do you test GenServers?**
   Drive the public API and assert replies, side effects, and messages. Avoid reaching into internal state unless absolutely necessary.

5. **What is a common testing mistake in Elixir services?**
   Over-mocking internals. Prefer testing domain outcomes and using integration tests for boundary correctness.

## Advanced Questions (With Answers)

1. **How do you keep tests deterministic with concurrency?**
   Use timeouts intentionally, assert message ordering carefully, use `assert_receive`/`refute_receive`, and avoid relying on timing-based sleeps.

2. **Why do some OTP tests hang?**
   Unhandled messages, blocked `GenServer.call`, or processes that never exit. Use timeouts and ensure proper supervision/cleanup in tests.

3. **How do you test supervision behavior?**
   Start the supervisor tree in the test, induce controlled crashes, and assert restarts or shutdown behavior based on the strategy.

4. **When should you mock external dependencies?**
   When you need fast, deterministic unit tests. Keep a smaller number of integration tests that exercise the real dependency contract.

5. **What’s a good approach to property tests vs example tests?**
   Use example tests for well-known cases and property tests for invariants and transformations where edge cases matter.
