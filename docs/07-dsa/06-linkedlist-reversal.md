# Pattern 6: In-Place Reversal of a LinkedList

> **Before you start**: Can you reverse a linked list without copying it to an array? In-place reversal rewires the `next` pointers directly — O(n) time, O(1) space — and forms the foundation for dozens of list manipulation problems.

---

## What is In-Place Reversal?

In-Place Reversal means flipping the direction of `next` pointers in a linked list without allocating a new list or copying values. You maintain a small set of pointer variables that walk through the list, rerouting each node as you go.

**Analogy**: Imagine a train where each car has a hook connecting it to the car ahead. To reverse the train, walk from the front: unhook the connection pointing forward, rehook it pointing backward. Keep three markers — previous, current, next — so you don't lose your place.

---

## How It Works

**Core reversal** (three-pointer walk):

```
Before: null ← prev  curr → next → ...
After:  null ← prev ← curr  next → ...
```

1. Save `next = curr.next` (don't lose the rest of the list)
2. Flip: `curr.next = prev`
3. Advance: `prev = curr`, `curr = next`
4. Repeat until `curr == null`
5. Return `prev` — it's now the new head

---

## Why This Matters

| Approach | Time | Space |
|----------|------|-------|
| Copy to array, reverse, rebuild | O(n) | O(n) |
| Stack-based reversal | O(n) | O(n) |
| In-Place | **O(n)** | **O(1)** |

Same time complexity, but O(1) space — critical when memory is constrained or when the problem explicitly forbids extra space.

---

## When to Use

Recognition signals:
- "Reverse a linked list"
- "Reverse a sublist / k-group"
- "Palindrome linked list" (reverse second half, compare)
- "Rotate linked list"
- "Reorder list" (interleave first and reversed second half)
- Any operation on a linked list that needs to look backward

---

## Trade-offs

| Pros | Cons |
|------|------|
| O(1) space — no auxiliary data structure | Easy to introduce bugs (wrong pointer order causes infinite loop or null pointer) |
| Works for singly linked lists | Cannot easily reverse partial sections without tracking boundaries |
| Foundation for more complex list problems | Hard to undo — once reversed, original order is lost unless you track it |

---

## Core Concepts

### Concept 1: Reverse Entire LinkedList

```java
public ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;

    while (curr != null) {
        ListNode next = curr.next; // 1. Save next
        curr.next = prev;          // 2. Flip pointer
        prev = curr;               // 3. Advance prev
        curr = next;               // 4. Advance curr
    }
    return prev; // prev is the new head
}
```

**Recursive version** (for interviews that ask for both):
```java
public ListNode reverseListRecursive(ListNode head) {
    if (head == null || head.next == null) return head;
    ListNode newHead = reverseListRecursive(head.next);
    head.next.next = head; // make next node point back to current
    head.next = null;      // disconnect current's forward pointer
    return newHead;
}
```
Recursive uses O(n) stack space — prefer iterative for O(1).

---

### Concept 2: Reverse a Sublist (positions left to right, 1-indexed)

```java
public ListNode reverseBetween(ListNode head, int left, int right) {
    if (head == null || left == right) return head;

    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode prev = dummy;

    // Step 1: Advance prev to the node just before position 'left'
    for (int i = 1; i < left; i++) prev = prev.next;

    // Step 2: Reverse 'right - left + 1' nodes starting from prev.next
    ListNode curr = prev.next;
    ListNode tail = curr; // curr will become the tail of the reversed sublist

    ListNode subPrev = null;
    for (int i = 0; i <= right - left; i++) {
        ListNode next = curr.next;
        curr.next = subPrev;
        subPrev = curr;
        curr = next;
    }

    // Step 3: Reconnect
    prev.next = subPrev;  // connect before-sublist to new head of reversed sublist
    tail.next = curr;     // connect old tail (new end) to after-sublist

    return dummy.next;
}
```

**Dummy node trick**: Attach a dummy node before head so you never need to special-case reversal starting at position 1.

---

### Concept 3: Reverse in K-Groups

```java
public ListNode reverseKGroup(ListNode head, int k) {
    ListNode curr = head;

    // Check if there are k nodes remaining
    int count = 0;
    while (curr != null && count < k) {
        curr = curr.next;
        count++;
    }
    if (count < k) return head; // fewer than k nodes — don't reverse

    // Reverse k nodes
    ListNode prev = null;
    curr = head;
    for (int i = 0; i < k; i++) {
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }

    // head is now the tail of the reversed group
    // Recursively reverse the rest and attach
    head.next = reverseKGroup(curr, k);

    return prev; // prev is the new head of this group
}
```

---

## Common Patterns

### Pattern A: Palindrome LinkedList

**Problem**: Check if a linked list is a palindrome in O(n) time and O(1) space.

```java
public boolean isPalindrome(ListNode head) {
    if (head == null || head.next == null) return true;

    // Step 1: Find middle using fast/slow pointers
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }

    // Step 2: Reverse second half
    ListNode secondHalfHead = reverseList(slow);
    ListNode copy = secondHalfHead; // save to restore later

    // Step 3: Compare first and second halves
    ListNode p1 = head;
    ListNode p2 = secondHalfHead;
    boolean result = true;
    while (p2 != null) {
        if (p1.val != p2.val) { result = false; break; }
        p1 = p1.next;
        p2 = p2.next;
    }

    // Step 4: Restore the list (good practice)
    reverseList(copy);
    return result;
}

private ListNode reverseList(ListNode head) {
    ListNode prev = null, curr = head;
    while (curr != null) {
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}
```

---

### Pattern B: Reorder List

**Problem**: Reorder list L0→L1→...→Ln-1→Ln to L0→Ln→L1→Ln-1→L2→Ln-2→...

```java
public void reorderList(ListNode head) {
    if (head == null || head.next == null) return;

    // Step 1: Find middle
    ListNode slow = head, fast = head;
    while (fast.next != null && fast.next.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }

    // Step 2: Reverse second half
    ListNode secondHalf = reverseList(slow.next);
    slow.next = null; // cut the list in half

    // Step 3: Merge the two halves
    ListNode first = head, second = secondHalf;
    while (second != null) {
        ListNode tmp1 = first.next;
        ListNode tmp2 = second.next;
        first.next = second;
        second.next = tmp1;
        first = tmp1;
        second = tmp2;
    }
}
```

---

## Quick Check

1. What are the three pointer variables you need for in-place reversal, and what does each track?
2. Why does the iterative reversal return `prev` and not `curr` at the end?
3. In the sublist reversal, why do you use a dummy node?
4. In K-group reversal, why do you not reverse if there are fewer than k nodes remaining?
5. For palindrome checking, why reverse the second half instead of the first?

---

## Practice Problems

### Beginner
- **Reverse Linked List** (LeetCode 206) — reverse the entire list
- **Reverse Linked List II** (LeetCode 92) — reverse a sublist from position l to r
- **Palindrome Linked List** (LeetCode 234) — check palindrome in O(1) space

### Intermediate
- **Reverse Nodes in k-Group** (LeetCode 25) — reverse every k nodes
- **Reorder List** (LeetCode 143) — L0→Ln→L1→Ln-1→...
- **Swap Nodes in Pairs** (LeetCode 24) — reverse every 2 nodes (k=2 special case)

### Advanced
- **Rotate List** (LeetCode 61) — rotate list right by k places
- **Reverse Nodes in Even Length Groups** (LeetCode 2074) — conditional group reversal
- **Odd Even Linked List** (LeetCode 328) — regroup odd/even indexed nodes

---

## Common Mistakes

### Mistake 1: Wrong order of pointer updates (loses the list)
```java
// WRONG — curr.next = prev happens before saving next, so next is lost
curr.next = prev;
ListNode next = curr.next; // BUG: this is now prev, not original next!

// CORRECT — always save next FIRST
ListNode next = curr.next;
curr.next = prev;
prev = curr;
curr = next;
```

### Mistake 2: Not using a dummy node for sublist reversal
```java
// WRONG — special case needed when left == 1 (reversal starts at head)
// Without dummy, prev starts as null and reconnection logic breaks

// CORRECT — always use dummy node
ListNode dummy = new ListNode(0);
dummy.next = head;
ListNode prev = dummy;
```

### Mistake 3: Off-by-one in sublist traversal
```java
// To reach the node BEFORE position 'left' (1-indexed):
for (int i = 1; i < left; i++) prev = prev.next;  // CORRECT: stops at left-1

// Common bug:
for (int i = 0; i < left; i++) prev = prev.next;  // WRONG: overshoots by 1
```

### Mistake 4: Forgetting to cut the list before merging in Reorder List
```java
// Without this, the first half still has a pointer to the original second half
// causing an infinite loop during the merge step
slow.next = null; // Cut the list at the midpoint
```

---

## Interview Questions

**Q: What's the recursive reversal's time and space complexity vs iterative?**
A: Both are O(n) time. Recursive is O(n) space (call stack); iterative is O(1) space. Always prefer iterative when space matters.

**Q: How do you reverse a doubly linked list in place?**
A: Same idea — walk through and swap each node's `prev` and `next` pointers. At each node: `ListNode tmp = curr.prev; curr.prev = curr.next; curr.next = tmp; curr = curr.prev;` (move via the original `next`, now stored in `prev`). Return the last node you visited.

**Q: How would you reverse a linked list in groups of k, but keep the last group as-is if it has fewer than k elements?**
A: That's LeetCode 25 exactly. Before reversing each group, count k nodes ahead. If fewer than k exist, return head without reversing.

**Q: Explain the "reverse second half to check palindrome" approach — why not just use a stack?**
A: Stack is O(n) space. The in-place approach uses O(1) by reversing the second half, comparing, and optionally restoring. The tradeoff: the reversal mutates the list (restore it after if the list must remain unchanged).

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Reverse Nodes in k-Group** | 25 | Hard — combine sublist reversal with recursion; must not reverse the last group if fewer than k nodes |
| 2 | **Reorder List** | 143 | Three steps in sequence: find mid (fast/slow), reverse second half, interleave — any step out of order breaks it |
| 3 | **Add Two Numbers** | 2 | Numbers stored in reverse order in two lists; add digit-by-digit with carry — tests traversal + construction |
| 4 | **Add Two Numbers II** | 445 | Numbers stored in forward order — can't traverse backward; use two stacks OR reverse both lists first |
| 5 | **Rotate List** | 61 | Rotation by k — find new tail at position `(n - k % n - 1)`, then reconnect; easy to get the index wrong |
| 6 | **Flatten a Multilevel Doubly Linked List** | 430 | DFS on a list — when you hit a `child`, recurse to flatten it, then splice it in; needs careful prev/next wiring |
| 7 | **Copy List with Random Pointer** | 138 | Clone a list where each node also has a random pointer — do it in O(1) space by interleaving original and clone nodes |

## Related Topics

- **Prerequisite**: Linked list basics (ListNode, traversal)
- **Previous**: [Cyclic Sort](./05-cyclic-sort.md)
- **Next**: [Tree BFS](./07-tree-bfs.md)
- **See also**: [Fast & Slow Pointers](./03-fast-slow-pointers.md) — used to find the midpoint before reversal

---

## Further Reading

- LeetCode "Linked List" tag — sort by difficulty, filter for reversal problems
- "Elements of Programming Interviews" Chapter 7 — Linked Lists
- NeetCode Linked List playlist — covers all major reversal and pointer manipulation patterns
