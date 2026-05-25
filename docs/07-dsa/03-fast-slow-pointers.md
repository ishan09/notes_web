# Pattern 3: Fast & Slow Pointers

> **Before you start**: Can you traverse a LinkedList? Understand the [Two Pointers](./02-two-pointers.md) pattern?

## What is Fast & Slow Pointers?

Imagine two runners on a circular track:
- **Slow runner**: Jogs at normal pace (1 step at a time)
- **Fast runner**: Sprints at double speed (2 steps at a time)

If the track is circular (has a loop), the fast runner will eventually lap the slow runner and they'll meet. If the track is straight (no loop), the fast runner reaches the end first.

This is exactly how the fast & slow pointers pattern works - using two pointers moving at different speeds to solve LinkedList problems efficiently.

## How It Works

**Key Idea**: Two pointers traverse at different speeds (typically 1x and 2x). Their relative positions reveal important information about the data structure.

**Common Speed Ratios**:
- **1:2 ratio** (most common): Slow moves 1 step, fast moves 2 steps
- **1:k ratio**: Slow moves 1 step, fast moves k steps

### Why This Matters

- **Cycle Detection**: O(n) time, O(1) space - no hash set needed
- **Find Middle**: Single pass through LinkedList
- **Real-world applications**: Memory leak detection, deadlock detection, finding meeting points

### When to Use

- ✅ LinkedList problems (especially cycle-related)
- ✅ Need to find middle element
- ✅ Detect patterns or cycles
- ✅ Keywords: "cycle", "loop", "middle", "palindrome"
- ❌ **Don't use when**: Working with arrays (use two pointers instead), need exact positions

### Trade-offs

| Pros | Cons |
|------|------|
| O(1) space (no extra data structures) | Only works for LinkedList-like structures |
| Single pass through data | Not intuitive for beginners |
| Elegant and efficient | Requires careful pointer management |
| Detects cycles without hash set | Can't get exact cycle length easily |

## Core Concepts

### 1. Cycle Detection (Floyd's Algorithm)

**How it works**: If there's a cycle, fast pointer will eventually catch up to slow pointer inside the cycle.

```java
public boolean hasCycle(ListNode head) {
    if (head == null || head.next == null) return false;
    
    ListNode slow = head;
    ListNode fast = head;
    
    while (fast != null && fast.next != null) {
        slow = slow.next;           // Move 1 step
        fast = fast.next.next;      // Move 2 steps
        
        if (slow == fast) {
            return true;  // Cycle detected!
        }
    }
    
    return false;  // Fast reached end, no cycle
}
```

**Why it works**: 
- In a cycle, fast pointer gains 1 step on slow pointer each iteration
- Eventually, the gap closes and they meet
- Like a faster runner lapping a slower runner on a circular track

**Try it yourself**: Draw a LinkedList with a cycle and trace the pointers step by step

### 2. Finding Middle Element

**How it works**: When fast pointer reaches the end, slow pointer is at the middle.

```java
public ListNode findMiddle(ListNode head) {
    if (head == null) return null;
    
    ListNode slow = head;
    ListNode fast = head;
    
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    return slow;  // Slow is at middle
}
```

**Why it works**:
- Fast moves 2x speed of slow
- When fast reaches end (n steps), slow has moved n/2 steps
- n/2 is the middle!

**Try it yourself**: Find middle of `1 -> 2 -> 3 -> 4 -> 5`

### 3. Finding Cycle Start

**How it works**: After detecting cycle, reset one pointer to head and move both at same speed.

```java
public ListNode detectCycle(ListNode head) {
    if (head == null || head.next == null) return null;
    
    ListNode slow = head;
    ListNode fast = head;
    
    // Phase 1: Detect if cycle exists
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        
        if (slow == fast) {
            // Phase 2: Find cycle start
            ListNode ptr = head;
            while (ptr != slow) {
                ptr = ptr.next;
                slow = slow.next;
            }
            return ptr;  // Cycle starts here
        }
    }
    
    return null;  // No cycle
}
```

**Mathematical proof**:
- Let's say cycle starts at distance `k` from head
- When they meet, slow has traveled `k + m` (m = distance into cycle)
- Fast has traveled `k + m + nC` (C = cycle length, n = number of loops)
- Since fast = 2 × slow: `k + m + nC = 2(k + m)`
- Simplifying: `k = nC - m`
- This means: distance from head to cycle start = distance from meeting point to cycle start!

**Try it yourself**: Trace through a LinkedList with cycle starting at node 3

## Common Patterns

### Pattern 1: Palindrome LinkedList

**Problem**: Check if LinkedList is a palindrome
**Solution**: Find middle, reverse second half, compare
**When to use**: Need to compare first and second half

```java
public boolean isPalindrome(ListNode head) {
    if (head == null || head.next == null) return true;
    
    // Find middle
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    // Reverse second half
    ListNode secondHalf = reverse(slow);
    ListNode firstHalf = head;
    
    // Compare
    while (secondHalf != null) {
        if (firstHalf.val != secondHalf.val) return false;
        firstHalf = firstHalf.next;
        secondHalf = secondHalf.next;
    }
    
    return true;
}

private ListNode reverse(ListNode head) {
    ListNode prev = null;
    while (head != null) {
        ListNode next = head.next;
        head.next = prev;
        prev = head;
        head = next;
    }
    return prev;
}
```

### Pattern 2: Happy Number

**Problem**: Determine if a number is "happy" (sum of squares of digits eventually reaches 1)
**Solution**: Use fast & slow to detect if we enter a cycle
**When to use**: Detecting cycles in sequences

```java
public boolean isHappy(int n) {
    int slow = n;
    int fast = n;
    
    do {
        slow = getNext(slow);           // Move 1 step
        fast = getNext(getNext(fast));  // Move 2 steps
    } while (slow != fast);
    
    return slow == 1;  // If cycle ends at 1, it's happy
}

private int getNext(int n) {
    int sum = 0;
    while (n > 0) {
        int digit = n % 10;
        sum += digit * digit;
        n /= 10;
    }
    return sum;
}
```

### Pattern 3: Reorder List

**Problem**: Reorder list from L0→L1→L2→...→Ln to L0→Ln→L1→Ln-1→L2→Ln-2→...
**Solution**: Find middle, reverse second half, merge alternately
**When to use**: Need to rearrange LinkedList based on position

```java
public void reorderList(ListNode head) {
    if (head == null || head.next == null) return;
    
    // Find middle
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    // Reverse second half
    ListNode second = reverse(slow.next);
    slow.next = null;
    
    // Merge alternately
    ListNode first = head;
    while (second != null) {
        ListNode temp1 = first.next;
        ListNode temp2 = second.next;
        
        first.next = second;
        second.next = temp1;
        
        first = temp1;
        second = temp2;
    }
}
```

## Quick Check

> Try to answer these from memory before clicking the links

1. Why does fast & slow pointer detect cycles? → [Review Cycle Detection](#1-cycle-detection-floyds-algorithm)
2. How do you find the middle of a LinkedList in one pass? → [Review Finding Middle](#2-finding-middle-element)
3. After detecting a cycle, how do you find where it starts? → [Review Cycle Start](#3-finding-cycle-start)
4. What's the time and space complexity of cycle detection? → [Review Why This Matters](#why-this-matters)
5. When should you NOT use fast & slow pointers? → [Review When to Use](#when-to-use)

## Practice Problems

**Beginner**:
1. LinkedList Cycle (LeetCode 141 - Easy)
2. Middle of the LinkedList (LeetCode 876 - Easy)
3. Happy Number (LeetCode 202 - Easy)

**Intermediate**:
1. LinkedList Cycle II (LeetCode 142 - Medium) - Find cycle start
2. Palindrome LinkedList (LeetCode 234 - Easy/Medium)
3. Reorder List (LeetCode 143 - Medium)

**Advanced**:
1. Find the Duplicate Number (LeetCode 287 - Medium) - Treat array as LinkedList
2. Intersection of Two Linked Lists (LeetCode 160 - Easy) - Variation
3. Circular Array Loop (LeetCode 457 - Medium)

## Common Mistakes

❌ **Mistake 1**: Not checking if `fast.next` is null before accessing `fast.next.next`
✅ **Instead**: Always check both `fast != null && fast.next != null`

❌ **Mistake 2**: Starting slow and fast at different positions
✅ **Instead**: Both should start at head (unless problem specifies otherwise)

❌ **Mistake 3**: Moving pointers incorrectly (e.g., `fast = fast.next` instead of `fast.next.next`)
✅ **Instead**: Slow moves 1 step, fast moves 2 steps

❌ **Mistake 4**: Forgetting to handle edge cases (empty list, single node)
✅ **Instead**: Check `head == null || head.next == null` at the start

❌ **Mistake 5**: Using this pattern for arrays when two pointers would work better
✅ **Instead**: Fast & slow is for LinkedLists, use two pointers for arrays

## Interview Questions

### Technical Questions
1. Explain why fast & slow pointers always meet in a cycle → [Hint: Mathematical proof](#3-finding-cycle-start)
2. What's the maximum number of steps before they meet? → [Hint: Cycle length]
3. Can you use 1:3 speed ratio instead of 1:2? → [Hint: Yes, but less efficient]

### Scenario-Based
1. "Detect if a LinkedList has a cycle without extra space" - Which pattern?
2. "Find the middle element of a LinkedList in one pass" - Which approach?
3. "Check if a number eventually reaches 1 or enters a cycle" - How to solve?

## Related Topics

**Prerequisites** (review these first):
- LinkedList basics (traversal, node structure)
- [Two Pointers](./02-two-pointers.md) - Similar concept for arrays

**Next Steps** (study these next):
- [Merge Intervals](./04-merge-intervals.md) - Different pattern
- [LinkedList Reversal](./06-linkedlist-reversal.md) - Often combined with this pattern

**Related Concepts**:
- Floyd's Cycle Detection Algorithm
- Tortoise and Hare Algorithm
- Hash Set approach (alternative with O(n) space)

## Summary

- Fast & slow pointers use two pointers moving at different speeds (typically 1x and 2x)
- Perfect for cycle detection in O(n) time and O(1) space
- Can find middle element in single pass
- Mathematical proof ensures they always meet in a cycle
- Look for keywords: "cycle", "loop", "middle", "palindrome"

## Further Reading

- [Floyd's Cycle Detection Algorithm](https://en.wikipedia.org/wiki/Cycle_detection#Floyd's_Tortoise_and_Hare)
- [LeetCode Fast & Slow Pointers Problems](https://leetcode.com/tag/two-pointers/)
- [Grokking the Coding Interview: Fast & Slow Pointers](https://www.educative.io/courses/grokking-the-coding-interview)

---

**Next**: [Merge Intervals Pattern](./04-merge-intervals.md)
