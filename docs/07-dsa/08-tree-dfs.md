# Pattern 8: Tree Depth First Search (DFS)

> **Before you start**: Can you explore a path from root to leaf before backtracking? Tree DFS goes deep on one branch, then backtracks to explore siblings — the natural choice for path sums, LCA, and subtree problems.

---

## What is Tree DFS?

Tree DFS explores as far down a branch as possible before backtracking. It processes nodes in **pre-order** (root first), **in-order** (left, root, right), or **post-order** (root last) depending on when you process the current node relative to its children.

**Analogy**: DFS is like exploring a maze by always taking the leftmost corridor until you hit a wall, then backtracking to the last junction and trying the next option. You fully explore one path before starting another.

---

## How It Works

Three traversal orders (all DFS):

```
Tree:        1
            / \
           2   3
          / \
         4   5

Pre-order  (Root, Left, Right): 1 → 2 → 4 → 5 → 3
In-order   (Left, Root, Right): 4 → 2 → 5 → 1 → 3
Post-order (Left, Right, Root): 4 → 5 → 2 → 3 → 1
```

**When to use each**:
- **Pre-order**: Clone a tree, serialize, or process parent before children
- **In-order**: BST traversal (gives sorted order)
- **Post-order**: Delete a tree, or compute results from children before parent (height, diameter)

---

## Why This Matters

| Property | DFS | BFS |
|----------|-----|-----|
| Space | O(h) — tree height | O(w) — tree width |
| Path tracking | Natural (recursion maintains path) | Requires extra bookkeeping |
| Level queries | Requires extra depth parameter | Natural |
| Shortest path | Not guaranteed | Yes (unweighted) |

For path sum problems, DFS lets you carry accumulated state down the recursion naturally. For height/diameter, post-order lets children compute values before the parent uses them.

---

## When to Use

Recognition signals:
- "Path sum from root to leaf"
- "All root-to-leaf paths"
- "Lowest common ancestor"
- "Diameter of binary tree"
- "Height / depth of tree"
- "Validate BST"
- "Invert / mirror binary tree"
- "Count nodes with certain property"
- "Serialize / deserialize tree"

---

## Trade-offs

| Pros | Cons |
|------|------|
| O(h) space — good for deep trees | Recursive → stack overflow for very deep trees (use iterative as fallback) |
| Path state naturally maintained via call stack | Not intuitive for level-based queries |
| Works without extra data structures | Post-order logic can be tricky to get right |

---

## Core Concepts

### Concept 1: Pre/In/Post-Order Traversal

```java
// Pre-order: process node BEFORE children
public void preOrder(TreeNode root) {
    if (root == null) return;
    System.out.print(root.val + " "); // process
    preOrder(root.left);
    preOrder(root.right);
}

// In-order: process node BETWEEN children
public void inOrder(TreeNode root) {
    if (root == null) return;
    inOrder(root.left);
    System.out.print(root.val + " "); // process
    inOrder(root.right);
}

// Post-order: process node AFTER children
public void postOrder(TreeNode root) {
    if (root == null) return;
    postOrder(root.left);
    postOrder(root.right);
    System.out.print(root.val + " "); // process
}
```

**Iterative DFS** (pre-order, using explicit stack):
```java
public List<Integer> preOrderIterative(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    if (root == null) return result;

    Deque<TreeNode> stack = new ArrayDeque<>();
    stack.push(root);

    while (!stack.isEmpty()) {
        TreeNode node = stack.pop();
        result.add(node.val);
        // Push right first so left is processed first (LIFO)
        if (node.right != null) stack.push(node.right);
        if (node.left  != null) stack.push(node.left);
    }
    return result;
}
```

---

### Concept 2: Path Sum (root-to-leaf)

```java
// Does any root-to-leaf path sum equal targetSum?
public boolean hasPathSum(TreeNode root, int targetSum) {
    if (root == null) return false;
    // At a leaf, check if remaining sum equals leaf value
    if (root.left == null && root.right == null) return root.val == targetSum;
    // Recurse, subtracting current node's value
    return hasPathSum(root.left, targetSum - root.val)
        || hasPathSum(root.right, targetSum - root.val);
}

// Collect all root-to-leaf paths that sum to targetSum
public List<List<Integer>> pathSum(TreeNode root, int targetSum) {
    List<List<Integer>> result = new ArrayList<>();
    dfs(root, targetSum, new ArrayList<>(), result);
    return result;
}

private void dfs(TreeNode node, int remaining, List<Integer> path, List<List<Integer>> result) {
    if (node == null) return;
    path.add(node.val);

    if (node.left == null && node.right == null && remaining == node.val) {
        result.add(new ArrayList<>(path)); // snapshot the path
    } else {
        dfs(node.left,  remaining - node.val, path, result);
        dfs(node.right, remaining - node.val, path, result);
    }
    path.remove(path.size() - 1); // backtrack
}
```

**Backtracking**: Remove the current node from `path` before returning — this is what makes the same list reusable across branches.

---

### Concept 3: Tree Height & Diameter (Post-Order)

```java
// Height of binary tree (longest path from root to any leaf)
public int maxDepth(TreeNode root) {
    if (root == null) return 0;
    int leftHeight  = maxDepth(root.left);
    int rightHeight = maxDepth(root.right);
    return 1 + Math.max(leftHeight, rightHeight); // post-order: use children's results
}

// Diameter: longest path between any two nodes (may not pass through root)
public int diameterOfBinaryTree(TreeNode root) {
    int[] maxDiameter = {0}; // use array to allow mutation inside lambda/recursive call
    height(root, maxDiameter);
    return maxDiameter[0];
}

private int height(TreeNode node, int[] maxDiameter) {
    if (node == null) return 0;
    int leftH  = height(node.left,  maxDiameter);
    int rightH = height(node.right, maxDiameter);
    // Path through this node = leftH + rightH edges
    maxDiameter[0] = Math.max(maxDiameter[0], leftH + rightH);
    return 1 + Math.max(leftH, rightH);
}
```

**Key insight for diameter**: The longest path through any node = its left subtree height + right subtree height. You need post-order to compute subtree heights before evaluating the diameter at each node.

---

## Common Patterns

### Pattern A: Lowest Common Ancestor (LCA)

**Problem**: Find the LCA of two nodes p and q in a binary tree.

```java
public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;

    TreeNode left  = lowestCommonAncestor(root.left,  p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);

    if (left != null && right != null) return root; // p in left subtree, q in right → root is LCA
    return left != null ? left : right;             // one side has both nodes
}
```

**Logic**: If both p and q are found in different subtrees of a node, that node is the LCA. If both are in the same subtree, recurse deeper.

---

### Pattern B: Validate BST

**Problem**: Check if a binary tree is a valid BST.

```java
public boolean isValidBST(TreeNode root) {
    return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
}

private boolean validate(TreeNode node, long min, long max) {
    if (node == null) return true;
    if (node.val <= min || node.val >= max) return false;
    return validate(node.left,  min,       node.val)
        && validate(node.right, node.val,  max);
}
```

**Why pass min/max**: Each node must satisfy ALL ancestor constraints, not just its parent. Passing bounds down ensures the full BST invariant is checked.

---

### Pattern C: Maximum Path Sum (any node to any node)

**Problem**: Find the maximum sum path between any two nodes in the tree.

```java
public int maxPathSum(TreeNode root) {
    int[] maxSum = {Integer.MIN_VALUE};
    gainFromSubtree(root, maxSum);
    return maxSum[0];
}

private int gainFromSubtree(TreeNode node, int[] maxSum) {
    if (node == null) return 0;

    // Only take positive contributions from children
    int leftGain  = Math.max(gainFromSubtree(node.left,  maxSum), 0);
    int rightGain = Math.max(gainFromSubtree(node.right, maxSum), 0);

    // Path through this node (both branches)
    int pathThroughNode = node.val + leftGain + rightGain;
    maxSum[0] = Math.max(maxSum[0], pathThroughNode);

    // Return the max gain from THIS node to one branch (can't go both ways up)
    return node.val + Math.max(leftGain, rightGain);
}
```

---

## Quick Check

1. What are the three DFS traversal orders? When would you choose each?
2. In a BST, which traversal gives values in sorted (ascending) order?
3. Why must you backtrack (remove from path) after the recursive call in path-finding problems?
4. Why does the diameter problem use a global variable (or array) instead of returning the diameter directly?
5. In the LCA problem, what does it mean when `lowestCommonAncestor` returns `null` for one side?

---

## Practice Problems

### Beginner
- **Maximum Depth of Binary Tree** (LeetCode 104) — recursively find height
- **Invert Binary Tree** (LeetCode 226) — swap left and right children recursively
- **Symmetric Tree** (LeetCode 101) — check if tree is mirror of itself
- **Path Sum** (LeetCode 112) — does any root-to-leaf path sum to target?

### Intermediate
- **Path Sum II** (LeetCode 113) — collect all paths summing to target
- **Diameter of Binary Tree** (LeetCode 543) — longest path between any two nodes
- **Lowest Common Ancestor of a Binary Tree** (LeetCode 236)
- **Validate Binary Search Tree** (LeetCode 98)
- **Count Good Nodes in Binary Tree** (LeetCode 1448) — node is "good" if no larger node on root-to-node path

### Advanced
- **Binary Tree Maximum Path Sum** (LeetCode 124) — any-to-any path
- **Serialize and Deserialize Binary Tree** (LeetCode 297) — pre-order DFS with null markers
- **Binary Tree Cameras** (LeetCode 968) — post-order greedy
- **Vertical Order Traversal** (LeetCode 987) — DFS with coordinate tracking

---

## Common Mistakes

### Mistake 1: Forgetting to backtrack in path collection
```java
// WRONG — path keeps growing; same list is shared across all branches
path.add(node.val);
dfs(node.left, ...);
dfs(node.right, ...);
// Missing: path.remove(path.size() - 1);

// CORRECT — remove current node after both children are processed
path.add(node.val);
dfs(node.left, ...);
dfs(node.right, ...);
path.remove(path.size() - 1); // backtrack
```

### Mistake 2: Not snapshotting path when adding to result
```java
// WRONG — adds a reference; list will be modified by future backtracking
result.add(path);

// CORRECT — add a copy
result.add(new ArrayList<>(path));
```

### Mistake 3: BST validation only checking parent, not full range
```java
// WRONG — only checks direct parent; fails for:
//       5
//      / \
//     1   4
//        / \
//       3   6
// 3 < 5 (root) but this is not a valid BST — 4 is in the right subtree of 5

private boolean validate(TreeNode node) {
    if (node == null) return true;
    if (node.left != null && node.left.val >= node.val) return false; // too narrow
    return validate(node.left) && validate(node.right);
}

// CORRECT — pass min/max bounds
private boolean validate(TreeNode node, long min, long max) { ... }
```

### Mistake 4: Including negative subtree contributions in max path sum
```java
// WRONG — negative gain makes the path worse
int leftGain = gainFromSubtree(node.left, maxSum);
// CORRECT — clip at 0 (don't include negative subtrees)
int leftGain = Math.max(gainFromSubtree(node.left, maxSum), 0);
```

---

## Interview Questions

**Q: When would you use iterative DFS instead of recursive?**
A: Use iterative when: (1) the tree can be very deep (millions of nodes — recursive hits stack overflow), (2) the problem requires explicit backtracking control, or (3) you need to pause mid-traversal (e.g., lazy iterators). In interviews, mention both and code the recursive one unless asked for iterative.

**Q: What's the space complexity of DFS?**
A: O(h) where h is the height. For a balanced tree: O(log n). For a skewed tree: O(n). The recursion call stack holds one frame per level of depth.

**Q: Explain why in-order traversal of a BST gives sorted order.**
A: BST invariant: for any node, all left subtree values < node < all right subtree values. In-order visits left subtree first (all smaller), then root, then right subtree (all larger). This guarantees ascending order across the whole tree.

**Q: How does LCA change if the tree is a BST?**
A: Simpler — if both p and q are less than root, go left. If both are greater, go right. Otherwise (root is between them), root is the LCA. O(h) time, O(1) space (no recursion needed — can be done iteratively). See LeetCode 235 vs 236.

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Path Sum III** | 437 | Count paths summing to target (any node to any node, top-down only) — use prefix sum map in DFS; O(n) not O(n²) |
| 2 | **Binary Tree Cameras** | 968 | Post-order greedy — each node can be in one of 3 states (covered, camera, not covered); bottom-up placement is non-obvious |
| 3 | **Amount of Time for Binary Tree to Be Infected** | 2385 | Two-pass problem: DFS to build parent map, then BFS from infection start; mix of DFS construction + BFS spread |
| 4 | **Recover Binary Search Tree** | 99 | Two nodes in a BST are swapped — find them using in-order traversal where values should be ascending; one or two violation points |
| 5 | **Binary Tree Maximum Path Sum** | 124 | Hard — global max is updated at each node (left + node + right), but you can only return ONE branch upward |
| 6 | **Kth Smallest Element in a BST** | 230 | In-order traversal gives sorted order — stop at the kth element; iterative in-order avoids full traversal |
| 7 | **Construct Binary Tree from Preorder and Inorder** | 105 | Use preorder for roots, inorder to find left/right split — HashMap the inorder indices for O(n) |

## Related Topics

- **Prerequisite**: Binary tree, recursion, call stack
- **Previous**: [Tree BFS](./07-tree-bfs.md)
- **Next**: [Two Heaps](./09-two-heaps.md)
- **See also**: [Fast & Slow Pointers](./03-fast-slow-pointers.md) — used in tree problems to find the middle

---

## Further Reading

- LeetCode "Depth-First Search" tag — filter by Tree category
- "Elements of Programming Interviews" Chapter 9 — Binary Trees
- NeetCode Trees playlist — DFS section covers LCA, path sum, diameter, and serialize/deserialize
