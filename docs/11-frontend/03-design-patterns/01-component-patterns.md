# Component Patterns

Reusable patterns for composing UI components. Most examples use React but the concepts apply across frameworks.

## Container / Presentational (Smart / Dumb)

Separate data-fetching and business logic ("container") from rendering ("presentational"). Presentational components are pure functions of props.

```tsx
// Presentational — no side effects, easy to test
function UserCard({ name, avatar, email }: UserCardProps) {
  return (
    <div className="card">
      <img src={avatar} alt={name} />
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}

// Container — owns data fetching and state
function UserCardContainer({ userId }: { userId: number }) {
  const { data, isLoading } = useUser(userId);
  if (isLoading) return <Skeleton />;
  return <UserCard {...data} />;
}
```

## Higher-Order Components (HOC)

A function that takes a component and returns an enhanced component. Used for cross-cutting concerns: auth, logging, theming.

```tsx
function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" />;
    return <WrappedComponent {...props} />;
  };
}

const ProtectedDashboard = withAuth(Dashboard);
```

HOCs compose with each other: `const Component = withAuth(withTheme(withLogger(Base)))`.

## Render Props

Pass rendering responsibility to the consumer via a prop that is a function. Enables logic sharing without inheritance.

```tsx
interface MousePosition { x: number; y: number }

function MouseTracker({ render }: { render: (pos: MousePosition) => JSX.Element }) {
  const [pos, setPos] = useState<MousePosition>({ x: 0, y: 0 });
  return (
    <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
      {render(pos)}
    </div>
  );
}

// Consumer decides what to render
<MouseTracker render={({ x, y }) => <div>Mouse at {x}, {y}</div>} />
```

Custom hooks have largely superseded render props for logic sharing, but the pattern remains useful for rendering-specific customisation.

## Compound Components

A group of components that share state implicitly. The parent holds state; children are slots that can read it via context.

```tsx
const TabsContext = createContext<TabsContextType | null>(null);

function Tabs({ defaultTab, children }: TabsProps) {
  const [active, setActive] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      {children}
    </TabsContext.Provider>
  );
}

Tabs.List = function TabList({ children }: { children: ReactNode }) {
  return <div role="tablist">{children}</div>;
};

Tabs.Tab = function Tab({ value, children }: TabProps) {
  const { active, setActive } = useContext(TabsContext)!;
  return (
    <button role="tab" aria-selected={active === value} onClick={() => setActive(value)}>
      {children}
    </button>
  );
};

// Usage — flexible structure, shared state
<Tabs defaultTab="profile">
  <Tabs.List>
    <Tabs.Tab value="profile">Profile</Tabs.Tab>
    <Tabs.Tab value="settings">Settings</Tabs.Tab>
  </Tabs.List>
</Tabs>
```

## Custom Hooks

Extract stateful logic into a reusable hook. The modern alternative to render props and HOCs for logic sharing.

```tsx
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}
```

## Interview Questions

**Q: What problem does the Container / Presentational pattern solve?**
It separates concerns: presentational components are pure, predictable, and easy to test and reuse. Containers own side effects and data. This separation also makes it easy to swap data sources (mock in tests, real API in production) without changing UI code.

**Q: When would you use a HOC vs a custom hook?**
Custom hooks are the preferred modern approach — they're simpler, composable, and don't add wrapper components to the tree. Use HOCs when you need to wrap a component with JSX (e.g., add a `<div>` around it, inject a prop imperatively) or when working with class components that can't use hooks.

**Q: What is the "prop drilling" problem and how do compound components help?**
Prop drilling is passing props through many intermediate components just to reach a deeply nested consumer. Compound components share state via context, so consumers at any depth can read it without intermediate components needing to know about it.
