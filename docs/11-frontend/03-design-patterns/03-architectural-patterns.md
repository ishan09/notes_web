# Architectural Patterns

## MVC (Model-View-Controller)

Classic pattern: separates data (Model), presentation (View), and user-interaction handling (Controller).

```
User → Controller → Model → View → User
```

- **Model**: business data and logic (`UserModel.save()`)
- **View**: renders data, fires events
- **Controller**: handles events, updates Model, selects View

In early web frameworks (Backbone.js, Angular 1), MVC was explicit. In modern component-based frameworks, the boundaries blur — a component often contains all three.

## MVP (Model-View-Presenter)

Variation where the View is completely passive — it only delegates to the Presenter.

```
View <-> Presenter <-> Model
```

The Presenter retrieves data from the Model and formats it for the View. The View knows nothing about the Model. Common in Android development and testable UI patterns.

## MVVM (Model-View-ViewModel)

The ViewModel exposes streams / observables that the View binds to automatically. The View never directly calls ViewModel methods for data — it binds.

```
Model <-> ViewModel <-> View (data binding)
```

Used by: Angular (two-way binding), Vue, Knockout. React with hooks is closer to MVVM than MVC because the component's state (ViewModel-ish) drives the render (View).

```ts
// ViewModel (React hook as ViewModel)
function useLoginViewModel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({ mutationFn: login });

  return {
    email, setEmail,
    password, setPassword,
    submit: () => mutation.mutate({ email, password }),
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// View — only renders, delegates to ViewModel
function LoginForm() {
  const vm = useLoginViewModel();
  return (
    <form onSubmit={e => { e.preventDefault(); vm.submit(); }}>
      <input value={vm.email} onChange={e => vm.setEmail(e.target.value)} />
      ...
    </form>
  );
}
```

## Flux Architecture

Introduced by Facebook to address MVC's bidirectional data flow problems in large apps. Data flows in one direction only.

```
Action → Dispatcher → Store → View → (new Action)
```

- **Action**: plain object describing what happened `{ type: 'ADD_TODO', payload: ... }`
- **Dispatcher**: broadcasts actions to all registered stores
- **Store**: holds state, updates itself in response to actions, emits change events
- **View**: re-renders from store, dispatches new actions on user interaction

Predictability comes from the invariant: stores can only be updated by actions going through the dispatcher.

## Micro-Frontend Architecture

Split a large SPA into independently deployable frontend applications composed at runtime.

```
Shell App
├── /products  → Products MFE (Team A)
├── /orders    → Orders MFE (Team B)
└── /auth      → Auth MFE (Team C)
```

Implementation options:
- **Module Federation** (webpack 5) — dynamic runtime sharing of modules
- **iframes** — strong isolation, poor UX
- **Web Components** — framework-agnostic, custom elements

Trade-offs:
- ✅ Independent deploys, team autonomy, tech diversity
- ❌ Increased complexity, shared dependency versioning, network overhead

## Island Architecture

Render mostly static HTML server-side; hydrate only interactive "islands" on the client. Used by Astro.

```
[Static HTML][🏝 Interactive React Widget][Static HTML][🏝 Carousel]
```

Most of the page is zero-JS static HTML; only the islands are hydrated. Dramatically reduces JavaScript payload for content-heavy sites.

## Interview Questions

**Q: What problem does Flux solve that MVC doesn't?**
In large MVC apps, a single action can cascade — a Controller updates a Model, which updates a View, which triggers another Model update. This bidirectional flow is hard to trace. Flux enforces strict unidirectional flow: the only way to change state is to dispatch an action, making every state change explicit and traceable.

**Q: How does MVVM differ from MVP?**
In MVP, the Presenter actively calls methods on the View interface. In MVVM, the ViewModel exposes observable state and the View binds to it automatically — the ViewModel has no reference to the View at all. MVVM is more declarative and better suited to reactive frameworks.

**Q: What is the main trade-off of micro-frontends?**
Autonomy vs complexity. Teams can deploy independently and choose their own tech stack, which scales team ownership. The cost is coordination overhead: shared dependencies can have version conflicts, runtime composition adds latency, and cross-MFE communication needs careful design to avoid tight coupling.
