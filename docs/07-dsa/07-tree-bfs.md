# Pattern 7: Tree Breadth First Search (BFS)

> **Before you start**: Can you process a tree level by level? BFS uses a queue to visit nodes layer by layer — the natural choice for "level order," "minimum depth," and "right side view" problems.

---

## What is Tree BFS?

Tree BFS explores a tree **level by level** — all nodes at depth 1 before depth 2, all depth 2 before depth 3, and so on. It uses a **queue** (FIFO) to track which nodes to visit next.

**Analogy**: Think of water flooding from the root of a tree. It fills the root first, then spills equally to all level-1 children simultaneously, then to all level-2 children. BFS simulates this wave-by-wave exploration.

---

## How It Works

1. Add root to queue.
2. While queue is not empty:
   a. Record `size = queue.size()` — this is the number of nodes in the current level.
   b. Process exactly `size` nodes (dequeue, visit, enqueue their children).
   c. After processing `size` nodes, one full level is complete.
3. Repeat.

```
Tree:          1
              / \
             2   3
            / \   \
           4   5   6

Queue state:
Start:  [1]
Level 0: dequeue 1, enqueue 2,3 → [2,3]
Level 1: dequeue 2 (enqueue 4,5), dequeue 3 (enqueue 6) → [4,5,6]
Level 2: dequeue 4,5,6 (no children) → []
Done.

Level order result: [[1],[2,3],[4,5,6]]
```

---

## Why This Matters

| Property | BFS | DFS |
|----------|-----|-----|
| Order | Level by level | Branch by branch |
| Data structure | Queue | Stack / recursion |
| Shortest path | Yes (unweighted) | No |
| Space | O(w) — max width | O(h) — height |
| Best for | Level-based queries | Path-based queries |

BFS finds the **minimum depth** naturally (first time you see a leaf). DFS might go deep into one long branch before finding a shallower one.

---

## When to Use

Recognition signals:
- "Level order traversal"
- "Average / sum / max of each level"
- "Minimum depth of a binary tree"
- "Right side view" (last node at each level)
- "Zigzag level order"
- "Connect nodes at the same level"
- "Shortest path in an unweighted graph/grid"

---

## Trade-offs

| Pros | Cons |
|------|------|
| Natural level separation using queue size trick | Uses O(w) space — can be large for wide/balanced trees |
| Finds shortest path in unweighted graphs | Not ideal for deep trees where DFS would use less space |
| Iterative by nature — no stack overflow risk | Slightly more verbose than recursive DFS |

---

## Core Concepts

### Concept 1: Level Order Traversal (collect each level)

```java
public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;

    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);

    while (!queue.isEmpty()) {
        int levelSize = queue.size(); // snapshot: all nodes in current level
        List<Integer> currentLevel = new ArrayList<>();

        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            currentLevel.add(node.val);

            if (node.left != null)  queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        result.add(currentLevel);
    }
    return result;
}
```

**The `levelSize` snapshot** is the key trick — it isolates one complete level per outer-loop iteration.

---

### Concept 2: Zigzag Level Order

```java
public List<List<Integer>> zigzagLevelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;

    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    boolean leftToRight = true;

    while (!queue.isEmpty()) {
        int levelSize = queue.size();
        LinkedList<Integer> currentLevel = new LinkedList<>(); // use LinkedList for O(1) addFirst

        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            if (leftToRight) {
                currentLevel.addLast(node.val);
            } else {
                currentLevel.addFirst(node.val); // reverse direction
            }
            if (node.left != null)  queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }

        result.add(currentLevel);
        leftToRight = !leftToRight;
    }
    return result;
}
```

---

### Concept 3: Minimum Depth of Binary Tree

```java
public int minDepth(TreeNode root) {
    if (root == null) return 0;

    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    int depth = 1;

    while (!queue.isEmpty()) {
        int levelSize = queue.size();

        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();

            // First leaf found is at minimum depth (BFS guarantees this)
            if (node.left == null && node.right == null) return depth;

            if (node.left != null)  queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        depth++;
    }
    return depth;
}
```

**Why BFS works here**: The first leaf BFS reaches is guaranteed to be at the minimum depth — BFS never goes deeper before exhausting the current level.

---

## Common Patterns

### Pattern A: Right Side View

**Problem**: Return the values of nodes visible from the right side (the rightmost node at each level).

```java
public List<Integer> rightSideView(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    if (root == null) return result;

    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);

    while (!queue.isEmpty()) {
        int levelSize = queue.size();

        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();

            // Last node in each level is visible from the right
            if (i == levelSize - 1) result.add(node.val);

            if (node.left != null)  queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
    }
    return result;
}
```

---

### Pattern B: Level Averages

**Problem**: Find the average of values at each level.

```java
public List<Double> averageOfLevels(TreeNode root) {
    List<Double> result = new ArrayList<>();
    if (root == null) return result;

    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);

    while (!queue.isEmpty()) {
        int levelSize = queue.size();
        double levelSum = 0;

        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            levelSum += node.val;
            if (node.left != null)  queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        result.add(levelSum / levelSize);
    }
    return result;
}
```

---

### Pattern C: Connect Next Right Pointers

**Problem**: Populate each node's `next` pointer to its right neighbor at the same level (null if rightmost). Works for any binary tree.

```java
public Node connect(Node root) {
    if (root == null) return null;

    Queue<Node> queue = new LinkedList<>();
    queue.offer(root);

    while (!queue.isEmpty()) {
        int levelSize = queue.size();

        for (int i = 0; i < levelSize; i++) {
            Node node = queue.poll();
            // Connect to the next node in queue (same level)
            if (i < levelSize - 1) node.next = queue.peek();

            if (node.left != null)  queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
    }
    return root;
}
```

---

## Quick Check

1. Why do you snapshot `levelSize = queue.size()` before the inner loop?
2. What is the space complexity of BFS on a balanced binary tree? On a skewed tree?
3. How does BFS guarantee finding the minimum depth?
4. In zigzag traversal, why use `LinkedList` instead of `ArrayList` for current level?
5. How would you modify level order traversal to return levels bottom-up (deepest level first)?

---

## Practice Problems

### Beginner
- **Binary Tree Level Order Traversal** (LeetCode 102) — collect each level
- **Binary Tree Level Order Traversal II** (LeetCode 107) — levels bottom-up
- **Average of Levels in Binary Tree** (LeetCode 637) — average per level

### Intermediate
- **Binary Tree Right Side View** (LeetCode 199) — last node at each level
- **Binary Tree Zigzag Level Order Traversal** (LeetCode 103) — alternate direction
- **Minimum Depth of Binary Tree** (LeetCode 111) — first leaf depth
- **Maximum Width of Binary Tree** (LeetCode 662) — max nodes between leftmost and rightmost at any level

### Advanced
- **Populating Next Right Pointers in Each Node II** (LeetCode 117) — connect with next pointer (any tree)
- **Find Largest Value in Each Tree Row** (LeetCode 515) — max per level
- **N-ary Tree Level Order Traversal** (LeetCode 429) — BFS on n-ary tree
- **Word Ladder** (LeetCode 127) — BFS on implicit graph (shortest transformation)

---

## Common Mistakes

### Mistake 1: Not capturing levelSize before the inner loop
```java
// WRONG — queue.size() changes as you add children during iteration
for (int i = 0; i < queue.size(); i++) { // BUG: size grows mid-loop
    TreeNode node = queue.poll();
    if (node.left != null) queue.offer(node.left);
    ...
}

// CORRECT — snapshot the size first
int levelSize = queue.size();
for (int i = 0; i < levelSize; i++) { ... }
```

### Mistake 2: Using `null` as a level separator (less clean)
```java
// Works but brittle — easy to introduce infinite loops if not careful
queue.offer(null);
while (!queue.isEmpty()) {
    TreeNode node = queue.poll();
    if (node == null) { /* end of level */ queue.offer(null); continue; }
    ...
}

// PREFER the levelSize snapshot approach — cleaner and safer
```

### Mistake 3: Not checking for null root
```java
// WRONG — NullPointerException if root is null
Queue<TreeNode> queue = new LinkedList<>();
queue.offer(root); // root could be null!

// CORRECT
if (root == null) return result;
queue.offer(root);
```

### Mistake 4: Forgetting to check left/right before enqueueing
```java
// WRONG — adds null nodes to queue
queue.offer(node.left);  // may be null!

// CORRECT
if (node.left != null)  queue.offer(node.left);
if (node.right != null) queue.offer(node.right);
```

---

## Interview Questions

**Q: What's the space complexity of BFS on a binary tree?**
A: O(w) where w is the maximum width (number of nodes at the widest level). For a complete binary tree, the last level has n/2 nodes → O(n) space. For a skewed tree, it's O(1). Compare to DFS: O(h) where h is height — O(log n) for balanced, O(n) for skewed.

**Q: When would you prefer DFS over BFS for a tree problem?**
A: When you need path-based information (root-to-leaf paths, path sums, LCA), DFS is more natural. BFS is better for level-based queries. DFS also uses less space for deep, narrow trees; BFS uses less space for wide, shallow trees.

**Q: Can you do BFS without a queue?**
A: Technically yes — you can use two arrays/lists: current level and next level. Alternately process them. But Queue is the standard, clean implementation.

**Q: How would you extend Tree BFS to work on a general graph?**
A: Add a `visited` set. Before enqueuing any neighbor, check if it's already in `visited`. This prevents revisiting nodes (and infinite loops in graphs with cycles). See: Word Ladder (LeetCode 127).

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Maximum Width of Binary Tree** | 662 | Width = index of rightmost - index of leftmost node at a level; use position indexing (left child = 2i, right = 2i+1) — overflow is a real concern for deep trees |
| 2 | **Word Ladder** | 127 | BFS on an implicit graph — each word is a node; two words are neighbors if they differ by one letter; the "graph" is never explicitly built |
| 3 | **Walls and Gates** | 286 | Multi-source BFS — start BFS from ALL gates simultaneously; cells fill with distance to nearest gate |
| 4 | **Rotting Oranges** | 994 | Multi-source BFS from all rotten oranges at once — count minutes until all fresh are rotten or detect impossibility |
| 5 | **Open the Lock** | 752 | BFS on state space — each combination is a node; 4-digit lock with 8 possible moves per state; use a `deadends` set |
| 6 | **Jump Game III** | 1306 | BFS/DFS from index 0, jumping by ±arr[i] — check reachability to any index with value 0 |
| 7 | **Serialize and Deserialize Binary Tree** | 297 | BFS serialization with null markers — deserialize by reading level by level and assigning children from queue |

## Related Topics

- **Prerequisite**: Binary tree, Queue data structure
- **Previous**: [LinkedList Reversal](./06-linkedlist-reversal.md)
- **Next**: [Tree DFS](./08-tree-dfs.md)
- **See also**: [Two Heaps](./09-two-heaps.md) — another tree-adjacent pattern using priority queue

---

## Further Reading

- LeetCode "Breadth-First Search" tag — filter for Tree problems
- "Introduction to Algorithms" (CLRS) Chapter 22 — BFS in graphs
- NeetCode Trees playlist — BFS section covers the 5 core level-order variants
