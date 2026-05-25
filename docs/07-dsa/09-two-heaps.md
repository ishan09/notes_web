# Pattern 9: Two Heaps

> **Before you start**: Can you find the median of a data stream as numbers keep arriving? Two Heaps maintains a max-heap for the lower half and a min-heap for the upper half — giving O(1) median access and O(log n) insertion.

---

## What is Two Heaps?

Two Heaps uses **two priority queues** — a max-heap for the smaller half and a min-heap for the larger half — to efficiently answer queries about the **middle** of a dataset.

**Analogy**: Imagine sorting people by height. Split them into two groups: the shorter half (tallest person in front — max-heap) and the taller half (shortest person in front — min-heap). The median is either the front of one heap or the average of both fronts. New arrivals join the appropriate group, then you rebalance so sizes stay equal (or off by 1).

---

## How It Works

**Invariants to maintain**:
1. Every element in `maxHeap` (lower half) ≤ every element in `minHeap` (upper half).
2. `|maxHeap.size() - minHeap.size()| <= 1` (sizes are balanced or off by 1).

**Add a number**:
1. If `num <= maxHeap.peek()` → add to maxHeap, else add to minHeap.
2. Rebalance: if one heap grows more than 1 larger, move its top to the other.

**Find median**:
- If both heaps are equal size → average of both tops.
- If maxHeap is larger → maxHeap top is the median.

---

## Why This Matters

| Operation | Sorted Array | Two Heaps |
|-----------|-------------|-----------|
| Insert | O(n) | **O(log n)** |
| Find median | O(1) | **O(1)** |
| Space | O(n) | O(n) |

A sorted array gives O(1) median but O(n) insertion. Two Heaps gives O(log n) insertion and O(1) median — the ideal balance for a streaming scenario.

---

## When to Use

Recognition signals:
- "Median of a data stream"
- "Sliding window median"
- "Scheduling: find/maintain middle element"
- Problem involves tracking the **middle** of a dynamically changing dataset
- You need both the largest of the small half and smallest of the large half

---

## Trade-offs

| Pros | Cons |
|------|------|
| O(1) median, O(log n) add | More complex than a single sorted structure |
| Works for streaming (online) data | Deletion is expensive (O(n) in Java's PriorityQueue) |
| Handles even/odd counts naturally | Two structures to keep in sync — bugs are easy |

---

## Core Concepts

### Concept 1: Find Median from Data Stream

```java
class MedianFinder {
    private PriorityQueue<Integer> maxHeap; // lower half — max at top
    private PriorityQueue<Integer> minHeap; // upper half — min at top

    public MedianFinder() {
        maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        minHeap = new PriorityQueue<>();
    }

    public void addNum(int num) {
        // Step 1: Add to appropriate heap
        if (maxHeap.isEmpty() || num <= maxHeap.peek()) {
            maxHeap.offer(num);
        } else {
            minHeap.offer(num);
        }

        // Step 2: Rebalance — sizes should differ by at most 1
        if (maxHeap.size() > minHeap.size() + 1) {
            minHeap.offer(maxHeap.poll());
        } else if (minHeap.size() > maxHeap.size()) {
            maxHeap.offer(minHeap.poll());
        }
    }

    public double findMedian() {
        if (maxHeap.size() == minHeap.size()) {
            return (maxHeap.peek() + minHeap.peek()) / 2.0;
        }
        return maxHeap.peek(); // maxHeap has one extra
    }
}
```

**Why maxHeap stores the median for odd counts**: We always keep maxHeap with `size >= minHeap.size()`. When total is odd, maxHeap has one more element — its top is the true median.

---

### Concept 2: Sliding Window Median

```java
// Find median of every window of size k as it slides through the array
public double[] medianSlidingWindow(int[] nums, int k) {
    double[] result = new double[nums.length - k + 1];
    PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
    PriorityQueue<Integer> minHeap = new PriorityQueue<>();

    for (int i = 0; i < nums.length; i++) {
        // Add new element
        if (maxHeap.isEmpty() || nums[i] <= maxHeap.peek()) {
            maxHeap.offer(nums[i]);
        } else {
            minHeap.offer(nums[i]);
        }
        rebalance(maxHeap, minHeap);

        // Window is full — record median
        if (i >= k - 1) {
            result[i - k + 1] = (maxHeap.size() == minHeap.size())
                ? (maxHeap.peek() / 2.0 + minHeap.peek() / 2.0)
                : maxHeap.peek();

            // Remove the element going out of window
            int outgoing = nums[i - k + 1];
            if (outgoing <= maxHeap.peek()) {
                maxHeap.remove(outgoing); // O(n) — acceptable for interview; real solution uses lazy deletion
            } else {
                minHeap.remove(outgoing);
            }
            rebalance(maxHeap, minHeap);
        }
    }
    return result;
}

private void rebalance(PriorityQueue<Integer> maxHeap, PriorityQueue<Integer> minHeap) {
    if (maxHeap.size() > minHeap.size() + 1) {
        minHeap.offer(maxHeap.poll());
    } else if (minHeap.size() > maxHeap.size()) {
        maxHeap.offer(minHeap.poll());
    }
}
```

**Note on deletion**: Java's `PriorityQueue.remove(element)` is O(n). For production, use a TreeMap-based approach or lazy deletion with a "to-delete" set.

---

### Concept 3: Find Maximize Capital (Scheduling with Constraints)

**Problem**: You can complete at most k projects. Each project needs minimum capital and gives profit. Start with `w` capital. Maximize final capital.

```java
public int findMaximizedCapital(int k, int w, int[] profits, int[] capital) {
    int n = profits.length;
    // Max-heap: available projects sorted by profit (pick highest profit)
    PriorityQueue<Integer> availableProjects = new PriorityQueue<>(Collections.reverseOrder());
    // Min-heap: all projects sorted by required capital
    PriorityQueue<int[]> allProjects = new PriorityQueue<>((a, b) -> a[0] - b[0]);

    for (int i = 0; i < n; i++) {
        allProjects.offer(new int[]{capital[i], profits[i]});
    }

    for (int i = 0; i < k; i++) {
        // Unlock all projects we can now afford
        while (!allProjects.isEmpty() && allProjects.peek()[0] <= w) {
            availableProjects.offer(allProjects.poll()[1]);
        }
        if (availableProjects.isEmpty()) break; // no affordable projects left
        w += availableProjects.poll(); // complete the most profitable available project
    }
    return w;
}
```

**Two-heap pattern**: One heap (min by capital) determines what's available; another heap (max by profit) determines what to pick.

---

## Common Patterns Summary

| Problem | Max-Heap holds | Min-Heap holds |
|---------|---------------|---------------|
| Median Finder | Lower half | Upper half |
| Sliding Window Median | Lower half of window | Upper half of window |
| Maximize Capital | Available profits | All projects by capital cost |

---

## Quick Check

1. Why do you use a max-heap for the lower half and a min-heap for the upper half?
2. After adding a number, what two conditions do you check to rebalance?
3. When total elements is even vs. odd, how does `findMedian()` differ?
4. What's the time complexity of `PriorityQueue.remove(element)` in Java and why does it matter?
5. In the Maximize Capital problem, why is a min-heap used for projects sorted by capital?

---

## Practice Problems

### Beginner
- **Find Median from Data Stream** (LeetCode 295) — online median with two heaps

### Intermediate
- **IPO / Maximize Capital** (LeetCode 502) — two heaps for greedy scheduling
- **Find Right Interval** (LeetCode 436) — sorted structure + binary search variation

### Advanced
- **Sliding Window Median** (LeetCode 480) — sliding window with deletion from heaps
- **Find K-th Smallest Pair Distance** (LeetCode 719) — binary search + two-pointer counting
- **Minimum Cost to Hire K Workers** (LeetCode 857) — max-heap + sorting by ratio

---

## Common Mistakes

### Mistake 1: Allowing minHeap to become larger than maxHeap
```java
// WRONG — rebalance gives priority to minHeap
if (minHeap.size() > maxHeap.size() + 1) {
    maxHeap.offer(minHeap.poll());
}

// CORRECT — keep maxHeap as the "median holder" (same size or one larger)
if (maxHeap.size() > minHeap.size() + 1) {
    minHeap.offer(maxHeap.poll());
} else if (minHeap.size() > maxHeap.size()) {
    maxHeap.offer(minHeap.poll());
}
```

### Mistake 2: Integer division when computing median
```java
// WRONG — integer division loses the decimal
return (maxHeap.peek() + minHeap.peek()) / 2;

// CORRECT — force double division
return (maxHeap.peek() + minHeap.peek()) / 2.0;
// Or:
return maxHeap.peek() / 2.0 + minHeap.peek() / 2.0; // avoids overflow for large ints
```

### Mistake 3: Not rebalancing after deletion in sliding window
```java
// WRONG — remove outgoing element but forget to rebalance
maxHeap.remove(outgoing);

// CORRECT
maxHeap.remove(outgoing);
rebalance(maxHeap, minHeap); // heaps may now be imbalanced
```

### Mistake 4: Violating the ordering invariant when inserting
```java
// WRONG — always insert into maxHeap first without checking
maxHeap.offer(num);
// If num is larger than minHeap's min, the invariant (max ≤ min-heap elements) breaks

// CORRECT — route to correct heap, then rebalance
if (maxHeap.isEmpty() || num <= maxHeap.peek()) {
    maxHeap.offer(num);
} else {
    minHeap.offer(num);
}
```

---

## Interview Questions

**Q: Why two heaps instead of one sorted data structure (like TreeMap)?**
A: Two heaps give O(1) median access and O(log n) insertion. TreeMap gives O(log n) access and O(log n) insertion. Heaps win on median access speed. However, TreeMap is better for deletion (O(log n) vs O(n) for heap). In production, prefer TreeMap or segment tree for sliding window problems.

**Q: Can you solve "median of stream" with a single balanced BST?**
A: Yes — a balanced BST (like Java's `TreeMap`) supports O(log n) insertion, deletion, and finding the k-th element. You'd track total count and use `TreeMap.pollFirstEntry()`/`pollLastEntry()` with an index. Two heaps are usually simpler to explain in interviews.

**Q: What's the space complexity of the Two Heaps median finder?**
A: O(n) — both heaps together hold all n elements.

**Q: How would you handle duplicate numbers in the sliding window median?**
A: Java's `PriorityQueue.remove(element)` removes only one occurrence of the element, which is the correct behavior for duplicates. No special handling needed.

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Sliding Window Median** | 480 | Two heaps + lazy deletion — Java's heap remove is O(n); need to handle "stale" elements with a delay map |
| 2 | **IPO** | 502 | Two heaps with different keys — min-heap by capital to unlock projects, max-heap by profit to pick best; the interplay between them is the key insight |
| 3 | **Find Right Interval** | 436 | For each interval's end, binary search for the smallest start ≥ end — a TreeMap replacement for a heap here |
| 4 | **Meeting Rooms III** | 2402 | Assign meetings to rooms greedily — min-heap for available rooms (by room number) and min-heap for ongoing meetings (by end time); two heaps working together |
| 5 | **Minimum Cost to Hire K Workers** | 857 | Sort by wage/quality ratio; for each worker as the "highest ratio" in the group, use a max-heap to maintain k workers with min total quality |

## Related Topics

- **Prerequisite**: PriorityQueue in Java, heap operations
- **Previous**: [Tree DFS](./08-tree-dfs.md)
- **Next**: [Subsets](./10-subsets.md)
- **See also**: [Top K Elements](./13-top-k-elements.md) — another heap-based pattern

---

## Further Reading

- LeetCode 295 (Find Median from Data Stream) — editorial explains both heap and segment tree approaches
- Java `PriorityQueue` documentation — understand `peek`, `poll`, `offer`, `remove(Object)` complexities
- "Programming Pearls" by Jon Bentley — Chapter on median maintenance
