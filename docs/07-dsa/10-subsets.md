# Pattern 10: Subsets (Combinations & Permutations)

> **Before you start**: Can you generate all possible groupings of elements? Subsets uses BFS expansion or backtracking to systematically enumerate every combination, permutation, or power set — the foundation for many "generate all" problems.

---

## What is the Subsets Pattern?

The Subsets pattern generates **all possible groupings** (subsets, combinations, permutations, or power sets) of a given set of elements. Two main approaches:

- **BFS / Iterative**: Start with empty set, add each element to all existing subsets.
- **Backtracking / DFS**: Build a candidate solution step-by-step; "undo" the last choice when you've explored all possibilities from that choice.

**Analogy (BFS)**: Start with one empty box. For each item, duplicate all existing boxes and add the item to each duplicate. After processing all items, you have all possible combinations of the items.

---

## How It Works

### BFS Approach (Iterative)

```
nums = [1, 2, 3]

Start: [[]]
Add 1: [[], [1]]
Add 2: [[], [1], [2], [1,2]]
Add 3: [[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]
```

For each element, take every existing subset and create a new one with the element appended.

### Backtracking Approach (DFS)

Build subsets by making choices: include or exclude the current element. Recurse on remaining elements, then undo the choice.

---

## Why This Matters

| Problem type | Time complexity | Space (output) |
|---|---|---|
| Subsets (power set) | O(2^n) | O(2^n × n) |
| Combinations of size k | O(C(n,k) × k) | O(C(n,k) × k) |
| Permutations | O(n! × n) | O(n! × n) |

These are inherently exponential — but the patterns are how you generate them systematically without duplicates.

---

## When to Use

Recognition signals:
- "Find all subsets / combinations / permutations"
- "Power set"
- "Find all strings that are anagrams of..."
- "All paths in a grid" (generate all path sequences)
- "Generate all valid parentheses"
- "Letter combinations of a phone number"
- "Word search / Sudoku solver" (backtracking with pruning)

---

## Trade-offs

| BFS / Iterative | Backtracking / Recursive |
|---|---|
| Easy to understand | More flexible (easy to add constraints/pruning) |
| Good for pure subset generation | Natural for combinations with size constraints |
| Cannot easily prune invalid paths | Can prune early — faster in practice |
| No recursion depth limit | May hit stack overflow for very large inputs |

---

## Core Concepts

### Concept 1: All Subsets (Power Set) — BFS

```java
public List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    result.add(new ArrayList<>()); // start with empty subset

    for (int num : nums) {
        int size = result.size();
        for (int i = 0; i < size; i++) {
            List<Integer> subset = new ArrayList<>(result.get(i)); // copy existing
            subset.add(num);
            result.add(subset);
        }
    }
    return result;
}
```

**Key**: Snapshot `size` before the inner loop — don't iterate over newly added subsets in the same pass.

---

### Concept 2: All Subsets — Backtracking

```java
public List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), result);
    return result;
}

private void backtrack(int[] nums, int start, List<Integer> current, List<List<Integer>> result) {
    result.add(new ArrayList<>(current)); // add snapshot at every node (including empty)

    for (int i = start; i < nums.length; i++) {
        current.add(nums[i]);             // choose
        backtrack(nums, i + 1, current, result); // explore
        current.remove(current.size() - 1); // unchoose (backtrack)
    }
}
```

---

### Concept 3: Combinations of Size K — Backtracking with Pruning

```java
public List<List<Integer>> combine(int n, int k) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(n, k, 1, new ArrayList<>(), result);
    return result;
}

private void backtrack(int n, int k, int start, List<Integer> current, List<List<Integer>> result) {
    if (current.size() == k) {
        result.add(new ArrayList<>(current));
        return;
    }

    // Pruning: remaining numbers (n - i + 1) must be enough to fill k - current.size() slots
    for (int i = start; i <= n - (k - current.size()) + 1; i++) {
        current.add(i);
        backtrack(n, k, i + 1, current, result);
        current.remove(current.size() - 1);
    }
}
```

**Pruning**: The loop upper bound `n - (k - current.size()) + 1` cuts off branches where there aren't enough remaining elements to complete a valid combination.

---

## Common Patterns

### Pattern A: Subsets with Duplicates

**Problem**: Given nums that may contain duplicates, return all distinct subsets.

```java
public List<List<Integer>> subsetsWithDup(int[] nums) {
    Arrays.sort(nums); // sort to bring duplicates together
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), result);
    return result;
}

private void backtrack(int[] nums, int start, List<Integer> current, List<List<Integer>> result) {
    result.add(new ArrayList<>(current));

    for (int i = start; i < nums.length; i++) {
        // Skip duplicate elements at the same recursion level
        if (i > start && nums[i] == nums[i - 1]) continue;
        current.add(nums[i]);
        backtrack(nums, i + 1, current, result);
        current.remove(current.size() - 1);
    }
}
```

**Dedup logic**: `i > start && nums[i] == nums[i-1]` — skip if we're at the same recursion level (same `start`) and this element is the same as the previous one. This avoids generating the same subset twice.

---

### Pattern B: Permutations

**Problem**: All permutations of a distinct array.

```java
public List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, new boolean[nums.length], new ArrayList<>(), result);
    return result;
}

private void backtrack(int[] nums, boolean[] used, List<Integer> current, List<List<Integer>> result) {
    if (current.size() == nums.length) {
        result.add(new ArrayList<>(current));
        return;
    }

    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        current.add(nums[i]);
        backtrack(nums, used, current, result);
        current.remove(current.size() - 1);
        used[i] = false;
    }
}
```

**Difference from subsets**: Permutations use all elements and care about order → start from 0 each time but skip `used` elements. Subsets don't repeat elements → start from `i + 1`.

---

### Pattern C: Letter Combinations (Phone Number)

**Problem**: Given a string of digits 2-9, return all possible letter combinations.

```java
private static final String[] PHONE = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};

public List<String> letterCombinations(String digits) {
    List<String> result = new ArrayList<>();
    if (digits.isEmpty()) return result;
    backtrack(digits, 0, new StringBuilder(), result);
    return result;
}

private void backtrack(String digits, int index, StringBuilder current, List<String> result) {
    if (index == digits.length()) {
        result.add(current.toString());
        return;
    }
    String letters = PHONE[digits.charAt(index) - '0'];
    for (char c : letters.toCharArray()) {
        current.append(c);
        backtrack(digits, index + 1, current, result);
        current.deleteCharAt(current.length() - 1);
    }
}
```

---

## Quick Check

1. In the BFS subsets approach, why do you snapshot `size = result.size()` before the inner loop?
2. What's the difference between `i > 0 && nums[i] == nums[i-1]` and `i > start && nums[i] == nums[i-1]` for dedup?
3. In permutations, why do you iterate from 0 instead of `start`?
4. What is the total number of subsets for an array of n elements?
5. What does "backtrack" mean and why is `current.remove(current.size() - 1)` necessary?

---

## Practice Problems

### Beginner
- **Subsets** (LeetCode 78) — all distinct subsets of distinct array
- **Letter Combinations of a Phone Number** (LeetCode 17) — all letter combos

### Intermediate
- **Subsets II** (LeetCode 90) — subsets with duplicates (sort + dedup)
- **Permutations** (LeetCode 46) — all permutations of distinct array
- **Combinations** (LeetCode 77) — all combinations of size k from [1, n]
- **Combination Sum** (LeetCode 39) — combinations that sum to target (reuse allowed)

### Advanced
- **Combination Sum II** (LeetCode 40) — combinations to target, no reuse, with duplicates
- **Permutations II** (LeetCode 47) — permutations with duplicates
- **Generate Parentheses** (LeetCode 22) — generate all valid parenthesis strings
- **Palindrome Partitioning** (LeetCode 131) — partition string so every part is a palindrome
- **Word Search** (LeetCode 79) — backtracking on a 2D grid

---

## Common Mistakes

### Mistake 1: Adding the list reference instead of a copy
```java
// WRONG — adds a reference; future modifications ruin past results
result.add(current);

// CORRECT — always snapshot
result.add(new ArrayList<>(current));
```

### Mistake 2: Wrong dedup condition for subsets with duplicates
```java
// WRONG — dedupes across different recursion levels (too aggressive)
if (i > 0 && nums[i] == nums[i - 1]) continue;

// CORRECT — only dedup at the SAME recursion level
if (i > start && nums[i] == nums[i - 1]) continue;
```

### Mistake 3: Not sorting before deduplication
```java
// WRONG — duplicates must be adjacent for the skip condition to work
// Without sorting, [1,2,2] and [2,1,2] are treated as different inputs

// CORRECT — always sort first when duplicates may exist
Arrays.sort(nums);
```

### Mistake 4: Forgetting to backtrack (remove last element)
```java
// WRONG — current keeps growing; all results are the same bloated list
current.add(nums[i]);
backtrack(nums, i + 1, current, result);
// Missing: current.remove(current.size() - 1);

// CORRECT
current.add(nums[i]);
backtrack(nums, i + 1, current, result);
current.remove(current.size() - 1); // undo
```

---

## Interview Questions

**Q: What's the time complexity of generating all subsets?**
A: O(2^n × n) — there are 2^n subsets, and copying each takes O(n) time in the worst case.

**Q: What's the time complexity of generating all permutations?**
A: O(n! × n) — n! permutations, each of length n to copy.

**Q: How do you avoid generating duplicate subsets without sorting?**
A: Use a HashSet of Lists (or canonical string representations). But this is O(2^n × n) extra space and is slower. Sorting + the `i > start` skip condition is always preferred.

**Q: What is the difference between Combination Sum (LC 39) and Combination Sum II (LC 40)?**
A: LC 39 allows reusing elements (no `i + 1`, just `i`); LC 40 doesn't allow reuse and has duplicates. LC 40 requires sorting + the dedup skip condition. LC 39 is simpler because each element is unique and reusable.

**Q: When would you choose BFS over backtracking for subsets?**
A: BFS is simpler for generating the full power set with no constraints. Backtracking is better when you have constraints (size k, sum = target) or need to prune invalid paths early.

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Generate Parentheses** | 22 | Backtracking with pruning — only add `(` if open < n, only add `)` if close < open; constraint makes it elegant |
| 2 | **Palindrome Partitioning** | 131 | Backtracking + palindrome check at each split point — can precompute a 2D `isPalin[i][j]` table to speed up checks |
| 3 | **Word Search** | 79 | Backtracking on a 2D grid — mark cells visited in-place (negate char), then restore after backtrack |
| 4 | **N-Queens** | 51 | Backtracking with 3 constraint sets (columns, diagonals ↘, diagonals ↗) — track which are used to prune invalid placements |
| 5 | **Sudoku Solver** | 37 | Backtracking on a 9×9 grid — try 1-9 at each empty cell, check row/col/box constraints; prune heavily |
| 6 | **Expression Add Operators** | 282 | Backtracking with a running value and the last multiplied term (to handle operator precedence for `*`) — hard |
| 7 | **Beautiful Arrangement** | 526 | Permutation backtracking with a divisibility constraint — only place number `k` at position `i` if `k % i == 0 || i % k == 0` |

## Related Topics

- **Prerequisite**: Recursion, List manipulation in Java
- **Previous**: [Two Heaps](./09-two-heaps.md)
- **Next**: [Modified Binary Search](./11-modified-binary-search.md)
- **See also**: [Topological Sort](./16-topological-sort.md) — another systematic graph enumeration pattern

---

## Further Reading

- LeetCode "Backtracking" tag — all classic backtracking problems
- NeetCode Backtracking playlist — covers Subsets, Combinations, Permutations, and Palindrome Partitioning
- "The Algorithm Design Manual" by Skiena — Chapter 7: Combinatorial Search
