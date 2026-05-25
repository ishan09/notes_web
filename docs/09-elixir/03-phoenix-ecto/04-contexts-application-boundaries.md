# Contexts and Application Boundaries

Phoenix contexts are a common way to organize business logic around capabilities instead of technical layers.

## Core Concepts

- **Context modules** expose the public API of a domain area
- **Boundaries** isolate business logic from controllers and views
- **Internal modules** handle lower-level implementation details
- **Explicit APIs** make the application easier to test and refactor
- **Stable interfaces** reduce coupling between web layer, jobs, and domain logic

## Why It Matters

- Prevents controllers from becoming dumping grounds
- Makes the application easier to evolve
- Supports cleaner testing and dependency management

## Practical Notes

- Contexts are about capabilities (for example `Accounts`, `Billing`) rather than technical layers.
- Keep Ecto schema modules and query helpers internal; expose intent-focused functions.
- Avoid passing `conn` or Phoenix-specific types into contexts.

## Example: What a Context Looks Like

```elixir
# lib/my_app/accounts.ex — the PUBLIC API for the Accounts domain
defmodule MyApp.Accounts do
  alias MyApp.Repo
  alias MyApp.Accounts.User    # internal schema — callers don't need to know this

  # Public functions — stable interface for controllers, jobs, other contexts
  def get_user(id), do: Repo.get(User, id)
  def get_user!(id), do: Repo.get!(User, id)
  def get_user_by_email(email), do: Repo.get_by(User, email: email)

  def list_users(opts \\ []) do
    User
    |> apply_filters(opts)
    |> Repo.all()
  end

  def create_user(attrs) do
    %User{}
    |> User.creation_changeset(attrs)
    |> Repo.insert()
  end

  def update_user(%User{} = user, attrs) do
    user
    |> User.update_changeset(attrs)
    |> Repo.update()
  end

  def delete_user(%User{} = user), do: Repo.delete(user)

  def authenticate_user(email, password) do
    user = get_user_by_email(email)
    with %User{} <- user,
         true <- Bcrypt.verify_pass(password, user.hashed_password) do
      {:ok, user}
    else
      _ -> {:error, :invalid_credentials}
    end
  end

  # Private — internal implementation detail, callers never see this
  defp apply_filters(query, opts) do
    Enum.reduce(opts, query, fn
      {:active, true}, q -> where(q, [u], u.active == true)
      {:role, role}, q -> where(q, [u], u.role == ^role)
      _, q -> q
    end)
  end
end
```

```elixir
# lib/my_app/accounts/user.ex — internal schema (NOT part of the public API)
defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :name, :string
    field :email, :string
    field :hashed_password, :string
    field :role, Ecto.Enum, values: [:user, :admin]
    field :active, :boolean, default: true
    timestamps()
  end

  def creation_changeset(user, attrs) do
    user
    |> cast(attrs, [:name, :email, :password])
    |> validate_required([:name, :email, :password])
    |> validate_format(:email, ~r/@/)
    |> unique_constraint(:email)
    |> put_hashed_password()
  end

  def update_changeset(user, attrs) do
    user
    |> cast(attrs, [:name, :email])
    |> validate_required([:name, :email])
    |> validate_format(:email, ~r/@/)
    |> unique_constraint(:email)
  end

  defp put_hashed_password(changeset) do
    case get_change(changeset, :password) do
      nil -> changeset
      password -> put_change(changeset, :hashed_password, Bcrypt.hash_pwd_salt(password))
    end
  end
end
```

## Controller Using the Context

```elixir
# Controller stays thin — just adapts HTTP to context calls
def create(conn, %{"user" => params}) do
  case MyApp.Accounts.create_user(params) do   # calls context, not Repo directly
    {:ok, user}       -> render(conn, :show, user: user)
    {:error, changeset} -> render(conn, :error, changeset: changeset)
  end
end
```

## Common Questions (With Answers)

1. **What is a Phoenix context?**
   A domain-focused module boundary that exposes a public API for a capability area and hides internal implementation details.

2. **Why is it better than putting all logic in controllers?**
   It makes business logic reusable outside HTTP (jobs, CLI tasks) and easier to test, and keeps the web layer thin.

3. **What should a context function return?**
   Typically tagged tuples like `{:ok, result}` / `{:error, changeset}` so callers can handle success/failure consistently.

4. **Where should validation live?**
   In changesets and context-level functions that enforce invariants, not in controllers.

5. **How do contexts help refactoring?**
   They create stable seams. You can restructure schemas or persistence details without changing controller code.

## Advanced Questions (With Answers)

1. **What’s a sign you have “leaky contexts”?**
   Controllers need to know too much about schema fields, query details, or changeset internals to do their job.

2. **How do you avoid “god contexts”?**
   Split by domain capabilities and keep public APIs small. If a context grows too large, extract subdomains or internal modules.

3. **How do contexts interact with background jobs (Oban)?**
   Jobs should call context functions, not reach directly into schemas/Repo. This keeps the job layer thin and reuse high.

4. **How do you handle cross-context workflows?**
   Use a higher-level orchestrator module or a dedicated boundary that composes context APIs, often using transactions where needed.

5. **Why should contexts avoid returning raw DB structs everywhere?**
   It can over-couple callers to persistence. Sometimes returning structs is fine, but keep the API intent-focused and stable.
