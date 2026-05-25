# Pattern 13: Top K Elements

> **Before you start**: Need the k largest or k most frequent elements without fully sorting? A min-heap of size k gives you the top-k in O(n log k) — far better than O(n log n) sorting when k << n.

---

## What is Top K Elements?

The Top K Elements pattern finds the k largest (or smallest, or most frequent) elements from a collection using a **heap of size k**. Instead of sorting all n elements, you maintain a running "winner list" of exactly k elements, evicting the weakest contender whenever a better candidate arrives.

**Analogy**: You're running a talent show. You only have k spots in the finale. As each contestant performs, if they're better than the weakest finalist, they replace that finalist. At the end, your k finalists are the best overall — without ever having ranked all contestants against each other.

---

## How It Works

**For k largest elements**:
1. Use a **min-heap** of size k (weakest of the top-k is always at the top).
2. For each element:
   - If heap size < k → add unconditionally.
   - Else if element > heap.peek() → poll (evict the weakest) and add new element.
3. After processing all elements, the heap contains the k largest.

**Why min-heap for k largest?** The min-heap keeps the smallest of your current top-k at the top — the easy eviction target. If a new element beats the minimum, it deserves a spot.

---

## Why This Matters

| Approach | Time | Space |
|----------|------|-------|
| Sort all, take top k | O(n log n) | O(1) or O(n) |
| Min-heap of size k | **O(n log k)** | **O(k)** |
| Quick Select (average) | O(n) average | O(1) |

For k = 100 and n = 1,000,000: sort = 20M ops, heap = 4M ops. Quick Select = 1M ops (but O(n²) worst case).

---

## When to Use

Recognition signals:
- "Find k largest / k smallest elements"
- "k most frequent elements"
- "k closest points to origin"
- "Top k search results"
- "Kth largest element" (single element, use Quick Select or heap)
- "Reorganize string" (frequency-based scheduling)

---

## Trade-offs

| Min-Heap (k largest) | Quick Select |
|---|---|
| O(n log k), O(k) space | O(n) average, O(1) space |
| Streaming — works online | Requires all elements in memory |
| Deterministic | Average-case O(n), worst-case O(n²) |
| Easy to implement correctly | Tricky partition logic |

Use heap when: data is a stream, or k is close to n. Use Quick Select when: all data is available and you want best average performance.

---

## Core Concepts

### Concept 1: K Largest Elements (Min-Heap)

```java
public int[] kLargest(int[] nums, int k) {
    PriorityQueue<Integer> minHeap = new PriorityQueue<>(); // min at top

    for (int num : nums) {
        minHeap.offer(num);
        if (minHeap.size() > k) {
            minHeap.poll(); // evict the smallest — it's not in top k
        }
    }

    // Remaining elements in heap are the k largest
    return minHeap.stream().mapToInt(Integer::intValue).toArray();
}
```

---

### Concept 2: Kth Largest Element (Heap vs Quick Select)

```java
// Heap approach — O(n log k)
public int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> minHeap = new PriorityQueue<>();
    for (int num : nums) {
        minHeap.offer(num);
        if (minHeap.size() > k) minHeap.poll();
    }
    return minHeap.peek(); // top of min-heap is the kth largest
}

// Quick Select — O(n) average, O(n²) worst case
public int findKthLargestQuickSelect(int[] nums, int k) {
    return quickSelect(nums, 0, nums.length - 1, nums.length - k);
    // kth largest = (n-k)th smallest (0-indexed)
}

private int quickSelect(int[] nums, int left, int right, int k) {
    int pivotIdx = partition(nums, left, right);
    if (pivotIdx == k) return nums[pivotIdx];
    if (pivotIdx < k) return quickSelect(nums, pivotIdx + 1, right, k);
    return quickSelect(nums, left, pivotIdx - 1, k);
}

private int partition(int[] nums, int left, int right) {
    int pivot = nums[right];
    int i = left;
    for (int j = left; j < right; j++) {
        if (nums[j] <= pivot) {
            int tmp = nums[i]; nums[i] = nums[j]; nums[j] = tmp;
            i++;
        }
    }
    int tmp = nums[i]; nums[i] = nums[right]; nums[right] = tmp;
    return i;
}
```

---

### Concept 3: K Most Frequent Elements

```java
public int[] topKFrequent(int[] nums, int k) {
    // Step 1: Count frequencies
    Map<Integer, Integer> freq = new HashMap<>();
    for (int num : nums) freq.merge(num, 1, Integer::sum);

    // Step 2: Min-heap by frequency (evict least frequent)
    PriorityQueue<Integer> minHeap = new PriorityQueue<>(
        (a, b) -> freq.get(a) - freq.get(b)
    );

    for (int num : freq.keySet()) {
        minHeap.offer(num);
        if (minHeap.size() > k) minHeap.poll();
    }

    // Step 3: Collect
    return minHeap.stream().mapToInt(Integer::intValue).toArray();
}
```

**Bucket sort alternative** — O(n) for this problem:
```java
public int[] topKFrequentBucket(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int num : nums) freq.merge(num, 1, Integer::sum);

    List<Integer>[] buckets = new List[nums.length + 1]; // index = frequency
    for (int num : freq.keySet()) {
        int f = freq.get(num);
        if (buckets[f] == null) buckets[f] = new ArrayList<>();
        buckets[f].add(num);
    }

    List<Integer> result = new ArrayList<>();
    for (int i = buckets.length - 1; i >= 0 && result.size() < k; i--) {
        if (buckets[i] != null) result.addAll(buckets[i]);
    }
    return result.stream().mapToInt(Integer::intValue).toArray();
}
```

---

## Common Patterns

### Pattern A: K Closest Points to Origin

```java
public int[][] kClosest(int[][] points, int k) {
    // Max-heap by distance (evict furthest among current top-k)
    PriorityQueue<int[]> maxHeap = new PriorityQueue<>(
        (a, b) -> (b[0]*b[0] + b[1]*b[1]) - (a[0]*a[0] + a[1]*a[1])
    );

    for (int[] point : points) {
        maxHeap.offer(point);
        if (maxHeap.size() > k) maxHeap.poll(); // evict the farthest
    }

    return maxHeap.toArray(new int[k][]);
}
```

**Note**: For k smallest distances, use a max-heap (evict the largest distance when heap exceeds k). For k largest, use a min-heap.

---

### Pattern B: Sort Characters By Frequency

```java
public String frequencySort(String s) {
    Map<Character, Integer> freq = new HashMap<>();
    for (char c : s.toCharArray()) freq.merge(c, 1, Integer::sum);

    PriorityQueue<Character> maxHeap = new PriorityQueue<>(
        (a, b) -> freq.get(b) - freq.get(a)
    );
    maxHeap.addAll(freq.keySet());

    StringBuilder result = new StringBuilder();
    while (!maxHeap.isEmpty()) {
        char c = maxHeap.poll();
        for (int i = 0; i < freq.get(c); i++) result.append(c);
    }
    return result.toString();
}
```

---

## Quick Check

1. Why use a **min**-heap (not max-heap) to find the k **largest** elements?
2. What's the time complexity of maintaining a min-heap of size k while processing n elements?
3. When would Quick Select be preferable to the heap approach?
4. In K Most Frequent, why do you heap over the key set (unique elements) rather than all nums?
5. For "K Closest Points," why is it correct to evict the farthest point (max-heap) rather than the closest?

---

## Practice Problems

### Beginner
- **Kth Largest Element in an Array** (LeetCode 215) — single kth largest
- **Last Stone Weight** (LeetCode 1046) — max-heap simulation
- **Top K Frequent Elements** (LeetCode 347) — k most frequent

### Intermediate
- **K Closest Points to Origin** (LeetCode 973) — distance-based top-k
- **Sort Characters By Frequency** (LeetCode 451) — frequency sort
- **Kth Largest Element in a Stream** (LeetCode 703) — online streaming top-k
- **Find K Pairs with Smallest Sums** (LeetCode 373) — pairs from two sorted arrays

### Advanced
- **Task Scheduler** (LeetCode 621) — greedy with max-heap
- **Reorganize String** (LeetCode 767) — frequency-based scheduling
- **Maximum Frequency Stack** (LeetCode 895) — frequency stack with O(1) push/pop
- **Find Median from Data Stream** (LeetCode 295) — see [Two Heaps](./09-two-heaps.md)

---

## Common Mistakes

### Mistake 1: Using max-heap when you need min-heap (or vice versa)
```java
// For k LARGEST: use MIN-heap (evict smallest contenders)
PriorityQueue<Integer> minHeap = new PriorityQueue<>();

// For k SMALLEST: use MAX-heap (evict largest contenders)
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());

// Mnemonic: "Keep the k best, throw out the worst → worst is always at top"
// For largest: worst = smallest → min-heap
// For smallest: worst = largest → max-heap
```

### Mistake 2: Off-by-one — checking size after add vs before
```java
// CORRECT — add first, then check if heap grew beyond k
minHeap.offer(num);
if (minHeap.size() > k) minHeap.poll();
```

### Mistake 3: Not using distance squared to avoid Math.sqrt
```java
// WRONG — unnecessary floating point, and slower
double dist = Math.sqrt(x*x + y*y);

// CORRECT — comparing d² works because sqrt is monotone
int distSq = x*x + y*y;
```

### Mistake 4: Modifying the comparator lambda incorrectly
```java
// WRONG — sorts by value, not by map value (frequency)
new PriorityQueue<>((a, b) -> a - b);

// CORRECT — sort by the frequency stored in the map
new PriorityQueue<>((a, b) -> freq.get(a) - freq.get(b));
```

---

## Interview Questions

**Q: When is Quick Select better than a heap for finding the kth largest?**
A: Quick Select is O(n) average vs O(n log k) for heap. Use Quick Select when all data is in memory and you want the best average performance. Use heap when: processing a stream, k changes frequently, or you need all top-k elements not just the kth.

**Q: What is the worst-case time complexity of Quick Select and how do you mitigate it?**
A: O(n²) with bad pivot choices (e.g., already sorted input with last-element pivot). Use randomized pivot: `swap(nums, left + random.nextInt(right - left + 1), right)` before partitioning. Expected O(n) with high probability.

**Q: How does Task Scheduler (LeetCode 621) use a heap?**
A: Greedily always schedule the most frequent remaining task (max-heap by frequency). If no task is available (cooldown), idle. This minimizes total time. O(n log n) where n = number of tasks.

**Q: What's the space complexity of bucket sort for Top K Frequent?**
A: O(n) — the frequency map has at most n entries, and the bucket array has at most n+1 slots. Total O(n), which is the same as the heap approach but with a smaller constant.

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Task Scheduler** | 621 | Greedy with max-heap — always schedule the most frequent remaining task; count idle slots mathematically or simulate |
| 2 | **Reorganize String** | 767 | Similar to Task Scheduler — if any character appears more than `(n+1)/2` times, it's impossible; otherwise greedy from max-heap |
| 3 | **Kth Largest Element in a Stream** | 703 | Maintain a min-heap of size k permanently — the new element competes for a spot on every `add()` call |
| 4 | **Find K Pairs with Smallest Sums** | 373 | Virtual sorted rows — start with (nums1[i], nums2[0]) in heap; when (i,j) is popped, push (i,j+1) |
| 5 | **Maximum Frequency Stack** | 895 | Hard — push/pop most frequent; use a `freq` map and a `group` map (freq → stack); `maxFreq` tracks the current max |
| 6 | **Ugly Number II** | 264 | Three-way virtual merge — maintain three pointers (×2, ×3, ×5); or use a min-heap deduplicating with a set |
| 7 | **Distant Barcodes** | 1054 | Rearrange so no two adjacent are the same — always place the most frequent remaining; same core as Reorganize String |

## Related Topics

- **Prerequisite**: PriorityQueue in Java, heap operations
- **Previous**: [Bitwise XOR](./12-bitwise-xor.md)
- **Next**: [K-way Merge](./14-k-way-merge.md)
- **See also**: [Two Heaps](./09-two-heaps.md) — related heap-based pattern for median

---

## Further Reading

- LeetCode "Heap (Priority Queue)" tag — filter for Top K problems
- Quick Select (BFPRT / Median-of-Medians) — Wikipedia for O(n) worst-case variant
- NeetCode Heap playlist — covers Kth Largest, Top K Frequent, Task Scheduler
