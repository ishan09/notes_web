# Pattern 11: Modified Binary Search

> **Before you start**: Can you apply binary search to something that isn't a simple sorted array? Modified Binary Search extends the classic algorithm to rotated arrays, ranges, unknown lengths, and answer-space searches — all still O(log n).

---

## What is Modified Binary Search?

Classic binary search finds a target in a sorted array in O(log n). Modified Binary Search applies the same **halving logic** to more complex problems by identifying which half retains the "sortedness" property, or by binary searching on the *answer space* rather than the input array.

**Analogy**: Classic search is looking up a word in a dictionary. Modified search is like guessing a number between 1 and 1,000,000 — each guess eliminates half the space. As long as you can determine "go higher" or "go lower," binary search applies.

---

## How It Works

**Core template**:

```
left = 0, right = n - 1

while left <= right:
    mid = left + (right - left) / 2  ← avoids integer overflow

    if condition_met(mid):
        record answer, try to do better
    elif go_right(mid):
        left = mid + 1
    else:
        right = mid - 1
```

**Key question to answer**: "Can I determine, in O(1), whether the answer is in the left half or the right half?" If yes → binary search applies.

---

## Why This Matters

| Approach | Time |
|----------|------|
| Linear scan | O(n) |
| Modified Binary Search | **O(log n)** |

Even for non-trivial problems (rotated arrays, answer-space search), the O(log n) bound holds as long as the decision at each midpoint is O(1).

---

## When to Use

Recognition signals:
- Sorted array (possibly rotated, partially sorted, or with modifications)
- "Find the first/last occurrence"
- "Find a peak element"
- "Search in rotated array"
- "Find minimum in rotated sorted array"
- "Guess a number / minimize/maximize a value" where you can verify a candidate answer
- "Koko eating bananas / ship packages in D days" (answer-space binary search)

---

## Trade-offs

| Pros | Cons |
|------|------|
| O(log n) — massive speedup | Requires identifying the monotone property; not always obvious |
| Works on sorted arrays with modifications | Off-by-one errors are extremely common |
| Answer-space search solves "minimize max" problems elegantly | Requires careful analysis of left/right conditions |

---

## Core Concepts

### Concept 1: Order-Agnostic Binary Search (ascending or descending)

```java
public int binarySearch(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    boolean isAscending = arr[left] < arr[right];

    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;

        if (isAscending) {
            if (target < arr[mid]) right = mid - 1;
            else left = mid + 1;
        } else {
            if (target > arr[mid]) right = mid - 1;
            else left = mid + 1;
        }
    }
    return -1;
}
```

---

### Concept 2: Search in Rotated Sorted Array

```java
public int search(int[] nums, int target) {
    int left = 0, right = nums.length - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;

        // Determine which half is sorted
        if (nums[left] <= nums[mid]) {
            // Left half is sorted
            if (target >= nums[left] && target < nums[mid]) {
                right = mid - 1; // target in left sorted half
            } else {
                left = mid + 1;  // target in right (rotated) half
            }
        } else {
            // Right half is sorted
            if (target > nums[mid] && target <= nums[right]) {
                left = mid + 1;  // target in right sorted half
            } else {
                right = mid - 1; // target in left (rotated) half
            }
        }
    }
    return -1;
}
```

**Key insight**: In a rotated array, one half is always sorted. Check which half is sorted, then determine if the target falls in that sorted half.

---

### Concept 3: Binary Search on Answer Space

```java
// Koko Eating Bananas: find minimum eating speed to finish all piles in h hours
public int minEatingSpeed(int[] piles, int h) {
    int left = 1;
    int right = Arrays.stream(piles).max().getAsInt(); // max possible speed

    while (left < right) { // find the leftmost valid speed
        int mid = left + (right - left) / 2;
        if (canFinish(piles, mid, h)) {
            right = mid; // mid works — try slower
        } else {
            left = mid + 1; // too slow — try faster
        }
    }
    return left;
}

private boolean canFinish(int[] piles, int speed, int h) {
    int hours = 0;
    for (int pile : piles) {
        hours += (pile + speed - 1) / speed; // ceiling division
    }
    return hours <= h;
}
```

**Pattern**: Define a monotone predicate (can I finish at speed `k`?). Binary search on the answer space [1, max] for the boundary where the predicate flips from false to true.

---

## Common Patterns

### Pattern A: Find First and Last Position

**Problem**: Find the first and last occurrence of a target in a sorted array.

```java
public int[] searchRange(int[] nums, int target) {
    return new int[]{findFirst(nums, target), findLast(nums, target)};
}

private int findFirst(int[] nums, int target) {
    int left = 0, right = nums.length - 1, result = -1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) {
            result = mid;
            right = mid - 1; // keep searching LEFT for earlier occurrence
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return result;
}

private int findLast(int[] nums, int target) {
    int left = 0, right = nums.length - 1, result = -1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) {
            result = mid;
            left = mid + 1; // keep searching RIGHT for later occurrence
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return result;
}
```

---

### Pattern B: Find Peak Element

**Problem**: A peak element is greater than its neighbors. Find any peak index. Array has no two adjacent equal elements.

```java
public int findPeakElement(int[] nums) {
    int left = 0, right = nums.length - 1;

    while (left < right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] > nums[mid + 1]) {
            right = mid;     // peak is at mid or to the left
        } else {
            left = mid + 1;  // peak is to the right
        }
    }
    return left; // left == right is the peak
}
```

**Why it works**: If `nums[mid] < nums[mid+1]`, the sequence is still climbing → a peak must exist to the right. If `nums[mid] > nums[mid+1]`, we're descending → a peak is at or to the left.

---

### Pattern C: Find Minimum in Rotated Sorted Array

```java
public int findMin(int[] nums) {
    int left = 0, right = nums.length - 1;

    while (left < right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] > nums[right]) {
            left = mid + 1;  // minimum is in the right (rotated) half
        } else {
            right = mid;     // minimum is at mid or in the left half
        }
    }
    return nums[left];
}
```

---

## Quick Check

1. Why use `mid = left + (right - left) / 2` instead of `(left + right) / 2`?
2. In the rotated array search, how do you determine which half is sorted?
3. What's the difference between `while (left <= right)` and `while (left < right)` — when do you use each?
4. What makes a problem suitable for answer-space binary search?
5. In Find First Position, why do you set `right = mid - 1` even when you find the target?

---

## Practice Problems

### Beginner
- **Binary Search** (LeetCode 704) — classic sorted array search
- **Search Insert Position** (LeetCode 35) — find insertion point
- **First Bad Version** (LeetCode 278) — find boundary in monotone predicate

### Intermediate
- **Search in Rotated Sorted Array** (LeetCode 33) — rotated array search
- **Find Minimum in Rotated Sorted Array** (LeetCode 153) — find pivot
- **Find First and Last Position** (LeetCode 34) — two binary searches
- **Find Peak Element** (LeetCode 162) — peak in unsorted array
- **Koko Eating Bananas** (LeetCode 875) — answer-space binary search

### Advanced
- **Search in a 2D Matrix** (LeetCode 74) — treat as flattened 1D array
- **Median of Two Sorted Arrays** (LeetCode 4) — binary search on partition point
- **Split Array Largest Sum** (LeetCode 410) — minimize maximum subarray sum
- **Ship Packages Within D Days** (LeetCode 1011) — capacity answer-space search

---

## Common Mistakes

### Mistake 1: Integer overflow in midpoint calculation
```java
// WRONG — (left + right) can overflow for large indices
int mid = (left + right) / 2;

// CORRECT
int mid = left + (right - left) / 2;
```

### Mistake 2: Wrong loop condition (off-by-one)
```java
// left <= right: search space includes both endpoints, terminates when left > right
// Use when: searching for an exact target, may return -1 if not found

// left < right: terminates when left == right (one element remains)
// Use when: finding a boundary (first true, minimum, peak) — result is left at end

// Mixing them causes infinite loops or missed elements
```

### Mistake 3: Moving mid into the wrong half for rotated array
```java
// Common confusion: which condition means "left half is sorted"?
// LEFT half is sorted when: nums[left] <= nums[mid]
// RIGHT half is sorted when: nums[mid] <= nums[right]
// (They're mutually exclusive in a rotated array with no duplicates)
```

### Mistake 4: Forgetting ceiling division in answer-space problems
```java
// WRONG — integer division truncates; pile of 5 bananas at speed 3 takes 2 hours not 1
int hours = pile / speed;

// CORRECT — ceiling division
int hours = (pile + speed - 1) / speed;
// Or: (int) Math.ceil((double) pile / speed);
```

---

## Interview Questions

**Q: What's the most common binary search bug?**
A: Off-by-one errors in the loop condition (`<=` vs `<`) and in pointer movement (`mid` vs `mid+1`/`mid-1`). The fix: always trace through a 2-element and 3-element example to verify termination and correctness.

**Q: How do you handle duplicates in a rotated array search?**
A: With duplicates (e.g., `[1,3,1,1,1]`), you can't always determine which half is sorted. Fall back to linear scan in the ambiguous case: `if (nums[left] == nums[mid] && nums[mid] == nums[right]) { left++; right--; }`. Worst case becomes O(n).

**Q: Explain binary search on answer space with an example.**
A: "Ship packages in D days" — you're looking for the minimum ship capacity. The key: the predicate "can I ship all packages in D days with capacity C" is monotone (once true for C, it's true for all larger C). Binary search on C in range [max package, total weight].

**Q: Can binary search work on floating point answers?**
A: Yes — instead of `left = mid + 1`, do `left = mid` and iterate a fixed number of times (e.g., 100 iterations gives precision of (right-left) / 2^100). Useful for "find the square root" type problems.

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Median of Two Sorted Arrays** | 4 | Hard — binary search on the partition point of the smaller array; must handle even/odd total length and edge cases |
| 2 | **Search a 2D Matrix II** | 240 | Matrix where each row and column is sorted — start at top-right: go left if too big, go down if too small; not binary search but same idea |
| 3 | **Find K Closest Elements** | 658 | Binary search for the left boundary of the k-element window — compare `target - arr[mid]` vs `arr[mid+k] - target` |
| 4 | **Minimum Speed to Arrive on Time** | 1870 | Answer-space binary search — predicate: `sum(ceil(dist/speed)) <= hour`; ceiling division for all but last leg |
| 5 | **Capacity to Ship Packages Within D Days** | 1011 | Answer space = [max(weight), sum(weights)]; verify function counts days needed at a given capacity |
| 6 | **Find Peak Element II (2D)** | 1901 | Binary search on columns — for mid column, find its row-maximum; if neighbor in right column is larger, peak is right; else left |
| 7 | **Russian Doll Envelopes** | 354 | Sort by width ASC, then height DESC; then find LIS on heights — the DESC trick prevents using two envelopes of same width |

## Related Topics

- **Prerequisite**: Arrays, sorting concepts
- **Previous**: [Subsets](./10-subsets.md)
- **Next**: [Bitwise XOR](./12-bitwise-xor.md)
- **See also**: [Top K Elements](./13-top-k-elements.md) — quick select is another O(expected n) search technique

---

## Further Reading

- LeetCode "Binary Search" tag — hundreds of problems, sorted by difficulty
- "Binary Search Template" — LeetCode discuss has a canonical 3-template explanation
- NeetCode Binary Search playlist — covers the answer-space pattern thoroughly
