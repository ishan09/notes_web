# Pattern 1: Sliding Window

> **Before you start**: Can you solve problems using nested loops? This pattern optimizes those solutions.

## What is Sliding Window?

Imagine you're looking through a window at a row of houses. Instead of examining each house individually from scratch, you slide the window along - removing the house that just left your view and adding the new house that enters. This is much faster than starting over each time.

The sliding window pattern works the same way with arrays or strings - you maintain a "window" of elements and slide it through the data structure, updating your answer as you go.

## How It Works

**Key Idea**: Instead of recalculating everything for each position, maintain a window and update it incrementally.

**Two Types**:
1. **Fixed-size window**: Window size stays constant (e.g., "find max sum of any 3 consecutive elements")
2. **Dynamic-size window**: Window expands/contracts based on conditions (e.g., "longest substring without repeating characters")

### Why This Matters

- **Optimization**: Reduces O(n²) or O(n³) solutions to O(n)
- **Common in interviews**: Appears in 15-20% of coding interviews
- **Real-world applications**: Rate limiting, moving averages, data streaming

### When to Use

- ✅ Array or string problems
- ✅ Need to find something about a contiguous subarray/substring
- ✅ Keywords: "consecutive", "subarray", "substring", "window"
- ❌ **Don't use when**: Elements can be non-contiguous or order doesn't matter

### Trade-offs

| Pros | Cons |
|------|------|
| Dramatically faster (O(n) vs O(n²)) | Only works for contiguous elements |
| Simple to implement | Requires careful window boundary management |
| Low memory overhead | Not intuitive for beginners |

## Core Concepts

### 1. Fixed-Size Window

**Template**:
```java
public int fixedWindow(int[] arr, int k) {
    int windowSum = 0;
    int maxSum = 0;
    
    // Calculate sum of first window
    for (int i = 0; i < k; i++) {
        windowSum += arr[i];
    }
    maxSum = windowSum;
    
    // Slide the window
    for (int i = k; i < arr.length; i++) {
        windowSum = windowSum - arr[i - k] + arr[i]; // Remove left, add right
        maxSum = Math.max(maxSum, windowSum);
    }
    
    return maxSum;
}
```

**Try it yourself**: Find the maximum sum of any 4 consecutive elements in `[2, 1, 5, 1, 3, 2]`

### 2. Dynamic-Size Window (Expanding/Contracting)

**Template**:
```java
public int dynamicWindow(int[] arr, int target) {
    int windowStart = 0;
    int windowSum = 0;
    int minLength = Integer.MAX_VALUE;
    
    for (int windowEnd = 0; windowEnd < arr.length; windowEnd++) {
        windowSum += arr[windowEnd]; // Expand window
        
        // Contract window while condition is met
        while (windowSum >= target) {
            minLength = Math.min(minLength, windowEnd - windowStart + 1);
            windowSum -= arr[windowStart];
            windowStart++;
        }
    }
    
    return minLength == Integer.MAX_VALUE ? 0 : minLength;
}
```

**Try it yourself**: Find the smallest subarray with sum ≥ 7 in `[2, 1, 5, 2, 3, 2]`

## Common Patterns

### Pattern 1: Maximum/Minimum in Fixed Window

**Problem**: Find max sum of k consecutive elements
**Solution**: Calculate first window, then slide
**When to use**: Fixed window size given

```java
// Example: Max sum of 3 consecutive elements
public int maxSumFixedWindow(int[] arr, int k) {
    int windowSum = 0, maxSum = 0;
    
    for (int i = 0; i < k; i++) windowSum += arr[i];
    maxSum = windowSum;
    
    for (int i = k; i < arr.length; i++) {
        windowSum += arr[i] - arr[i - k];
        maxSum = Math.max(maxSum, windowSum);
    }
    return maxSum;
}
```

### Pattern 2: Longest Substring with Condition

**Problem**: Longest substring without repeating characters
**Solution**: Expand window until condition breaks, then contract
**When to use**: "Longest" or "maximum length" with constraints

```java
public int lengthOfLongestSubstring(String s) {
    Set<Character> set = new HashSet<>();
    int left = 0, maxLen = 0;
    
    for (int right = 0; right < s.length(); right++) {
        while (set.contains(s.charAt(right))) {
            set.remove(s.charAt(left++));
        }
        set.add(s.charAt(right));
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}
```

### Pattern 3: Smallest Subarray with Condition

**Problem**: Smallest subarray with sum ≥ target
**Solution**: Expand until condition met, then contract to minimize
**When to use**: "Smallest" or "minimum length" with constraints

## Quick Check

> Try to answer these from memory before clicking the links

1. What's the time complexity improvement of sliding window? → [Review Why This Matters](#why-this-matters)
2. When should you use fixed vs dynamic window? → [Review How It Works](#how-it-works)
3. How do you "slide" a window? → [Review Fixed-Size Window](#1-fixed-size-window)
4. What data structures commonly help with sliding window? → [Review Pattern 2](#pattern-2-longest-substring-with-condition)
5. What keywords indicate a sliding window problem? → [Review When to Use](#when-to-use)

## Practice Problems

**Beginner**:
1. Maximum sum of subarray of size k (LeetCode Easy)
2. Average of all subarrays of size k
3. Find all anagrams in a string (LeetCode Medium)

**Intermediate**:
1. Longest substring without repeating characters (LeetCode Medium)
2. Longest substring with at most k distinct characters
3. Minimum window substring (LeetCode Hard)

**Advanced**:
1. Sliding window maximum (LeetCode Hard)
2. Substring with concatenation of all words
3. Minimum size subarray sum

## Common Mistakes

❌ **Mistake 1**: Recalculating window sum from scratch each time
✅ **Instead**: Update incrementally (subtract left, add right)

❌ **Mistake 2**: Off-by-one errors in window boundaries
✅ **Instead**: Use clear variable names (windowStart, windowEnd) and draw it out

❌ **Mistake 3**: Forgetting to update the window when contracting
✅ **Instead**: Always remove element at windowStart before incrementing

❌ **Mistake 4**: Using sliding window for non-contiguous elements
✅ **Instead**: Check if problem requires contiguous subarray/substring

## Interview Questions

### Technical Questions
1. Explain how sliding window reduces time complexity → [Hint: Review optimization](#why-this-matters)
2. When would sliding window NOT work? → [Hint: Review when to use](#when-to-use)
3. What's the difference between fixed and dynamic window? → [Hint: Review types](#how-it-works)

### Scenario-Based
1. "Find the longest substring with at most 2 distinct characters" - Which pattern?
2. "Given an array, find max sum of any 5 consecutive elements" - Which approach?

## Related Topics

**Prerequisites** (review these first):
- Arrays and Strings basics
- Hash Maps / Hash Sets
- Two Pointers pattern (similar concept)

**Next Steps** (study these next):
- [Two Pointers](./02-two-pointers.md) - Similar optimization technique
- [Fast & Slow Pointers](./03-fast-slow-pointers.md) - Another pointer-based pattern

**Related Concepts**:
- Prefix Sum - Alternative for some fixed window problems
- Deque - For sliding window maximum problems

## Summary

- Sliding window optimizes contiguous subarray/substring problems from O(n²) to O(n)
- Two types: fixed-size (constant k) and dynamic-size (expand/contract)
- Key technique: Update window incrementally, don't recalculate
- Look for keywords: "consecutive", "subarray", "substring", "window"

## Further Reading

- [LeetCode Sliding Window Problems](https://leetcode.com/tag/sliding-window/)
- [Grokking the Coding Interview: Sliding Window Pattern](https://www.educative.io/courses/grokking-the-coding-interview)

---

**Next**: [Two Pointers Pattern](./02-two-pointers.md)
