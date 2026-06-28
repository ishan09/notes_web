# State Management Patterns

## Types of State

| Category | Examples | Where to keep it |
|---|---|---|
| **Local UI state** | modal open, input value, hover | Component `useState` |
| **Shared UI state** | current user, theme, locale | Context or global store |
| **Server state** | fetched data, loading/error flags | React Query / SWR / Apollo |
| **URL state** | filters, page, selected tab | URL params / router |
| **Form state** | field values, validation | react-hook-form / Formik |

## Lifting State Up

When two sibling components need the same state, move it to their nearest common ancestor and pass it down as props.

```tsx
function App() {
  const [query, setQuery] = useState('');   // lifted here
  return (
    <>
      <SearchBar value={query} onChange={setQuery} />
      <ResultsList query={query} />
    </>
  );
}
```

## Context API — When and How

Context avoids prop drilling for truly global data. It is NOT a state management library — it's a dependency injection mechanism.

```tsx
const ThemeContext = createContext<Theme>(defaultTheme);

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Consumer — only re-renders when ThemeContext value changes
function Button() {
  const { theme } = useContext(ThemeContext);
  return <button className={theme}>Click</button>;
}
```

**Context performance pitfall**: every context value change re-renders all consumers. Split contexts by update frequency (e.g. separate `ThemeContext` and `UserContext`).

## Flux / Redux Pattern

Unidirectional data flow: `Action → Dispatcher → Store → View → Action`.

Core principles:
1. **Single source of truth** — one store holds all app state
2. **State is read-only** — only actions can trigger changes
3. **Pure reducer functions** — `(state, action) => newState`

```ts
// Reducer — pure function, no side effects
function counterReducer(state = 0, action: CounterAction): number {
  switch (action.type) {
    case 'INCREMENT': return state + 1;
    case 'DECREMENT': return state - 1;
    case 'RESET':     return 0;
    default:          return state;
  }
}

// Action creators
const increment = () => ({ type: 'INCREMENT' } as const);
const decrement = () => ({ type: 'DECREMENT' } as const);
```

## Redux Toolkit (RTK) — Modern Redux

```ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const fetchUser = createAsyncThunk('users/fetch', async (id: number) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});

const usersSlice = createSlice({
  name: 'users',
  initialState: { list: [], loading: false } as UsersState,
  reducers: {
    addUser(state, action: PayloadAction<User>) {
      state.list.push(action.payload);  // Immer allows "mutations"
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchUser.pending,   state => { state.loading = true; })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.list.push(action.payload);
      });
  },
});
```

## Server State with React Query

Server state (fetched data) has different concerns from client state: caching, background refetching, stale-while-revalidate.

```tsx
function UserProfile({ id }: { id: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
    staleTime: 5 * 60 * 1000,   // 5 min before considered stale
  });

  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', id] }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <UserCard user={data} onSave={mutation.mutate} />;
}
```

## Interview Questions

**Q: When should you reach for a global state manager (Redux) vs the Context API?**
Use Context for slow-changing, truly global data (theme, locale, current user). Use an external store (Redux, Zustand) when you have complex state transitions, need middleware (logging, async side effects), many frequent updates, or developer tooling (time-travel debugging). Context re-renders all consumers on every update; Redux lets components subscribe to specific slices.

**Q: What is the difference between client state and server state?**
Client state is UI-only data that lives in the browser (modal open, theme). Server state is an async, remote snapshot that can go stale, needs caching, and must stay in sync with the backend. Libraries like React Query manage server state with built-in caching, background refetching, and deduplication.

**Q: What makes a reducer "pure"?**
A pure reducer has no side effects and is deterministic: given the same `(state, action)` inputs it always returns the same new state. It never mutates the existing state, makes API calls, or uses random values. Redux relies on this to enable time-travel debugging and predictable state transitions.
