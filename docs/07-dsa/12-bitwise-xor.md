# Pattern 12: Bitwise XOR

> **Before you start**: Can you find the one element that appears an odd number of times without using extra space? XOR cancels out pairs — any number XORed with itself is 0, and any number XORed with 0 is itself.

---

## What is Bitwise XOR?

XOR (exclusive OR) is a bitwise operation where bits are 1 only when the two input bits differ. The key properties that make it powerful for DSA:

1. `a ^ a = 0` — any number XORed with itself cancels out
2. `a ^ 0 = a` — XOR with zero is identity
3. `a ^ b ^ a = b` — XOR is commutative and associative; duplicates cancel
4. `a ^ b = c` → `c ^ b = a` — XOR is its own inverse

**Analogy**: Think of XOR as a light switch — toggling the same switch twice returns to the original state. Each element "toggles" the running result. Elements that appear twice toggle back to zero and vanish. Only the unique element remains.

---

## How It Works

```
Find the single non-duplicate in [4, 1, 2, 1, 2]

XOR all: 4 ^ 1 ^ 2 ^ 1 ^ 2
       = 4 ^ (1^1) ^ (2^2)
       = 4 ^ 0 ^ 0
       = 4
```

Order doesn't matter — XOR is commutative. All duplicate pairs cancel; only unpaired elements remain.

---

## Why This Matters

| Approach | Time | Space |
|----------|------|-------|
| HashMap frequency count | O(n) | O(n) |
| Sorting + scan | O(n log n) | O(1) or O(log n) |
| XOR | **O(n)** | **O(1)** |

XOR achieves the best of both: linear time and constant space. No hash collisions, no sorting.

---

## When to Use

Recognition signals:
- "Find the element that appears an odd number of times"
- "Find the missing number in a range"
- "Find two numbers that appear once (rest appear twice)"
- "Swap two variables without a temp variable"
- "Check if two numbers have opposite signs"
- "Detect if a number is a power of 2" (use `n & (n-1)`)
- Bit manipulation problems involving cancellation of pairs

---

## Trade-offs

| Pros | Cons |
|------|------|
| O(1) space — no data structures | Only works when logic maps to bit cancellation |
| O(n) time | Hard to read — non-obvious at first glance |
| Works on integers directly | Doesn't generalize to elements appearing 3, 4 times (need different bit tricks) |

---

## Core Concepts

### Concept 1: Single Number (one element appears once, rest appear twice)

```java
public int singleNumber(int[] nums) {
    int result = 0;
    for (int num : nums) {
        result ^= num; // duplicates cancel; single element survives
    }
    return result;
}
```

---

### Concept 2: Find the Missing Number (range [0, n])

```java
// Array has n numbers from [0, n] with exactly one missing
public int missingNumber(int[] nums) {
    int result = nums.length; // start with n (the last expected value)
    for (int i = 0; i < nums.length; i++) {
        result ^= i ^ nums[i];
        // XOR with index i (expected) and nums[i] (actual)
        // matching pairs cancel; the missing index remains
    }
    return result;
}
```

**Alternatively using math**: `expected = n*(n+1)/2`, `missing = expected - sum(nums)`. XOR avoids overflow for very large n.

---

### Concept 3: Two Single Numbers (two elements appear once, rest appear twice)

```java
// Find both elements that appear exactly once when all others appear twice
public int[] singleNumberIII(int[] nums) {
    // Step 1: XOR all → result = a ^ b (the two single numbers)
    int xor = 0;
    for (int num : nums) xor ^= num;

    // Step 2: Find any bit that differs between a and b
    // rightmost set bit of (a^b) is a bit where a and b differ
    int diffBit = xor & (-xor); // isolate rightmost set bit

    // Step 3: Partition nums into two groups by this bit; XOR each group
    int a = 0, b = 0;
    for (int num : nums) {
        if ((num & diffBit) != 0) {
            a ^= num; // group 1: has the diffBit set
        } else {
            b ^= num; // group 2: doesn't have the diffBit set
        }
    }
    return new int[]{a, b};
}
```

**Key trick**: `xor & (-xor)` isolates the rightmost set bit. In this bit position, `a` and `b` differ — so partitioning by it separates them. Within each partition, all duplicates cancel, leaving one single number.

---

## Common Patterns

### Pattern A: Flip and Find (complement and XOR)

**Problem**: You're given a list where each of n numbers in [1, n] appears either once or twice. Find all numbers that appear twice and all that are missing.

```java
public int[] findErrorNums(int[] nums) {
    int duplicate = -1, missing = -1;

    for (int i = 0; i < nums.length; i++) {
        int idx = Math.abs(nums[i]) - 1;
        if (nums[idx] < 0) {
            duplicate = idx + 1; // seen this index before → duplicate
        } else {
            nums[idx] = -nums[idx]; // mark as seen by negating
        }
    }
    for (int i = 0; i < nums.length; i++) {
        if (nums[i] > 0) missing = i + 1; // never negated → never visited
    }
    return new int[]{duplicate, missing};
}
```

---

### Pattern B: XOR Useful Bit Tricks

```java
// Check if n is a power of 2 (exactly one bit set)
boolean isPowerOf2 = (n > 0) && ((n & (n - 1)) == 0);

// Swap two variables without temp
a ^= b;
b ^= a;
a ^= b;

// Check if two integers have opposite signs
boolean oppositeSigns = (a ^ b) < 0; // MSB differs → opposite signs

// Get the rightmost set bit
int rightmostBit = n & (-n);

// Clear the rightmost set bit
n = n & (n - 1);

// Count set bits (Brian Kernighan's algorithm)
int count = 0;
while (n != 0) { n = n & (n - 1); count++; }
```

---

### Pattern C: XOR for Checksum / Data Validation

```java
// Detect if exactly one bit was flipped between two integers
public boolean oneBitFlip(int a, int b) {
    int diff = a ^ b;
    return diff != 0 && (diff & (diff - 1)) == 0; // diff is a power of 2 → exactly one bit differs
}
```

---

## Quick Check

1. What is `5 ^ 5`? What is `7 ^ 0`?
2. XOR is commutative and associative. Why does this matter for the single number problem?
3. In the Two Single Numbers problem, what does `xor & (-xor)` compute and why?
4. What's the difference between `a & b` (AND), `a | b` (OR), and `a ^ b` (XOR)?
5. How would you check if the k-th bit (0-indexed from right) of n is set?

---

## Practice Problems

### Beginner
- **Single Number** (LeetCode 136) — one element appears once, rest appear twice
- **Missing Number** (LeetCode 268) — find missing from [0, n]
- **Reverse Bits** (LeetCode 190) — reverse the bits of a 32-bit integer
- **Number of 1 Bits** (LeetCode 191) — count set bits (Hamming weight)

### Intermediate
- **Single Number II** (LeetCode 137) — one appears once, rest appear three times (needs bit counters)
- **Single Number III** (LeetCode 260) — two appear once, rest appear twice
- **Missing Number (XOR)** — find missing from [1, n] using XOR
- **Set Mismatch** (LeetCode 645) — find duplicate and missing

### Advanced
- **Find the Duplicate Number** (LeetCode 287) — array of n+1 integers in [1,n]
- **Maximum XOR of Two Numbers in an Array** (LeetCode 421) — Trie-based XOR maximization
- **Sum of Two Integers** (LeetCode 371) — add without `+` operator using bit manipulation
- **Total Hamming Distance** (LeetCode 477) — sum of bit differences between all pairs

---

## Common Mistakes

### Mistake 1: Confusing XOR with OR
```java
// XOR: bits differ → 1 (0^0=0, 0^1=1, 1^0=1, 1^1=0)
// OR:  at least one bit is 1 → 1 (0|0=0, 0|1=1, 1|0=1, 1|1=1)
// They produce different results! Double-check which operation you need.
```

### Mistake 2: Forgetting that XOR of two same numbers is 0, not the number
```java
int result = 5 ^ 5;
// Beginners sometimes expect 5, actual result is 0
```

### Mistake 3: Using signed right shift for bit extraction
```java
// WRONG for unsigned bit inspection — sign extension causes issues
int bit = (n >> 31) & 1; // OK for sign bit only

// CORRECT for any bit position — use unsigned right shift >>>
int bit = (n >>> k) & 1; // safe for all k from 0 to 31
```

### Mistake 4: Overflow in the missing number math approach (not XOR)
```java
// WRONG for n > 65535 (sum can overflow int)
int missing = n * (n + 1) / 2 - sum;

// CORRECT — cast to long
long missing = (long) n * (n + 1) / 2 - Arrays.stream(nums).asLongStream().sum();

// Or just use XOR — naturally overflow-safe
```

---

## Interview Questions

**Q: Why does XOR work for finding a single number in a sea of duplicates?**
A: XOR is both commutative and associative, and `x ^ x = 0`. So any pair of identical values cancels out regardless of their positions. Folding the entire array with XOR leaves only the elements that don't have a pair — all pairs zero out.

**Q: How would you find the single number if all others appear three times (not two)?**
A: XOR doesn't work directly since `x ^ x ^ x = x` (odd count). Use a bit counter approach: for each of the 32 bit positions, count how many numbers have that bit set. If `count % 3 != 0`, the unique number has that bit set. Reconstruct the answer bit by bit. O(32n) = O(n).

**Q: What does `n & (n-1)` do?**
A: It clears the rightmost set bit of n. `n-1` flips all bits from the rightmost set bit downward. ANDing with n clears just that bit. Use: count set bits (Brian Kernighan), check power of 2 (`n & (n-1) == 0`), find last 1 bit.

**Q: Can you swap two variables without a temporary using XOR?**
A: Yes — `a ^= b; b ^= a; a ^= b;`. But only when `a != b` (if a and b point to the same variable, it zeroes out). In practice, always use a temp variable — the XOR swap is a trick, not production code.

---

## Mixed Practice (Test Your Understanding)

| # | Problem | LC | Why it's tricky |
|---|---|---|---|
| 1 | **Sum of Two Integers** | 371 | Add without `+` — use XOR for sum bits, AND+shift for carry; loop until carry is zero |
| 2 | **Maximum XOR of Two Numbers in an Array** | 421 | Build a bit Trie; for each number, greedily pick the opposite bit at each level to maximize XOR |
| 3 | **Total Hamming Distance** | 477 | Bit-by-bit: for bit position k, count numbers with that bit set (call it c); contribution = c × (n - c) |
| 4 | **XOR Queries of a Subarray** | 1310 | Prefix XOR array: `prefix[i] = nums[0] ^ ... ^ nums[i]`; query `[l,r]` = `prefix[r] ^ prefix[l-1]` |
| 5 | **Decode XORed Permutation** | 1734 | Recover permutation from XOR array — XOR of all 1..n and XOR of even-indexed encoded pairs gives the first element |
| 6 | **Minimum Flips to Make a OR b Equal to c** | 1318 | Check each bit pair in (a, b, c) — count flips needed: if c-bit=0, flip any 1s in a or b; if c-bit=1, flip both zeros |
| 7 | **Find the XOR Beauty of Array** | 2527 | The beauty = XOR of all elements — the mathematical proof that all cross-terms cancel is the non-obvious insight |

## Related Topics

- **Prerequisite**: Binary representation of integers, basic bit operations (&, |, ^, ~, <<, >>)
- **Previous**: [Modified Binary Search](./11-modified-binary-search.md)
- **Next**: [Top K Elements](./13-top-k-elements.md)
- **See also**: [Cyclic Sort](./05-cyclic-sort.md) — another O(1) space approach for missing/duplicate number problems

---

## Further Reading

- LeetCode "Bit Manipulation" tag — filter for XOR-based problems
- Hacker's Delight (book) — comprehensive bit twiddling techniques
- "Bit Tricks" LeetCode discussion thread — community-compiled XOR and AND patterns
