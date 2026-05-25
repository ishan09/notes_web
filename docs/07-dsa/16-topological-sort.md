# Pattern 16: Topological Sort

> **Before you start**: Can you order tasks so every prerequisite comes before the task that needs it? Topological Sort gives a linear ordering of nodes in a directed acyclic graph (DAG) — essential for dependency resolution, course scheduling, and build systems.

---

## What is Topological Sort?

Topological Sort produces a linear ordering of vertices in a **directed acyclic graph (DAG)** such that for every directed edge `u → v`, vertex `u` comes before `v` in the ordering.

**Analogy**: Getting dressed in the morning. Putting on socks must happen before shoes, underwear before pants. Topological Sort finds a valid order to complete all steps given these constraints — and detects if the constraints are contradictory (a cycle means an impossible order).

---

## How It Works

### Approach 1: BFS / Kahn's Algorithm (Iterative)

1. Compute **in-degree** (number of incoming edges) for every vertex.
2. Add all vertices with in-degree 0 to a queue — they have no prerequisites.
3. While queue is not empty:
   a. Dequeue a vertex, add it to the result.
   b. For each of its neighbors, decrement their in-degree.
   c. If a neighbor's in-degree reaches 0, enqueue it.
4. If result size == number of vertices → valid topological order.
5. If result size < number of vertices → **cycle detected** (some vertices never reached in-degree 0).

### Approach 2: DFS (Recursive with reverse post-order)

Do a DFS from each unvisited node. When a node's DFS is fully complete (all descendants visited), push it onto a stack. The stack's reverse is the topological order. If you detect a node in the current path (not just visited, but currently being visited), there's a cycle.

---

## Why This Matters

| Problem Type | Without Topo Sort | With Topo Sort |
|---|---|---|
| Course schedule validation | O(n²) manual check | O(V + E) |
| Build order of packages | Complex recursive logic | O(V + E) BFS/DFS |
| Dependency resolution | Ad hoc | O(V + E) systematic |

V = vertices, E = edges. Topological sort is linear in the graph size.

---

## When to Use

Recognition signals:
- "Find order to take courses with prerequisites"
- "Build system / task scheduling with dependencies"
- "Detect cycles in a directed graph"
- "Find if a set of tasks can be completed"
- "Alien dictionary / reconstruct ordering from comparisons"
- Directed graph where order matters

---

## Trade-offs

| Kahn's (BFS) | DFS |
|---|---|
| Iterative — no stack overflow | Recursive — stack overflow for very deep graphs |
| Cycle detection is natural (result size check) | Cycle detection needs a "currently visiting" state |
| Easy to understand | Produces reverse post-order (need a stack) |
| Good when you need in-degree info anyway | Good when you need DFS order for other purposes |

---

## Core Concepts

### Concept 1: Topological Sort — Kahn's Algorithm (BFS)

```java
public int[] topologicalSort(int numVertices, int[][] edges) {
    // Build adjacency list and in-degree count
    List<List<Integer>> adj = new ArrayList<>();
    int[] inDegree = new int[numVertices];
    for (int i = 0; i < numVertices; i++) adj.add(new ArrayList<>());

    for (int[] edge : edges) {
        adj.get(edge[0]).add(edge[1]);
        inDegree[edge[1]]++;
    }

    // Initialize queue with all in-degree 0 vertices
    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numVertices; i++) {
        if (inDegree[i] == 0) queue.offer(i);
    }

    int[] result = new int[numVertices];
    int idx = 0;

    while (!queue.isEmpty()) {
        int node = queue.poll();
        result[idx++] = node;

        for (int neighbor : adj.get(node)) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] == 0) queue.offer(neighbor);
        }
    }

    // If idx < numVertices, there's a cycle
    return idx == numVertices ? result : new int[0];
}
```

---

### Concept 2: Topological Sort — DFS

```java
public List<Integer> topologicalSortDFS(int numVertices, List<List<Integer>> adj) {
    boolean[] visited = new boolean[numVertices];
    boolean[] inStack = new boolean[numVertices]; // for cycle detection
    Deque<Integer> stack = new ArrayDeque<>();
    boolean[] hasCycle = {false};

    for (int i = 0; i < numVertices; i++) {
        if (!visited[i]) {
            dfs(i, adj, visited, inStack, stack, hasCycle);
        }
    }

    if (hasCycle[0]) return Collections.emptyList(); // cycle detected

    List<Integer> result = new ArrayList<>(stack);
    return result; // stack gives reverse post-order = topological order
}

private void dfs(int node, List<List<Integer>> adj, boolean[] visited,
                 boolean[] inStack, Deque<Integer> stack, boolean[] hasCycle) {
    visited[node] = true;
    inStack[node] = true; // mark as in current DFS path

    for (int neighbor : adj.get(node)) {
        if (!visited[neighbor]) {
            dfs(neighbor, adj, visited, inStack, stack, hasCycle);
        } else if (inStack[neighbor]) {
            hasCycle[0] = true; // back edge → cycle
        }
    }

    inStack[node] = false;
    stack.push(node); // push AFTER all descendants are processed
}
```

---

### Concept 3: Detect Cycle in Directed Graph

```java
// Returns true if a cycle exists
public boolean hasCycle(int numCourses, int[][] prerequisites) {
    List<List<Integer>> adj = new ArrayList<>();
    int[] inDegree = new int[numCourses];
    for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());

    for (int[] pre : prerequisites) {
        adj.get(pre[1]).add(pre[0]);
        inDegree[pre[0]]++;
    }

    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numCourses; i++) {
        if (inDegree[i] == 0) queue.offer(i);
    }

    int count = 0;
    while (!queue.isEmpty()) {
        int node = queue.poll();
        count++;
        for (int next : adj.get(node)) {
            if (--inDegree[next] == 0) queue.offer(next);
        }
    }
    return count != numCourses; // cycle if not all courses processed
}
```

---

## Common Patterns

### Pattern A: Course Schedule (Can You Finish All Courses?)

**Problem**: Given numCourses and prerequisites [a, b] (must take b before a), can you finish all courses?

```java
public boolean canFinish(int numCourses, int[][] prerequisites) {
    List<List<Integer>> adj = new ArrayList<>();
    int[] inDegree = new int[numCourses];
    for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());

    for (int[] pre : prerequisites) {
        adj.get(pre[1]).add(pre[0]); // b → a (b is prerequisite for a)
        inDegree[pre[0]]++;
    }

    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numCourses; i++) {
        if (inDegree[i] == 0) queue.offer(i);
    }

    int taken = 0;
    while (!queue.isEmpty()) {
        int course = queue.poll();
        taken++;
        for (int next : adj.get(course)) {
            if (--inDegree[next] == 0) queue.offer(next);
        }
    }
    return taken == numCourses;
}
```

---

### Pattern B: Course Schedule II (Return the Order)

```java
public int[] findOrder(int numCourses, int[][] prerequisites) {
    List<List<Integer>> adj = new ArrayList<>();
    int[] inDegree = new int[numCourses];
    for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());

    for (int[] pre : prerequisites) {
        adj.get(pre[1]).add(pre[0]);
        inDegree[pre[0]]++;
    }

    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numCourses; i++) {
        if (inDegree[i] == 0) queue.offer(i);
    }

    int[] order = new int[numCourses];
    int idx = 0;
    while (!queue.isEmpty()) {
        int course = queue.poll();
        order[idx++] = course;
        for (int next : adj.get(course)) {
            if (--inDegree[next] == 0) queue.offer(next);
        }
    }
    return idx == numCourses ? order : new int[0];
}
```

---

### Pattern C: Alien Dictionary (Reconstruct Character Order)

**Problem**: Given a list of words sorted lexicographically in an alien language, find the character ordering.

```java
public String alienOrder(String[] words) {
    Map<Character, Set<Character>> adj = new HashMap<>();
    Map<Character, Integer> inDegree = new HashMap<>();

    // Initialize all characters
    for (String word : words) {
        for (char c : word.toCharArray()) {
            adj.putIfAbsent(c, new HashSet<>());
            inDegree.putIfAbsent(c, 0);
        }
    }

    // Build edges by comparing adjacent words
    for (int i = 0; i < words.length - 1; i++) {
        String w1 = words[i], w2 = words[i + 1];
        int minLen = Math.min(w1.length(), w2.length());

        // Check if w1 is a prefix of w2 but longer — invalid input
        if (w1.length() > w2.length() && w1.startsWith(w2)) return "";

        for (int j = 0; j < minLen; j++) {
            if (w1.charAt(j) != w2.charAt(j)) {
                char from = w1.charAt(j), to = w2.charAt(j);
                if (!adj.get(from).contains(to)) {
                    adj.get(from).add(to);
                    inDegree.put(to, inDegree.get(to) + 1);
                }
                break; // only the first differing character gives ordering info
            }
        }
    }

    // Kahn's BFS
    Queue<Character> queue = new LinkedList<>();
    for (char c : inDegree.keySet()) {
        if (inDegree.get(c) == 0) queue.offer(c);
    }

    StringBuilder result = new StringBuilder();
    while (!queue.isEmpty()) {
        char c = queue.poll();
        result.append(c);
        for (char neighbor : adj.get(c)) {
            inDegree.put(neighbor, inDegree.get(neighbor) - 1);
            if (inDegree.get(neighbor) == 0) queue.offer(neighbor);
        }
    }

    return result.length() == inDegree.size() ? result.toString() : ""; // empty = cycle
}
```

---

## Quick Check

1. What is a DAG and why is topological sort only possible on a DAG?
2. In Kahn's algorithm, what does it mean if the result has fewer than n vertices?
3. What are the two states a node needs in DFS cycle detection (for directed graphs)?
4. In Course Schedule, why is edge direction [pre[1] → pre[0]] and not [pre[0] → pre[1]]?
5. Can a graph have multiple valid topological orderings? Give an example.

---

## Practice Problems

### Beginner
- **Course Schedule** (LeetCode 207) — can you finish all courses? (cycle detection)
- **Find if Path Exists in Graph** (LeetCode 1971) — basic graph traversal

### Intermediate
- **Course Schedule II** (LeetCode 210) — return a valid course order
- **Minimum Height Trees** (LeetCode 310) — find roots that minimize tree height
- **Parallel Courses** (LeetCode 1136) — minimum semesters to complete all courses

### Advanced
- **Alien Dictionary** (LeetCode 269) — reconstruct character order from sorted words
- **Sequence Reconstruction** (LeetCode 444) — verify unique topological order
- **Build a Matrix With Conditions** (LeetCode 2392) — 2D topological sort
- **Find All Possible Recipes from Given Supplies** (LeetCode 2115)

---

## Common Mistakes

### Mistake 1: Wrong edge direction for prerequisites
```java
// [a, b] means "b is a prerequisite for a" → edge b → a
// WRONG
adj.get(pre[0]).add(pre[1]); // adds a → b

// CORRECT
adj.get(pre[1]).add(pre[0]); // adds b → a (b must come before a)
```

### Mistake 2: Only tracking "visited" for cycle detection (not "in current path")
```java
// WRONG — a visited node from a completed branch is not a cycle
if (visited[neighbor]) hasCycle = true; // false positive!

// CORRECT — only a node in the CURRENT path indicates a cycle
if (inStack[neighbor]) hasCycle = true;
```

### Mistake 3: Not handling disconnected graphs
```java
// WRONG — starts DFS/BFS from one node, misses other components
dfs(0, ...);

// CORRECT — start from all unvisited nodes
for (int i = 0; i < numVertices; i++) {
    if (!visited[i]) dfs(i, ...);
}
```

### Mistake 4: Forgetting to initialize the adjacency list for all nodes
```java
// WRONG — nodes with no outgoing edges aren't in adj
// adj.get(someIsolatedNode) throws NullPointerException

// CORRECT — initialize all nodes upfront
for (int i = 0; i < numVertices; i++) adj.add(new ArrayList<>());
```

---

## Interview Questions

**Q: What is the time complexity of topological sort?**
A: O(V + E) — we visit every vertex once and process every edge once, both in Kahn's and DFS.

**Q: Can an undirected graph have a topological order?**
A: No — topological sort requires a directed graph. Undirected edges don't establish ordering relationships. If you model an undirected edge as two directed edges, you always have a cycle.

**Q: How many valid topological orderings can a DAG have?**
A: It varies — as few as 1 (a single chain), as many as n! (no edges at all). If all nodes have in-degree ≤ 1, there's exactly one ordering. The question "is the topological ordering unique?" is answered by checking if the BFS queue ever has more than 1 element at the same time.

**Q: How is Kahn's algorithm similar to BFS?**
A: Kahn's IS a BFS — it starts with all source nodes (in-degree 0) and processes level by level. The "levels" correspond to courses you could take in parallel (if scheduling). The number of BFS levels = minimum number of semesters needed.

**Q: How would you detect a cycle in an undirected graph?**
A: Use Union-Find or BFS/DFS with a parent pointer. In DFS: if you reach an already-visited neighbor that isn't the direct parent → cycle. This differs from directed graphs (where you need `inStack`, not just `visited`).

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Alien Dictionary** | 269 | Build character-ordering edges from adjacent word pairs; first differing character gives a directed edge — edge case: prefix word longer than next word = invalid |
| 2 | **Parallel Courses** | 1136 | Topological sort level-by-level — the number of BFS levels = minimum semesters; detect cycle = impossible |
| 3 | **Sequence Reconstruction** | 444 | Verify that `org` is the ONLY valid topological order — BFS queue must never have >1 element at the same time |
| 4 | **Minimum Height Trees** | 310 | Reverse topological sort — repeatedly remove all current leaf nodes; the last 1-2 remaining nodes are the MHT roots |
| 5 | **Sort Items by Groups Respecting Dependencies** | 1203 | Two-level topological sort — sort within groups and sort the groups themselves; items without a group each form their own group |
| 6 | **Find All Possible Recipes from Given Supplies** | 2115 | Topological sort where leaves are given supplies; only recipes whose all ingredients are satisfied can be "made" |
| 7 | **Largest Color Value in a Directed Graph** | 1857 | Topo sort + DP — at each node, track count of each color on the longest path ending here; O(V × 26) |

## Related Topics

- **Prerequisite**: Directed graphs, adjacency list, in-degree/out-degree
- **Previous**: [0/1 Knapsack DP](./15-knapsack-dp.md)
- **See also**: [Tree BFS](./07-tree-bfs.md) — BFS on trees (Kahn's is BFS on DAGs); [Tree DFS](./08-tree-dfs.md) — DFS same as topological sort's DFS variant

---

## Further Reading

- LeetCode "Topological Sort" tag — Course Schedule I & II are the entry points
- NeetCode Graphs playlist — Topological Sort section
- "Introduction to Algorithms" (CLRS) Chapter 22 — DFS and Topological Sort
- Khan Academy — Topological Sort visualizations
