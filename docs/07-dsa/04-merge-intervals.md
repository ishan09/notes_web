# Pattern 4: Merge Intervals

> **Before you start**: Given a list of time slots, can you find which ones overlap? Merge Intervals turns O(n²) overlap checking into O(n log n) by sorting first, then doing one linear sweep.

---

## What is Merge Intervals?

Merge Intervals is a pattern for problems involving **ranges** or **intervals** — pairs [start, end] — where you need to combine overlapping ranges, find gaps, or insert new ones.

**Analogy**: You have a calendar with meeting blocks. Some meetings overlap. You want a clean list of busy periods. Sort by start time, then walk through: if the next meeting starts before the current one ends, they overlap — extend the current block. Otherwise, seal the current block and start a new one.

---

## How It Works

**Core algorithm** (merge all overlapping intervals):

1. **Sort** intervals by start time.
2. **Initialize** a result list with the first interval.
3. **Iterate** through remaining intervals:
   - If `current.start <= last.end` → they overlap. Extend: `last.end = max(last.end, current.end)`.
   - Otherwise → no overlap. Append current to result.
4. Return result.

```
Input:  [[1,3],[2,6],[8,10],[15,18]]
Sort:   [[1,3],[2,6],[8,10],[15,18]]  ← already sorted

Step 1: result = [[1,3]]
Step 2: [2,6] → 2 ≤ 3? Yes → extend to [1,6].   result = [[1,6]]
Step 3: [8,10] → 8 ≤ 6? No → append.             result = [[1,6],[8,10]]
Step 4: [15,18] → 15 ≤ 10? No → append.           result = [[1,6],[8,10],[15,18]]
```

---

## Why This Matters

| Approach | Time | Space |
|----------|------|-------|
| Brute force (check every pair) | O(n²) | O(1) |
| Sort + sweep | **O(n log n)** | O(n) |

The sort dominates — the sweep is just O(n). For n = 100,000: brute = 10B checks, sort+sweep = ~1.7M.

---

## When to Use

Recognition signals:
- Input is a list of intervals / time ranges / [start, end] pairs
- "Merge overlapping intervals"
- "Find free time slots"
- "Minimum number of meeting rooms needed"
- "Insert interval into existing list"
- "Do any intervals overlap?"

---

## Trade-offs

| Pros | Cons |
|------|------|
| Simple O(n log n) solution | Requires sorting — can't process intervals online (streaming) easily |
| Works for open, closed, or half-open intervals | Must be careful with boundary conditions (touching vs. overlapping) |
| One linear pass after sort | Output can be O(n) if no intervals merge |

---

## Core Concepts

### Concept 1: Merge All Overlapping Intervals

```java
public int[][] merge(int[][] intervals) {
    if (intervals.length <= 1) return intervals;

    // Sort by start time
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);

    List<int[]> result = new ArrayList<>();
    result.add(intervals[0]);

    for (int i = 1; i < intervals.length; i++) {
        int[] last = result.get(result.size() - 1);
        int[] curr = intervals[i];

        if (curr[0] <= last[1]) {
            // Overlapping — extend the end
            last[1] = Math.max(last[1], curr[1]);
        } else {
            // Non-overlapping — add new interval
            result.add(curr);
        }
    }

    return result.toArray(new int[result.size()][]);
}
```

**Overlap condition**: `curr.start <= last.end` (if touching is considered overlap, use `<=`; for strictly disjoint, use `<`).

---

### Concept 2: Insert Interval into Sorted Non-Overlapping List

```java
public int[][] insert(int[][] intervals, int[] newInterval) {
    List<int[]> result = new ArrayList<>();
    int i = 0, n = intervals.length;

    // Phase 1: Add all intervals that end before newInterval starts
    while (i < n && intervals[i][1] < newInterval[0]) {
        result.add(intervals[i++]);
    }

    // Phase 2: Merge all intervals that overlap with newInterval
    while (i < n && intervals[i][0] <= newInterval[1]) {
        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
        i++;
    }
    result.add(newInterval);

    // Phase 3: Add remaining intervals (start after newInterval ends)
    while (i < n) {
        result.add(intervals[i++]);
    }

    return result.toArray(new int[result.size()][]);
}
```

**Three-phase sweep**: before, overlapping, after. No sorting needed because input is already sorted and non-overlapping.

---

### Concept 3: Minimum Meeting Rooms (Interval Scheduling)

```java
// How many rooms do you need to hold all meetings simultaneously?
public int minMeetingRooms(int[][] intervals) {
    int n = intervals.length;
    int[] starts = new int[n];
    int[] ends   = new int[n];

    for (int i = 0; i < n; i++) {
        starts[i] = intervals[i][0];
        ends[i]   = intervals[i][1];
    }

    Arrays.sort(starts);
    Arrays.sort(ends);

    int rooms = 0, endPtr = 0;

    for (int i = 0; i < n; i++) {
        if (starts[i] < ends[endPtr]) {
            rooms++;        // new meeting starts before any meeting ends → need another room
        } else {
            endPtr++;       // a meeting ended → reuse that room
        }
    }
    return rooms;
}
```

**Key insight**: Separate start and end times, sort independently, then use two pointers. A room is reused when a meeting ends before a new one starts.

---

## Common Patterns

### Pattern A: Non-Overlapping Intervals (Minimum Removals)

**Problem**: Find the minimum number of intervals to remove so that the rest don't overlap. (LeetCode 435)

```java
public int eraseOverlapIntervals(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[1] - b[1]); // Sort by END time

    int count = 0;
    int lastEnd = Integer.MIN_VALUE;

    for (int[] interval : intervals) {
        if (interval[0] >= lastEnd) {
            // No overlap — keep this interval
            lastEnd = interval[1];
        } else {
            // Overlap — remove this interval (greedy: keep the one with earlier end)
            count++;
        }
    }
    return count;
}
```

**Greedy key**: Sort by end time and always keep the interval that ends earliest. This leaves the most room for future intervals.

---

### Pattern B: Employee Free Time

**Problem**: Given a list of employee schedules (each employee has a list of non-overlapping intervals), find the free time common to all employees.

```java
public List<int[]> employeeFreeTime(List<List<int[]>> schedule) {
    // Flatten all intervals into one list
    List<int[]> all = new ArrayList<>();
    for (List<int[]> emp : schedule) all.addAll(emp);

    // Sort by start time
    all.sort((a, b) -> a[0] - b[0]);

    List<int[]> result = new ArrayList<>();
    int end = all.get(0)[1]; // track furthest end seen

    for (int[] interval : all) {
        if (interval[0] > end) {
            // Gap found — this is free time
            result.add(new int[]{end, interval[0]});
        }
        end = Math.max(end, interval[1]);
    }
    return result;
}
```

**Pattern**: Merge all busy intervals, then gaps between merged intervals = free time.

---

## Quick Check

1. Why sort by start time before merging? What breaks if you don't?
2. What's the overlap condition between `[a, b]` and `[c, d]`? (Write it as an inequality.)
3. In the Insert Interval problem, why don't you need to sort the input?
4. What's the difference between sorting by start time vs. end time, and when do you use each?
5. How would you check if ANY two intervals in a list overlap — in less than O(n²)?

---

## Practice Problems

### Beginner
- **Merge Intervals** (LeetCode 56) — merge all overlapping intervals
- **Summary Ranges** (LeetCode 228) — convert sorted array to range strings
- **Meeting Rooms** (LeetCode 252) — can a person attend all meetings?

### Intermediate
- **Insert Interval** (LeetCode 57) — insert into sorted non-overlapping list
- **Meeting Rooms II** (LeetCode 253) — minimum number of rooms required
- **Non-overlapping Intervals** (LeetCode 435) — minimum removals

### Advanced
- **Employee Free Time** (LeetCode 759) — free time across all employees
- **Minimum Number of Arrows to Burst Balloons** (LeetCode 452) — greedy interval scheduling
- **Data Stream as Disjoint Intervals** (LeetCode 352) — online interval merging with TreeMap

---

## Common Mistakes

### Mistake 1: Not sorting before merging
```java
// WRONG — assumes intervals are already sorted
for (int[] curr : intervals) { ... }

// CORRECT — always sort by start time first
Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
```

### Mistake 2: Wrong overlap condition (off-by-one on touching intervals)
```java
// Are [1,3] and [3,5] overlapping?
// Depends on whether endpoints are inclusive:
if (curr[0] < last[1])   // strictly overlapping (touching = separate)
if (curr[0] <= last[1])  // touching = overlapping (more common in problems)
// Read the problem carefully!
```

### Mistake 3: Not taking Math.max when extending the merged interval
```java
// WRONG — misses the case where curr is fully contained in last
last[1] = curr[1];

// CORRECT — always take the max end
last[1] = Math.max(last[1], curr[1]);
// Example: last=[1,10], curr=[2,5] → wrong gives [1,5], correct gives [1,10]
```

### Mistake 4: Modifying the input array during iteration
```java
// WRONG — sorts in place which may not be allowed (immutable input)
Arrays.sort(intervals, ...); // check if you need a defensive copy

// SAFE — copy if the original must be preserved
int[][] copy = intervals.clone();
Arrays.sort(copy, (a, b) -> a[0] - b[0]);
```

---

## Interview Questions

**Q: What's the time complexity of Merge Intervals, and what dominates?**
A: O(n log n) — the sort dominates. The merge sweep is O(n). Total = O(n log n + n) = O(n log n).

**Q: How would you solve "minimum meeting rooms" without sorting start/end separately?**
A: Use a min-heap. Sort by start time. For each meeting, if the heap's minimum end ≤ current start, pop (reuse that room) and push the new end. Otherwise just push. Heap size = rooms needed. This is O(n log n) but slightly more space than the two-sorted-arrays approach.

**Q: Can you detect if a new appointment conflicts with existing ones in O(log n)?**
A: Yes — store intervals in a TreeMap keyed by start time. For a new interval [s, e], use floorKey(s) to find the interval just before it (check if it extends past s), and ceilingKey(s) to find the interval just after (check if it starts before e). O(log n) per query.

**Q: What is the greedy argument for minimum meeting rooms?**
A: At any moment in time, the number of overlapping meetings equals the number of rooms needed. The two-pointer/sorted-arrays approach essentially simulates a timeline sweep — every time a new meeting starts before any existing meeting ends, a new room is allocated.

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Remove Covered Intervals** | 1288 | Sort by start ASC, then end DESC — the DESC end sort is the non-obvious step that lets you skip covered intervals in one pass |
| 2 | **Interval List Intersections** | 986 | Two sorted lists, two pointers — advance whichever interval ends first; intersection is `[max(starts), min(ends)]` if valid |
| 3 | **My Calendar I** | 729 | Online interval insertion — new interval `[s,e]` conflicts if any existing `[a,b]` has `s < b && e > a` |
| 4 | **My Calendar III** | 732 | Count max overlapping bookings at any point — use a TreeMap of start/end events (+1/-1) and sweep |
| 5 | **Video Stitching** | 1024 | Greedy intervals — from each reachable point, pick the clip that extends furthest; similar to Jump Game II |
| 6 | **Minimum Number of Arrows to Burst Balloons** | 452 | Sort by end time, shoot arrow at end of first balloon — counts how many arrows minimum (greedy + intervals) |

## Related Topics

- **Prerequisite**: Sorting, Arrays
- **Previous**: [Fast & Slow Pointers](./03-fast-slow-pointers.md)
- **Next**: [Cyclic Sort](./05-cyclic-sort.md)
- **See also**: [Two Pointers](./02-two-pointers.md) — used in the meeting rooms two-pointer variant

---

## Further Reading

- LeetCode tag: "Interval" — filter for Merge Intervals cluster
- "Greedy Algorithms" chapter in CLRS for interval scheduling maximization proof
- NeetCode Intervals playlist — covers the 6 core interval problems in order
