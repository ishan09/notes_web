# MVC: Controllers, Views, Templates

Phoenix historically used a classic MVC structure (controllers, views, templates). Newer Phoenix versions emphasize function components, but the underlying idea remains: controllers adapt requests, and rendering is separated from domain logic.

## Core Concepts

- **Controllers**: parse request input, call contexts, choose response format.
- **Views/Templates or Components**: render responses (HTML, JSON) based on data.
- **Separation**: domain logic belongs in contexts, not in templates or controllers.

## Practical Notes

- Keep controllers as thin adapters.
- Avoid putting complex logic in templates; precompute in contexts or dedicated presenter modules.
- Be consistent in error handling and return shapes (commonly `{:ok, result}` / `{:error, reason}`).

## A Real Controller (JSON API)

```elixir
defmodule MyAppWeb.UserController do
  use MyAppWeb, :controller

  alias MyApp.Accounts

  # GET /api/users
  def index(conn, params) do
    users = Accounts.list_users(params)
    render(conn, :index, users: users)
  end

  # GET /api/users/:id
  def show(conn, %{"id" => id}) do
    case Accounts.get_user(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> put_view(json: MyAppWeb.ErrorJSON)
        |> render(:"404")

      user ->
        render(conn, :show, user: user)
    end
  end

  # POST /api/users
  def create(conn, %{"user" => user_params}) do
    case Accounts.create_user(user_params) do
      {:ok, user} ->
        conn
        |> put_status(:created)
        |> put_resp_header("location", ~p"/api/users/#{user}")
        |> render(:show, user: user)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> put_view(json: MyAppWeb.ChangesetJSON)
        |> render(:error, changeset: changeset)
    end
  end

  # PATCH /api/users/:id
  def update(conn, %{"id" => id, "user" => user_params}) do
    user = Accounts.get_user!(id)

    case Accounts.update_user(user, user_params) do
      {:ok, updated_user} -> render(conn, :show, user: updated_user)
      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> put_view(json: MyAppWeb.ChangesetJSON)
        |> render(:error, changeset: changeset)
    end
  end

  # DELETE /api/users/:id
  def delete(conn, %{"id" => id}) do
    user = Accounts.get_user!(id)
    {:ok, _} = Accounts.delete_user(user)
    send_resp(conn, :no_content, "")
  end
end
```

## JSON View Module (Phoenix 1.7+)

```elixir
defmodule MyAppWeb.UserJSON do
  alias MyApp.Accounts.User

  # Renders a list of users
  def index(%{users: users}) do
    %{data: Enum.map(users, &data/1)}
  end

  # Renders a single user
  def show(%{user: user}) do
    %{data: data(user)}
  end

  # Private — defines the shape of a user in JSON
  defp data(%User{} = user) do
    %{
      id: user.id,
      name: user.name,
      email: user.email,
      inserted_at: user.inserted_at,
    }
  end
end
```

## Changeset Error Rendering

```elixir
defmodule MyAppWeb.ChangesetJSON do
  def error(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)}
  end

  defp translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", to_string(value))
    end)
  end
end
# Response: {"errors": {"email": ["has already been taken"], "name": ["can't be blank"]}}
```

## HTML Controller with Template

```elixir
defmodule MyAppWeb.PageController do
  use MyAppWeb, :controller

  def home(conn, _params) do
    # Assigns are available in the template as @variable
    render(conn, :home, page_title: "Home", recent_posts: Blog.recent_posts())
  end
end
```

```heex
<%# lib/my_app_web/controllers/page_html/home.html.heex %>
<h1><%= @page_title %></h1>
<ul>
  <%= for post <- @recent_posts do %>
    <li><%= post.title %></li>
  <% end %>
</ul>
```

## Router — Connecting URLs to Controllers

```elixir
# lib/my_app_web/router.ex
scope "/api", MyAppWeb do
  pipe_through :api

  resources "/users", UserController, only: [:index, :show, :create, :update, :delete]
  # Generates: GET /api/users, GET /api/users/:id, POST /api/users,
  #            PATCH /api/users/:id, DELETE /api/users/:id
end

scope "/", MyAppWeb do
  pipe_through :browser
  get "/", PageController, :home
  get "/about", PageController, :about
end
```

## Common Questions (With Answers)

1. **What is MVC in Phoenix?**
   A separation where controllers handle request/response, and views/templates (or components) handle rendering, while business logic stays in contexts.

2. **Why should templates be “dumb”?**
   It keeps rendering predictable and prevents hard-to-test business logic from creeping into the presentation layer.

3. **Where should you format JSON responses?**
   In a dedicated rendering layer (views/components) so controllers remain thin and consistent.

4. **How should controllers handle validation failures?**
   By delegating to contexts that return `{:error, changeset}`, then rendering errors consistently at the boundary.

5. **What’s a common controller anti-pattern?**
   Controllers doing multi-step domain workflows, direct Repo calls, and ad hoc permission logic. Move that into contexts.

6. **Difference between `render` and `json`?**
   `render/2` renders a named template through the view layer — it can produce HTML or JSON depending on the template. `json/2` is a shortcut that directly encodes a map/list as a JSON response, bypassing the view module entirely. Use `json/2` for simple API responses; use `render/2` with a view for structured responses that benefit from a dedicated rendering layer.

7. **How does Phoenix resolve view modules?**
   By convention: a controller named `MyApp.UserController` resolves to `MyApp.UserView` (or `MyApp.UserHTML`/`MyApp.UserJSON` in newer Phoenix). The framework derives the view module name automatically from the controller name.

8. **What happens if a template is missing?**
   Phoenix raises a compile-time error for EEx templates at application startup, or a runtime `Phoenix.Template.UndefinedError` if templates are loaded dynamically.

## Advanced Questions (With Answers)

1. **How do you avoid leaking persistence details into the view layer?**
   Render from domain-friendly data shapes and context results, not raw query details. Keep query logic inside contexts.

2. **What’s a pragmatic approach to versioned APIs in Phoenix?**
   Version routes and keep context APIs stable; avoid copying business logic per version. Translate formats at the boundary.

3. **Why are consistent error shapes important for APIs?**
   They reduce client complexity and simplify retries and observability by making failures machine-parseable.

4. **How do you keep HTML rendering fast?**
   Avoid N+1 data fetching, keep templates simple, cache stable fragments where appropriate, and avoid large per-request computations.

5. **How do component-based rendering and “views” relate?**
   Components replace some view responsibilities, but the architectural goal remains: keep rendering separate from domain logic.
