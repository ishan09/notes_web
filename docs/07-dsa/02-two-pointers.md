# Pattern 2: Two Pointers

> **Before you start**: Can you solve this with nested loops? Two Pointers eliminates the inner loop — dropping O(n²) to O(n) by using two indices that move through the data intelligently.

---

## What is Two Pointers?

Two Pointers is a technique where you maintain **two index variables** that traverse a data structure — usually an array or string — to find pairs, triplets, or subarrays that satisfy a condition.

**Analogy**: Imagine two people walking toward each other on a sorted street looking for house numbers that sum to a target. One walks from the left (small numbers), one from the right (large numbers). If their sum is too big, the right person steps left; too small, the left person steps right. They converge without backtracking.

---

## How It Works

Two main modes:

**Mode 1 — Opposite Ends (converging)**
```
[←—————→]
 L       R
```
Both pointers start at opposite ends and move toward each other. Used when the array is sorted and you're looking for a pair.

**Mode 2 — Same Direction (sliding/fast-slow variant)**
```
[→→      ]
 S F
```
Both start at the beginning. One moves faster or under a different condition. Used for partitioning or removing duplicates.

---

## Why This Matters

| Approach | Time | Space |
|----------|------|-------|
| Brute force (nested loops) | O(n²) | O(1) |
| Two Pointers | **O(n)** | O(1) |

For n = 10,000: brute force = 100M operations; two pointers = 10,000.

---

## When to Use

Recognition signals:
- "Find a pair / triplet that sums to target"
- "Remove duplicates in-place"
- "Partition array around a value"
- "Reverse or compare a string/array"
- Input is **sorted** (or can be sorted with acceptable cost)
- You need O(1) space

---

## Trade-offs

| Pros | Cons |
|------|------|
| O(n) time, O(1) space | Usually requires sorted input |
| In-place — no extra array | Not obvious which mode to use at first |
| Simple to implement | Tricky off-by-one errors at boundaries |
| Works for pairs, triplets, subarrays | Doesn't generalise to k-sum easily |

---

## Core Concepts

### Concept 1: Opposite Ends — Pair with Target Sum

```java
// Precondition: arr is sorted
public int[] twoSum(int[] arr, int target) {
    int left = 0, right = arr.length - 1;

    while (left < right) {
        int sum = arr[left] + arr[right];
        if (sum == target) {
            return new int[]{left, right};
        } else if (sum < target) {
            left++;   // need larger sum → move left forward
        } else {
            right--;  // need smaller sum → move right back
        }
    }
    return new int[]{-1, -1}; // not found
}
```

**Key invariant**: At every step, all pairs to the left of `left` and to the right of `right` have already been eliminated.

---

### Concept 2: Same Direction — Remove Duplicates In-Place

```java
// Returns new length; array modified in-place
public int removeDuplicates(int[] arr) {
    if (arr.length == 0) return 0;

    int slow = 0; // points to last unique element written

    for (int fast = 1; fast < arr.length; fast++) {
        if (arr[fast] != arr[slow]) {
            slow++;
            arr[slow] = arr[fast];
        }
        // fast always advances; slow only advances on a new unique value
    }
    return slow + 1;
}
```

**Key invariant**: Everything at index ≤ slow is unique and in order.

---

### Concept 3: Partition — Dutch National Flag / Sorting by Color

```java
// Sort array containing only 0, 1, 2 in-place (Dutch National Flag)
public void sortColors(int[] nums) {
    int low = 0, mid = 0, high = nums.length - 1;

    while (mid <= high) {
        if (nums[mid] == 0) {
            swap(nums, low++, mid++);
        } else if (nums[mid] == 1) {
            mid++;
        } else { // nums[mid] == 2
            swap(nums, mid, high--);
            // don't increment mid — swapped element not yet examined
        }
    }
}

private void swap(int[] arr, int i, int j) {
    int tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
}
```

**Three-pointer variant**: `low`, `mid`, `high` each maintain an invariant about what's to their left/right.

---

## Common Patterns

### Pattern A: 3Sum (Triplets that sum to zero)

**Problem**: Find all unique triplets in an array that sum to 0.

```java
public List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> result = new ArrayList<>();

    for (int i = 0; i < nums.length - 2; i++) {
        // Skip duplicates for the first element
        if (i > 0 && nums[i] == nums[i - 1]) continue;

        int left = i + 1, right = nums.length - 1;
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            if (sum == 0) {
                result.add(Arrays.asList(nums[i], nums[left], nums[right]));
                // Skip duplicates for second and third elements
                while (left < right && nums[left] == nums[left + 1]) left++;
                while (left < right && nums[right] == nums[right - 1]) right--;
                left++;
                right--;
            } else if (sum < 0) {
                left++;
            } else {
                right--;
            }
        }
    }
    return result;
}
```

**Why it works**: Fix one element with the outer loop (O(n)), then use Two Pointers for the remaining pair (O(n)) → O(n²) total, but O(n³) brute force avoided.

---

### Pattern B: Container With Most Water

**Problem**: Given n vertical lines at positions 0..n-1 with heights, find two lines that form a container holding the most water.

```java
public int maxArea(int[] height) {
    int left = 0, right = height.length - 1;
    int maxWater = 0;

    while (left < right) {
        int width = right - left;
        int h = Math.min(height[left], height[right]);
        maxWater = Math.max(maxWater, width * h);

        // Move the shorter side — moving the taller side can only reduce width
        // without a chance of increasing height
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    return maxWater;
}
```

**Key insight**: Always move the pointer at the shorter line. Moving the taller line can never increase the water (height is still bounded by the short line, and width decreases).

---

### Pattern C: Squaring a Sorted Array

**Problem**: Given a sorted array (may have negatives), return a sorted array of squares.

```java
public int[] sortedSquares(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];
    int left = 0, right = n - 1;
    int pos = n - 1; // fill result from the back

    while (left <= right) {
        int leftSq = nums[left] * nums[left];
        int rightSq = nums[right] * nums[right];
        if (leftSq > rightSq) {
            result[pos--] = leftSq;
            left++;
        } else {
            result[pos--] = rightSq;
            right--;
        }
    }
    return result;
}
```

**Why from the back**: The largest squares are always at the ends of a sorted array (most negative or most positive). Fill the result array from the largest position down.

---

## Quick Check

1. Why does Two Pointers require a sorted array for the opposite-ends pattern?
2. What is the invariant maintained by the `slow` pointer in the remove-duplicates pattern?
3. In Container With Most Water, why do you move the shorter line's pointer, not the taller one?
4. How do you handle duplicates in 3Sum to avoid duplicate triplets in the result?
5. Can Two Pointers work on a linked list? What's the limitation vs. an array?

---

## Practice Problems

### Beginner
- **Two Sum II** (LeetCode 167) — sorted array, return 1-indexed pair
- **Remove Duplicates from Sorted Array** (LeetCode 26) — in-place, return new length
- **Valid Palindrome** (LeetCode 125) — compare from both ends
- **Reverse String** (LeetCode 344) — swap in-place

### Intermediate
- **3Sum** (LeetCode 15) — find all unique triplets summing to zero
- **Container With Most Water** (LeetCode 11) — maximize area
- **Squares of a Sorted Array** (LeetCode 977) — sorted squares
- **3Sum Closest** (LeetCode 16) — find triplet sum closest to target
- **Sort Colors** (LeetCode 75) — Dutch National Flag (0s, 1s, 2s)

### Advanced
- **4Sum** (LeetCode 18) — extend 3Sum with one more outer loop
- **Trapping Rain Water** (LeetCode 42) — track left/right max heights
- **Minimum Window Substring** (LeetCode 76) — Two Pointers + frequency map
- **Partition Labels** (LeetCode 763) — greedy + two indices

---

## Common Mistakes

### Mistake 1: Forgetting to skip duplicates in k-Sum
```java
// WRONG — produces duplicate triplets
result.add(Arrays.asList(nums[i], nums[left], nums[right]));
left++;
right--;

// CORRECT — skip duplicates before moving
while (left < right && nums[left] == nums[left + 1]) left++;
while (left < right && nums[right] == nums[right - 1]) right--;
left++;
right--;
```

### Mistake 2: Using Two Pointers on an unsorted array without sorting first
```java
// WRONG on unsorted input — the logic of "move left to increase sum" breaks
int left = 0, right = arr.length - 1;

// CORRECT — sort first (if O(n log n) is acceptable)
Arrays.sort(arr);
int left = 0, right = arr.length - 1;
```

### Mistake 3: Off-by-one when pointers can be equal
```java
// WRONG — misses the case where left == right points to the middle element
while (left < right) { ... }  // fine for pairs

// For odd-length palindromes, you may want left <= right depending on problem
```

### Mistake 4: Not considering overflow for large numbers
```java
// WRONG — int overflow for large values
int sum = arr[left] + arr[right];

// CORRECT
long sum = (long) arr[left] + arr[right];
```

---

## Interview Questions

**Q: When would you choose Two Pointers over a HashMap for pair finding?**
A: HashMap gives O(n) time but O(n) space. Two Pointers gives O(n) time and O(1) space — but requires sorted input. If the array is already sorted or sorting is cheap (O(n log n) acceptable), prefer Two Pointers for the space saving.

**Q: How does Two Pointers scale to k-Sum problems?**
A: Fix k-2 elements with nested loops (O(n^(k-2))) then apply Two Pointers for the last pair. Each additional element adds one more loop layer. 2Sum = O(n), 3Sum = O(n²), 4Sum = O(n³).

**Q: Can you use Two Pointers on a LinkedList?**
A: You can use the fast/slow pointer variant (see Pattern 3: Fast & Slow Pointers), but the opposite-ends variant doesn't work on singly linked lists because you can't efficiently go backward. You'd need to convert to array first.

**Q: Walk me through Trapping Rain Water with Two Pointers.**
A: Maintain `leftMax` and `rightMax`. At each step, if `leftMax < rightMax`, the water at `left` is `leftMax - height[left]` (the right side is guaranteed taller). Move `left` forward. Otherwise, process `right`. This avoids the O(n) extra space of the precomputed arrays approach.

---

## Mixed Practice (Test Your Understanding)

These problems push beyond the basic pattern — each has a twist that makes it non-obvious.

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Trapping Rain Water** | 42 | Two pointers track `leftMax`/`rightMax`; water fills from the shorter side, not the current height |
| 2 | **4Sum** | 18 | Two outer loops + two pointers; dedup at every level independently |
| 3 | **Minimum Size Subarray Sum** | 209 | Looks like Two Pointers but is actually dynamic window — the two pointers expand AND contract based on sum |
| 4 | **Boats to Save People** | 881 | Sort + opposite ends; greedy: pair heaviest with lightest if they fit, else heaviest goes alone |
| 5 | **Longest Mountain in Array** | 845 | Two passes (expand left and right from each peak); can also be done with two pointers in one pass |
| 6 | **Bag of Tokens** | 948 | Sort + opposite ends with a twist: spend cheapest to gain points, sell most expensive to gain power |
| 7 | **3Sum Smaller** | 259 | Count pairs where sum < target; when `sum < target`, ALL pairs between `left` and `right` count → `right - left` at once |

## Related Topics

- **Prerequisite**: Array basics, sorting (Arrays.sort)
- **Previous**: [Sliding Window](./01-sliding-window.md) — also O(n) on arrays, uses a window instead of two independent pointers
- **Next**: [Fast & Slow Pointers](./03-fast-slow-pointers.md) — Two Pointers variant for LinkedLists and cycle detection
- **See also**: [Merge Intervals](./04-merge-intervals.md) — often combined after sorting

---

## Further Reading

- LeetCode Two Pointers tag — sort by Acceptance to find approachable problems first
- "Elements of Programming Interviews" Chapter 6 — Arrays
- NeetCode Two Pointers playlist for video walkthroughs of the key problems
