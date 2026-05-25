# Pattern 5: Cyclic Sort

> **Before you start**: Given an array containing numbers in range 1 to n, can you sort it in O(n) without extra space? Cyclic Sort exploits the fact that each number tells you exactly where it belongs.

---

## What is Cyclic Sort?

Cyclic Sort is an O(n) in-place sorting algorithm that works specifically when elements are in a **known range** (typically 1 to n or 0 to n-1). It places each number directly at its correct index by repeatedly swapping until everything is in place.

**Analogy**: You have n numbered chairs (1 to n) and n people each holding a number. Walk through the line — if the person you're looking at is not in the right chair, swap them with whoever IS in their chair. Keep going until everyone is seated correctly. One pass through seats, multiple swaps, but each person is moved at most once.

---

## How It Works

For an array where values are in range `[1, n]`:

- Number `k` belongs at index `k - 1`.
- Walk index `i` from 0 to n-1.
- At each position, if `arr[i] != i + 1`, swap `arr[i]` with `arr[arr[i] - 1]` (the correct position for arr[i]).
- Only advance `i` when arr[i] is already correct (or a duplicate is detected).

```
Input: [3, 1, 5, 4, 2]

i=0: arr[0]=3, belongs at index 2. Swap arr[0] & arr[2]: [5, 1, 3, 4, 2]
i=0: arr[0]=5, belongs at index 4. Swap arr[0] & arr[4]: [2, 1, 3, 4, 5]
i=0: arr[0]=2, belongs at index 1. Swap arr[0] & arr[1]: [1, 2, 3, 4, 5]
i=0: arr[0]=1 ✓. Move i=1.
i=1: arr[1]=2 ✓. Move i=2.
i=2: arr[2]=3 ✓. Move i=3.
i=3: arr[3]=4 ✓. Move i=4.
i=4: arr[4]=5 ✓. Done.
Result: [1, 2, 3, 4, 5]
```

---

## Why This Matters

| Approach | Time | Space |
|----------|------|-------|
| Comparison sort (merge/quick) | O(n log n) | O(log n) |
| Counting sort | O(n) | O(n) |
| Cyclic Sort | **O(n)** | **O(1)** |

Cyclic sort beats counting sort on space when you only need to sort (not count). It also reveals structural information: after sorting, any index `i` where `arr[i] != i + 1` is a "problem spot" — either a duplicate or a missing number.

---

## When to Use

Recognition signals:
- Array contains numbers in range **1 to n** (or 0 to n-1)
- "Find the missing number"
- "Find all missing numbers"
- "Find the duplicate number"
- "Find all duplicates"
- "Find the smallest missing positive"
- Problems where "each number should appear exactly once"

---

## Trade-offs

| Pros | Cons |
|------|------|
| O(n) time, O(1) space | Only works for specific range inputs (not general sorting) |
| After sorting, anomalies are easy to spot | Doesn't preserve order of equal elements (unstable) |
| Elegant for missing/duplicate problems | Off-by-one errors are common (0-indexed vs 1-indexed) |

---

## Core Concepts

### Concept 1: Basic Cyclic Sort (range 1 to n)

```java
public void cyclicSort(int[] nums) {
    int i = 0;
    while (i < nums.length) {
        int correctIdx = nums[i] - 1; // number k belongs at index k-1
        if (nums[i] != nums[correctIdx]) {
            // Swap nums[i] with the element at its correct position
            int tmp = nums[correctIdx];
            nums[correctIdx] = nums[i];
            nums[i] = tmp;
        } else {
            i++; // nums[i] is at the right place (or is a duplicate — skip)
        }
    }
}
```

**Why `i` only advances when correct**: If we advanced after every swap, we'd miss elements that were swapped into position `i` and still need to be placed.

---

### Concept 2: Find Missing Number (range 0 to n)

```java
// Array has n numbers in range [0, n], exactly one missing
public int missingNumber(int[] nums) {
    int i = 0;
    while (i < nums.length) {
        int j = nums[i]; // nums[i] should go to index j (0-indexed: val k → index k)
        if (nums[i] < nums.length && nums[i] != nums[j]) {
            int tmp = nums[j]; nums[j] = nums[i]; nums[i] = tmp;
        } else {
            i++;
        }
    }
    // Find the first index where the number doesn't match
    for (int k = 0; k < nums.length; k++) {
        if (nums[k] != k) return k;
    }
    return nums.length; // n itself is missing
}
```

---

### Concept 3: Find the Duplicate Number

```java
// Array has n+1 numbers in range [1, n], exactly one duplicate
public int findDuplicate(int[] nums) {
    int i = 0;
    while (i < nums.length) {
        if (nums[i] != i + 1) {
            int correctIdx = nums[i] - 1;
            if (nums[i] != nums[correctIdx]) {
                int tmp = nums[correctIdx]; nums[correctIdx] = nums[i]; nums[i] = tmp;
            } else {
                return nums[i]; // found the duplicate (can't place it — slot taken by same value)
            }
        } else {
            i++;
        }
    }
    return -1;
}
```

**Duplicate detection**: When you try to swap `nums[i]` to its correct index but find the same number already there — that's your duplicate.

---

## Common Patterns

### Pattern A: Find All Missing Numbers

**Problem**: Array of n numbers in range [1, n], some numbers appear twice and some are missing. Find all missing numbers.

```java
public List<Integer> findAllMissingNumbers(int[] nums) {
    // Step 1: Cyclic sort
    int i = 0;
    while (i < nums.length) {
        int correctIdx = nums[i] - 1;
        if (nums[i] != nums[correctIdx]) {
            int tmp = nums[correctIdx]; nums[correctIdx] = nums[i]; nums[i] = tmp;
        } else {
            i++;
        }
    }

    // Step 2: Collect indices where nums[i] != i+1
    List<Integer> missing = new ArrayList<>();
    for (int k = 0; k < nums.length; k++) {
        if (nums[k] != k + 1) {
            missing.add(k + 1);
        }
    }
    return missing;
}
```

---

### Pattern B: Find All Duplicates

**Problem**: Array of n numbers in range [1, n], some numbers appear twice. Find all duplicates.

```java
public List<Integer> findAllDuplicates(int[] nums) {
    // Step 1: Cyclic sort
    int i = 0;
    while (i < nums.length) {
        int correctIdx = nums[i] - 1;
        if (nums[i] != nums[correctIdx]) {
            int tmp = nums[correctIdx]; nums[correctIdx] = nums[i]; nums[i] = tmp;
        } else {
            i++;
        }
    }

    // Step 2: Collect values where they don't match their index
    List<Integer> duplicates = new ArrayList<>();
    for (int k = 0; k < nums.length; k++) {
        if (nums[k] != k + 1) {
            duplicates.add(nums[k]); // nums[k] is the duplicate (k+1 is missing)
        }
    }
    return duplicates;
}
```

---

### Pattern C: First Missing Positive

**Problem**: Find the smallest positive integer missing from an unsorted array (may contain negatives and numbers > n).

```java
public int firstMissingPositive(int[] nums) {
    int n = nums.length;

    // Step 1: Cyclic sort — only place numbers in range [1, n]
    int i = 0;
    while (i < n) {
        int correctIdx = nums[i] - 1;
        if (nums[i] > 0 && nums[i] <= n && nums[i] != nums[correctIdx]) {
            int tmp = nums[correctIdx]; nums[correctIdx] = nums[i]; nums[i] = tmp;
        } else {
            i++;
        }
    }

    // Step 2: Find first index where nums[i] != i+1
    for (int k = 0; k < n; k++) {
        if (nums[k] != k + 1) return k + 1;
    }
    return n + 1; // 1..n are all present → answer is n+1
}
```

**Key difference**: Skip numbers outside [1, n] range instead of trying to place them.

---

## Quick Check

1. Why does the algorithm not advance `i` after a swap?
2. What is the correct index for value `k` in a 1-indexed range? In a 0-indexed range?
3. After cyclic sort, how do you find: (a) missing numbers? (b) duplicates?
4. Why do you check `nums[i] != nums[correctIdx]` before swapping in the duplicate-finding code?
5. What happens if you run cyclic sort on an array with values outside [1, n]?

---

## Practice Problems

### Beginner
- **Missing Number** (LeetCode 268) — find the one missing from [0, n]
- **Find All Numbers Disappeared in an Array** (LeetCode 448) — find all missing

### Intermediate
- **Find the Duplicate Number** (LeetCode 287) — one duplicate in [1, n]
- **Find All Duplicates in an Array** (LeetCode 442) — all duplicates in [1, n]
- **Set Mismatch** (LeetCode 645) — find the duplicate and the missing number

### Advanced
- **First Missing Positive** (LeetCode 41) — smallest missing positive (hard, O(1) space required)
- **Find the Smallest Missing Non-Negative Integer** — variation with 0-indexed range
- **Kth Missing Positive Number** (LeetCode 1539) — binary search variant

---

## Common Mistakes

### Mistake 1: Advancing i after every swap
```java
// WRONG — skips elements that were just swapped into position i
swap(nums, i, correctIdx);
i++; // BUG: the new nums[i] may still need to be placed

// CORRECT — only advance when nums[i] is correctly placed
if (nums[i] != nums[correctIdx]) {
    swap(nums, i, correctIdx);
    // Don't increment i — check nums[i] again
} else {
    i++;
}
```

### Mistake 2: Off-by-one (0-indexed vs 1-indexed range)
```java
// Range [1, n]: number k goes to index k-1
int correctIdx = nums[i] - 1;

// Range [0, n-1]: number k goes to index k
int correctIdx = nums[i];

// Always clarify the range first!
```

### Mistake 3: Infinite loop when there are out-of-range values
```java
// WRONG — tries to place nums[i]=0 at index -1 → ArrayIndexOutOfBounds or infinite loop
if (nums[i] != nums[correctIdx]) swap(...)

// CORRECT — guard against out-of-range values
if (nums[i] > 0 && nums[i] <= n && nums[i] != nums[correctIdx]) {
    swap(nums, i, correctIdx);
} else {
    i++;
}
```

### Mistake 4: Forgetting the duplicate check before swapping
```java
// WRONG — infinite loop when nums[i] == nums[correctIdx] (duplicate at correct index)
while (nums[i] != nums[correctIdx]) swap(...) // spins forever if both slots have same value

// CORRECT — break out of loop when both positions hold the same value
if (nums[i] != nums[correctIdx]) {
    swap(nums, i, correctIdx);
} else {
    i++;  // can't place this duplicate — skip it
}
```

---

## Interview Questions

**Q: Why is Cyclic Sort O(n) even though there are swaps inside the loop?**
A: Each element is swapped at most once — it goes directly to its correct position. Once a number is at the right index, it's never touched again. So despite the nested structure, the total number of swaps across the entire algorithm is at most n.

**Q: Can you find the missing number without modifying the array?**
A: Yes — use math: expected sum = n*(n+1)/2, actual sum = sum of array. Difference = missing number. Or use XOR: XOR of 0..n with XOR of all elements. Both are O(n) time, O(1) space, no mutation. Cyclic sort is useful when you need to find multiple missing/duplicate numbers.

**Q: What if the array has both missing numbers AND extra numbers (not in [1,n])?**
A: Use First Missing Positive pattern — guard the swap with `nums[i] > 0 && nums[i] <= n`. Numbers outside the range can't be placed and are effectively ignored; those indices will show anomalies after the sort.

**Q: How does this compare to using a HashSet for finding duplicates/missing?**
A: HashSet approach is O(n) time and O(n) space. Cyclic sort is O(n) time and O(1) space — it modifies the input array to use it as a "presence map." If you cannot modify the input, use HashSet or the XOR/math tricks.

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Find the Duplicate Number** | 287 | Cyclic sort approach works; also solvable with Floyd's cycle detection (treat array as a linked list of indices) — two very different solutions |
| 2 | **First Missing Positive** | 41 | Hard-rated but pure cyclic sort — guard for out-of-range values; most struggle because they don't recognize the pattern |
| 3 | **Find All Numbers Disappeared in an Array** | 448 | Two passes: negate values at visited indices, then collect indices still positive — a negation variant of cyclic sort |
| 4 | **Set Mismatch** | 645 | Find both the duplicate AND the missing in one pass — sort first or use the negation trick |
| 5 | **Couples Holding Hands** | 765 | Cyclic permutation counting — count cycles in the "who should sit next to who" permutation; minimum swaps = n - (number of cycles) |
| 6 | **Kth Missing Positive Number** | 1539 | Can do with cyclic-sort intuition OR with binary search on the answer — good to know both |

## Related Topics

- **Prerequisite**: Array indexing, in-place swapping
- **Previous**: [Merge Intervals](./04-merge-intervals.md)
- **Next**: [LinkedList Reversal](./06-linkedlist-reversal.md)
- **See also**: [Two Pointers](./02-two-pointers.md) — Dutch National Flag is a related in-place partition technique

---

## Further Reading

- LeetCode "Cyclic Sort" tag — small but focused set of problems
- "Educative.io — Grokking the Coding Interview" — Cyclic Sort pattern chapter
- LeetCode 41 (First Missing Positive) editorial — explains the index-as-hash-map trick
