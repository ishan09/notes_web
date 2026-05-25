# Pattern 14: K-way Merge

> **Before you start**: Can you merge k sorted lists efficiently? A min-heap with one element from each list gives you the global minimum in O(log k) time — merging k sorted lists in O(n log k) instead of O(nk).

---

## What is K-way Merge?

K-way Merge combines **k sorted sequences** into a single sorted sequence using a **min-heap**. The heap always holds one "current candidate" from each list. The globally smallest element is always at the heap's top — pop it, add the next element from that same list.

**Analogy**: k runners in a race, each running their own lane in sorted order. You want a merged scoreboard. The min-heap is like a leaderboard with one entry per lane — always showing the current frontrunner from each lane. When a runner finishes, their lane's next runner enters the board.

---

## How It Works

1. Insert the first element from each of the k lists into a min-heap (along with which list it came from and its index).
2. While heap is not empty:
   a. Pop the minimum element — it's the next element in the merged output.
   b. If the popped element's list has more elements, push the next one into the heap.
3. Repeat until heap is empty.

```
Lists: [1, 4, 7], [2, 5, 8], [3, 6, 9]

Heap: [(1,list0,idx0), (2,list1,idx0), (3,list2,idx0)]

Pop (1,list0,idx0) → output: [1]   push (4,list0,idx1) → heap: [(2),(3),(4)]
Pop (2,list1,idx0) → output: [1,2] push (5,list1,idx1) → heap: [(3),(4),(5)]
Pop (3,list2,idx0) → output: [1,2,3] push (6,list2,idx1) → heap: [(4),(5),(6)]
...
Final: [1,2,3,4,5,6,7,8,9]
```

---

## Why This Matters

| Approach | Time | Space |
|----------|------|-------|
| Merge pairwise (like merge sort) | O(n log k) | O(n) |
| K-way heap merge | **O(n log k)** | **O(k)** |
| Brute force (merge all into one, sort) | O(n log n) | O(n) |

Where n = total elements across all k lists. K-way merge achieves O(n log k) with only O(k) extra space — the heap never holds more than k elements.

---

## When to Use

Recognition signals:
- "Merge k sorted lists/arrays"
- "Find the kth smallest element across k sorted lists"
- "Find the smallest range that covers at least one element from each k list"
- "Merge k sorted files / external sort"
- Data comes from k independent sorted sources

---

## Trade-offs

| Pros | Cons |
|------|------|
| O(n log k) — much better than brute force O(n log n) for small k | Need to track (value, list index, element index) in heap |
| O(k) space — heap never bigger than k | More complex than pairwise merge |
| Works on streams — output is produced incrementally | Not cache-friendly for very large k |

---

## Core Concepts

### Concept 1: Merge K Sorted Lists (LinkedList)

```java
public ListNode mergeKLists(ListNode[] lists) {
    // Min-heap: compare by node value
    PriorityQueue<ListNode> minHeap = new PriorityQueue<>((a, b) -> a.val - b.val);

    // Step 1: Add the head of each non-null list
    for (ListNode list : lists) {
        if (list != null) minHeap.offer(list);
    }

    ListNode dummy = new ListNode(0);
    ListNode curr = dummy;

    // Step 2: Always pop the minimum, advance to its next node
    while (!minHeap.isEmpty()) {
        ListNode node = minHeap.poll();
        curr.next = node;
        curr = curr.next;
        if (node.next != null) minHeap.offer(node.next);
    }

    return dummy.next;
}
```

**Time**: O(n log k) — each of the n nodes is pushed and popped once; each heap operation is O(log k).
**Space**: O(k) for the heap.

---

### Concept 2: Merge K Sorted Arrays

```java
public int[] mergeKSortedArrays(int[][] arrays) {
    // Heap entry: [value, arrayIndex, elementIndex]
    PriorityQueue<int[]> minHeap = new PriorityQueue<>((a, b) -> a[0] - b[0]);

    int totalSize = 0;
    for (int i = 0; i < arrays.length; i++) {
        if (arrays[i].length > 0) {
            minHeap.offer(new int[]{arrays[i][0], i, 0});
            totalSize += arrays[i].length;
        }
    }

    int[] result = new int[totalSize];
    int idx = 0;

    while (!minHeap.isEmpty()) {
        int[] top = minHeap.poll();
        result[idx++] = top[0];

        int arrayIdx = top[1];
        int elemIdx  = top[2];

        if (elemIdx + 1 < arrays[arrayIdx].length) {
            minHeap.offer(new int[]{arrays[arrayIdx][elemIdx + 1], arrayIdx, elemIdx + 1});
        }
    }
    return result;
}
```

---

### Concept 3: Kth Smallest Element in M Sorted Arrays

```java
// Find the kth smallest element across multiple sorted arrays
public int findKthSmallest(int[][] arrays, int k) {
    PriorityQueue<int[]> minHeap = new PriorityQueue<>((a, b) -> a[0] - b[0]);

    for (int i = 0; i < arrays.length; i++) {
        if (arrays[i].length > 0) {
            minHeap.offer(new int[]{arrays[i][0], i, 0});
        }
    }

    int count = 0;
    while (!minHeap.isEmpty()) {
        int[] top = minHeap.poll();
        count++;
        if (count == k) return top[0];

        int arrayIdx = top[1], elemIdx = top[2];
        if (elemIdx + 1 < arrays[arrayIdx].length) {
            minHeap.offer(new int[]{arrays[arrayIdx][elemIdx + 1], arrayIdx, elemIdx + 1});
        }
    }
    return -1; // k exceeds total elements
}
```

---

## Common Patterns

### Pattern A: Smallest Range Covering K Lists

**Problem**: Find the smallest range [a, b] such that at least one element from each k list falls within [a, b].

```java
public int[] smallestRange(List<List<Integer>> nums) {
    // Heap: [value, listIndex, elementIndex]
    PriorityQueue<int[]> minHeap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    int maxVal = Integer.MIN_VALUE;

    // Initialize with first element from each list
    for (int i = 0; i < nums.size(); i++) {
        int val = nums.get(i).get(0);
        minHeap.offer(new int[]{val, i, 0});
        maxVal = Math.max(maxVal, val);
    }

    int[] result = {minHeap.peek()[0], maxVal};

    while (true) {
        int[] curr = minHeap.poll();
        int listIdx = curr[1], elemIdx = curr[2];

        // If any list is exhausted, we can't cover all lists anymore
        if (elemIdx + 1 >= nums.get(listIdx).size()) break;

        // Push next element from this list
        int nextVal = nums.get(listIdx).get(elemIdx + 1);
        minHeap.offer(new int[]{nextVal, listIdx, elemIdx + 1});
        maxVal = Math.max(maxVal, nextVal);

        // Current range: [minHeap.peek()[0], maxVal]
        if (maxVal - minHeap.peek()[0] < result[1] - result[0]) {
            result[0] = minHeap.peek()[0];
            result[1] = maxVal;
        }
    }
    return result;
}
```

**Key insight**: The range at any point is [min element in heap, current max]. To minimize the range, advance the minimum — which means popping the min and pushing the next from its list.

---

### Pattern B: Kth Smallest Element in a Sorted Matrix

**Problem**: Given an n×n matrix where each row and column is sorted, find the kth smallest element.

```java
public int kthSmallest(int[][] matrix, int k) {
    int n = matrix.length;
    // Min-heap: [value, row, col]
    PriorityQueue<int[]> minHeap = new PriorityQueue<>((a, b) -> a[0] - b[0]);

    // Add first element of each row (treat each row as a sorted list)
    for (int i = 0; i < Math.min(n, k); i++) {
        minHeap.offer(new int[]{matrix[i][0], i, 0});
    }

    int count = 0;
    while (!minHeap.isEmpty()) {
        int[] top = minHeap.poll();
        count++;
        if (count == k) return top[0];

        int row = top[1], col = top[2];
        if (col + 1 < n) {
            minHeap.offer(new int[]{matrix[row][col + 1], row, col + 1});
        }
    }
    return -1;
}
```

---

## Quick Check

1. Why does the heap in K-way merge never hold more than k elements?
2. What three pieces of information must each heap entry carry for array-based K-way merge?
3. In Merge K Sorted Lists, why do you use a dummy node?
4. In Smallest Range, why do you break when any list is exhausted?
5. What's the time complexity of Merge K Sorted Lists with n total nodes across k lists?

---

## Practice Problems

### Beginner
- **Merge Two Sorted Lists** (LeetCode 21) — two-pointer merge (special case of k=2)
- **Merge Sorted Array** (LeetCode 88) — merge in-place

### Intermediate
- **Merge K Sorted Lists** (LeetCode 23) — k-way heap merge on linked lists
- **Kth Smallest Element in a Sorted Matrix** (LeetCode 378) — treat rows as k sorted lists
- **Find K Pairs with Smallest Sums** (LeetCode 373) — virtual sorted lists

### Advanced
- **Smallest Range Covering Elements from K Lists** (LeetCode 632) — sliding window over k lists
- **Find Median from Data Stream** (LeetCode 295) — see [Two Heaps](./09-two-heaps.md)
- **Ugly Number II** (LeetCode 264) — virtual 3-way merge (multiples of 2, 3, 5)

---

## Common Mistakes

### Mistake 1: Not tracking the source list/index in the heap
```java
// WRONG — loses track of where to get the next element
minHeap.offer(node.val); // just the value

// CORRECT — store enough info to advance the iterator
minHeap.offer(new int[]{arrays[i][0], i, 0}); // value, list, index
```

### Mistake 2: Adding null nodes to the heap
```java
// WRONG — NullPointerException when polling
for (ListNode list : lists) minHeap.offer(list); // may add null!

// CORRECT
for (ListNode list : lists) {
    if (list != null) minHeap.offer(list);
}
```

### Mistake 3: Not advancing the pointer after polling
```java
// WRONG — re-adding the same node → infinite loop
ListNode node = minHeap.poll();
curr.next = node;
minHeap.offer(node); // should be node.next!

// CORRECT
ListNode node = minHeap.poll();
curr.next = node;
if (node.next != null) minHeap.offer(node.next);
```

### Mistake 4: Wrong comparator for the heap
```java
// WRONG — this creates a max-heap (for merging, you want min)
new PriorityQueue<>((a, b) -> b.val - a.val);

// CORRECT — min-heap: smallest value at top
new PriorityQueue<>((a, b) -> a.val - b.val);
// Or: new PriorityQueue<>(Comparator.comparingInt(a -> a.val));
```

---

## Interview Questions

**Q: Why is K-way Merge O(n log k) and not O(n log n)?**
A: The heap size is always k (one element per list), so each push/pop is O(log k). We process n total elements, giving O(n log k). It's better than O(n log n) whenever k < n, which is always true if k is the number of lists.

**Q: How does K-way Merge relate to Merge Sort?**
A: Merge Sort's merge step is 2-way merge (k=2). K-way Merge generalizes this to k=any. External merge sort (sorting data that doesn't fit in memory) uses K-way merge: split data into k sorted chunks, then K-way merge them.

**Q: How would you handle K-way merge if lists can be updated (elements added) during merging?**
A: If lists are dynamic, you need a more sophisticated structure (like a tournament tree or segment tree) that supports efficient updates. A static min-heap doesn't support efficient deletions or key updates.

**Q: Is there a non-heap approach to Merge K Sorted Lists?**
A: Yes — divide and conquer: pair up the lists, merge pairs, repeat. O(n log k) same as heap, but uses O(log k) recursion depth and avoids heap overhead. In practice, the heap approach is more memory-efficient for large k.

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Merge K Sorted Lists** | 23 | Core K-way merge — watch the comparator and the null-check on `node.next` before pushing |
| 2 | **Smallest Range Covering Elements from K Lists** | 632 | K-way merge + sliding window — always advance the minimum, track the global max to compute range |
| 3 | **Find K Pairs with Smallest Sums** | 373 | Virtual K-way merge — treat each row `(nums1[i], nums2[j])` as a sorted list; heap holds the frontier |
| 4 | **Kth Smallest Element in a Sorted Matrix** | 378 | K-way merge across rows — also solvable with binary search on value space (two very different approaches) |
| 5 | **Ugly Number II** | 264 | Three-pointer K-way merge (k=3, sequences of 2×, 3×, 5× multiples) — advance only the pointer that produced the current minimum |
| 6 | **Design Twitter** | 355 | K-way merge of each user's recent tweets — keep per-user tweet lists sorted by timestamp, merge top 10 |
| 7 | **Maximum Performance of a Team** | 1383 | Sort engineers by efficiency descending; for each as the minimum efficiency, use a min-heap of size k for speeds — a sliding-window heap |

## Related Topics

- **Prerequisite**: PriorityQueue, LinkedList, sorted arrays
- **Previous**: [Top K Elements](./13-top-k-elements.md)
- **Next**: [0/1 Knapsack DP](./15-knapsack-dp.md)
- **See also**: [Two Heaps](./09-two-heaps.md) — another min+max heap pattern; [Tree BFS](./07-tree-bfs.md) — same queue-based thinking

---

## Further Reading

- LeetCode 23 (Merge K Sorted Lists) — editorial covers both heap and divide-and-conquer
- "External Sorting" — Wikipedia article on K-way merge in database/OS contexts
- NeetCode Heap playlist — K-way merge and related problems
