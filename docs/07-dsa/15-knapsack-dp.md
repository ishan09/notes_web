# Pattern 15: 0/1 Knapsack (Dynamic Programming)

> **Before you start**: Can you decide which items to include or exclude to maximize value within a weight limit? 0/1 Knapsack DP solves this class of "include or exclude" problems by building a table of optimal sub-decisions bottom-up.

---

## What is 0/1 Knapsack?

The 0/1 Knapsack pattern applies to problems where you must decide for each item: **include it (1) or exclude it (0)** — no partial inclusion, no repetition. You use dynamic programming to build optimal solutions for smaller sub-problems and reuse them.

**Analogy**: Packing for a trip with a weight limit. For each item, you choose: bring it or leave it. You can't bring half an item. You want maximum value within your weight budget. DP fills a 2D table where each cell answers: "what's the max value using items 1..i within weight limit j?"

---

## How It Works

**State**: `dp[i][w]` = maximum value using first `i` items with capacity `w`.

**Recurrence**:
- If item `i` doesn't fit: `dp[i][w] = dp[i-1][w]` (skip it)
- If item `i` fits: `dp[i][w] = max(dp[i-1][w], value[i] + dp[i-1][w - weight[i]])`

```
Items: weight=[2,3,4], value=[3,4,5], capacity=5

     w: 0  1  2  3  4  5
i=0:    0  0  0  0  0  0
i=1(w=2,v=3): 0  0  3  3  3  3
i=2(w=3,v=4): 0  0  3  4  4  7   ← 7 = v3 + dp[1][5-3]=3
i=3(w=4,v=5): 0  0  3  4  5  7

Answer: dp[3][5] = 7
```

---

## Why This Matters

| Approach | Time | Space |
|----------|------|-------|
| Brute force (try all subsets) | O(2^n) | O(n) |
| Top-down memoization | O(n × W) | O(n × W) |
| Bottom-up DP table | **O(n × W)** | **O(n × W)** |
| Space-optimized (1D array) | O(n × W) | **O(W)** |

Where n = number of items, W = capacity. DP transforms exponential to polynomial.

---

## When to Use

Recognition signals:
- "Select items with a budget/weight limit"
- "Can we partition the array into two equal subsets?"
- "Find a subset that sums to exactly T"
- "Minimum number of items to reach a target"
- "Count of ways to make change"
- "Maximize value / minimize cost with a constraint"

**Knapsack family**: 0/1 Knapsack (each item once) vs Unbounded Knapsack (items reusable) vs Bounded (limited count per item).

---

## Trade-offs

| Pros | Cons |
|------|------|
| Polynomial time vs exponential brute force | O(n × W) can be large if W is huge (pseudo-polynomial) |
| Bottom-up avoids recursion overhead | 2D table may use significant memory |
| Space-optimized version uses O(W) | Requires careful ordering in space-optimized version |

---

## Core Concepts

### Concept 1: Classic 0/1 Knapsack (2D DP)

```java
public int knapsack(int[] weights, int[] values, int capacity) {
    int n = weights.length;
    int[][] dp = new int[n + 1][capacity + 1];

    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= capacity; w++) {
            // Option 1: Skip item i
            dp[i][w] = dp[i - 1][w];

            // Option 2: Include item i (if it fits)
            if (weights[i - 1] <= w) {
                dp[i][w] = Math.max(dp[i][w],
                    values[i - 1] + dp[i - 1][w - weights[i - 1]]);
            }
        }
    }
    return dp[n][capacity];
}
```

---

### Concept 2: Space-Optimized Knapsack (1D DP)

```java
public int knapsack1D(int[] weights, int[] values, int capacity) {
    int[] dp = new int[capacity + 1];

    for (int i = 0; i < weights.length; i++) {
        // MUST iterate w from right to left to avoid using item i twice
        for (int w = capacity; w >= weights[i]; w--) {
            dp[w] = Math.max(dp[w], values[i] + dp[w - weights[i]]);
        }
    }
    return dp[capacity];
}
```

**Why iterate right-to-left**: `dp[w - weights[i]]` must refer to the state *before* processing item i (i.e., the previous row). Iterating left-to-right would update `dp[w - weights[i]]` first, effectively allowing item i to be included multiple times.

---

### Concept 3: Subset Sum (Can we reach exactly target T?)

```java
public boolean canPartition(int[] nums) {
    int total = Arrays.stream(nums).sum();
    if (total % 2 != 0) return false; // can't split odd sum equally
    int target = total / 2;

    boolean[] dp = new boolean[target + 1];
    dp[0] = true; // empty subset sums to 0

    for (int num : nums) {
        for (int j = target; j >= num; j--) { // right-to-left
            dp[j] = dp[j] || dp[j - num];
        }
    }
    return dp[target];
}
```

---

## Common Patterns

### Pattern A: Count of Subsets with Target Sum

**Problem**: Count the number of subsets that sum to exactly S.

```java
public int countSubsets(int[] nums, int S) {
    int[] dp = new int[S + 1];
    dp[0] = 1; // one way to make sum 0: empty subset

    for (int num : nums) {
        for (int j = S; j >= num; j--) {
            dp[j] += dp[j - num];
        }
    }
    return dp[S];
}
```

---

### Pattern B: Minimum Subset Sum Difference

**Problem**: Partition array into two subsets with minimum absolute difference between their sums.

```java
public int minimumDifference(int[] nums) {
    int total = Arrays.stream(nums).sum();
    int n = nums.length;
    boolean[] dp = new boolean[total / 2 + 1];
    dp[0] = true;

    for (int num : nums) {
        for (int j = total / 2; j >= num; j--) {
            dp[j] = dp[j] || dp[j - num];
        }
    }

    // Find the largest sum <= total/2 that's achievable
    for (int s = total / 2; s >= 0; s--) {
        if (dp[s]) return total - 2 * s; // diff = (total-s) - s
    }
    return total; // shouldn't reach here for non-empty input
}
```

---

### Pattern C: Unbounded Knapsack (Items Can Be Reused) — Coin Change

**Problem**: Find the minimum number of coins to make amount.

```java
public int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1); // sentinel: impossible value
    dp[0] = 0;

    for (int a = 1; a <= amount; a++) {
        for (int coin : coins) {
            if (coin <= a) {
                dp[a] = Math.min(dp[a], dp[a - coin] + 1);
            }
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}
```

**Key difference from 0/1**: Iterate amount `a` from 1 to `amount` (outer), and for each amount check all coins. This allows reuse of the same coin. In 0/1, outer loop is items (each item used once).

---

## Quick Check

1. What is the recurrence relation for 0/1 Knapsack? What are the two choices at each cell?
2. Why must you iterate the weight dimension right-to-left in the space-optimized version?
3. What's the base case for the subset sum DP array?
4. How does Unbounded Knapsack differ from 0/1 in both the problem setup and the DP loop order?
5. In Equal Partition (LC 416), why can you immediately return false if the total sum is odd?

---

## Practice Problems

### Beginner
- **Partition Equal Subset Sum** (LeetCode 416) — can we split array into two equal halves?
- **Subset Sum** — can we find a subset summing to target? (classic knapsack)

### Intermediate
- **Target Sum** (LeetCode 494) — assign +/- to each number, count ways to reach target
- **Last Stone Weight II** (LeetCode 1049) — minimize difference of two groups
- **Coin Change** (LeetCode 322) — minimum coins for amount (unbounded)
- **Coin Change II** (LeetCode 518) — count combinations to make amount

### Advanced
- **0/1 Knapsack** — weighted items, capacity constraint (classic)
- **Ones and Zeroes** (LeetCode 474) — 2D knapsack (constraint on 0s and 1s)
- **Profitable Schemes** (LeetCode 879) — 2D DP with profit and member constraints
- **Maximize the Profit as the Programmer** — scheduling with non-overlapping jobs

---

## Common Mistakes

### Mistake 1: Iterating left-to-right in space-optimized 0/1 knapsack
```java
// WRONG — allows item to be used multiple times (becomes unbounded knapsack)
for (int j = weights[i]; j <= capacity; j++) {
    dp[j] = Math.max(dp[j], values[i] + dp[j - weights[i]]);
}

// CORRECT for 0/1 — right to left prevents reuse
for (int j = capacity; j >= weights[i]; j--) {
    dp[j] = Math.max(dp[j], values[i] + dp[j - weights[i]]);
}
```

### Mistake 2: Confusing 0/1 and Unbounded loop structures
```java
// 0/1 Knapsack: outer = items, inner = capacity (right-to-left)
for (int item : items) {
    for (int w = capacity; w >= item.weight; w--) { dp[w] = ...; }
}

// Unbounded Knapsack: outer = capacity (left-to-right), inner = items (or flipped)
for (int w = 1; w <= capacity; w++) {
    for (int item : items) { if (item.weight <= w) dp[w] = ...; }
}
```

### Mistake 3: Not initializing dp[0] = 1 (or true) for count/existence problems
```java
// WRONG — no base case → dp is all zeros, no subsets ever found
boolean[] dp = new boolean[target + 1];

// CORRECT — empty subset sums to 0 → base case
boolean[] dp = new boolean[target + 1];
dp[0] = true;
```

### Mistake 4: Wrong sentinel value for "impossible" in coin change
```java
// WRONG — using Integer.MAX_VALUE: adding 1 causes overflow
Arrays.fill(dp, Integer.MAX_VALUE);
dp[a] = Math.min(dp[a], dp[a - coin] + 1); // overflow if dp[a-coin] is MAX_VALUE

// CORRECT — use a large but safe sentinel
Arrays.fill(dp, amount + 1); // amount+1 is larger than any valid answer
```

---

## Interview Questions

**Q: What makes Knapsack DP "pseudo-polynomial" time?**
A: The time is O(n × W) where W is the capacity value. If W is given as a number in the input, the algorithm is polynomial in n but exponential in the number of bits used to represent W (log W). True polynomial algorithms are measured in input size (number of digits), not value.

**Q: How do you reconstruct which items were included in the knapsack?**
A: After filling the dp table, trace back: start at `dp[n][W]`. If `dp[i][w] != dp[i-1][w]`, item i was included — subtract its weight and move to `dp[i-1][w-weight[i]]`. Otherwise skip to `dp[i-1][w]`. Continue until i=0.

**Q: How does Target Sum (LC 494) reduce to Knapsack?**
A: Assign + or - to each number. Let P = sum of positive, N = sum of negative. `P + N = total`, `P - N = target`. So `P = (total + target) / 2`. Problem reduces to: count subsets summing to P. This is the count-of-subsets-with-target-sum variant of knapsack.

**Q: What's the difference between Coin Change (minimum coins) and Coin Change II (count combinations)?**
A: Both are unbounded knapsack. Minimum coins: `dp[a] = min(dp[a], dp[a-coin]+1)`. Count combinations: `dp[a] += dp[a-coin]`. For count combinations, iterate coins in the outer loop (and amounts left-to-right) to avoid counting permutations as different combinations.

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Target Sum** | 494 | Reduce to count-of-subsets: `P - N = target`, `P = (total + target) / 2`; if sum is odd or target > total → 0 ways |
| 2 | **Ones and Zeroes** | 474 | 2D knapsack — two constraints (max 0s and max 1s); `dp[i][j]` = max strings using at most i zeros and j ones |
| 3 | **Last Stone Weight II** | 1049 | Minimize `|S1 - S2|` where S1+S2=total → find largest subset sum ≤ total/2 (subset sum DP) |
| 4 | **Coin Change II** | 518 | Count combinations (not permutations) — iterate coins in outer loop, amounts inner; order matters for correctness |
| 5 | **Profitable Schemes** | 879 | 2D DP — `dp[members][profit]` = number of schemes; profit dimension is capped at minProfit to avoid unbounded array |
| 6 | **Number of Dice Rolls With Target Sum** | 1155 | Bounded knapsack variant — k dice, each with n faces; count ways to roll exactly target; inner loop is over each face value |
| 7 | **Partition to K Equal Sum Subsets** | 698 | Backtracking + bitmask DP — pure DP state is which elements have been used; bitmask encodes the set membership |

## Related Topics

- **Prerequisite**: Dynamic programming basics, recursion, memoization
- **Previous**: [K-way Merge](./14-k-way-merge.md)
- **Next**: [Topological Sort](./16-topological-sort.md)
- **See also**: [Subsets](./10-subsets.md) — backtracking approach to the same space of problems

---

## Further Reading

- LeetCode "Dynamic Programming" tag — filter for Knapsack problems
- NeetCode DP playlist — covers 0/1 Knapsack, Unbounded, and all LeetCode DP patterns
- "Algorithm Design" by Kleinberg & Tardos — Chapter 6: Dynamic Programming
