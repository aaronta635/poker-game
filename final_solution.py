def can_reach_target(n, b):
    """
    Determine if we can reach target array b starting from array of all zeros.
    
    Algorithm: Use recursive backtracking to try all possible reverse operations.
    For each state, try reversing every possible operation that could have led to it.
    
    Time complexity: Exponential in worst case, but often much better due to pruning.
    Space complexity: O(n) for recursion depth.
    """
    
    def backtrack(current):
        """
        Try to reach all zeros from current state by reversing operations.
        Returns True if possible, False otherwise.
        """
        # Base case: reached initial state
        if all(x == 0 for x in current):
            return True
        
        # Try reversing each possible operation
        for pos in range(n):
            if current[pos] == 0:
                continue  # Cannot reverse operation that resulted in 0
            
            # Try all possible x values that could have created current[pos]
            # If current[pos] = prev_val + x, then prev_val = current[pos] - x
            # Constraint: prev_val < x, so current[pos] - x < x
            # Therefore: x > current[pos]/2
            min_x = (current[pos] + 1) // 2
            
            for x in range(min_x, current[pos] + 1):
                prev_val = current[pos] - x
                
                if prev_val < 0:
                    continue
                
                # Create the previous state
                prev_state = current[:]
                prev_state[pos] = prev_val
                
                # Validate this reverse operation:
                
                # 1. x must be greater than min(prev_state)
                if x <= min(prev_state):
                    continue
                
                # 2. pos must be the first position where prev_state[i] < x
                first_position_less_than_x = -1
                for i in range(n):
                    if prev_state[i] < x:
                        first_position_less_than_x = i
                        break
                
                if first_position_less_than_x != pos:
                    continue
                
                # 3. prev_val must be < x (guaranteed by our range, but check anyway)
                if prev_val >= x:
                    continue
                
                # Valid reverse operation found, recurse
                if backtrack(prev_state):
                    return True
        
        return False
    
    return backtrack(b)

def solve():
    """Main function for competitive programming format"""
    t = int(input())
    for _ in range(t):
        n = int(input())
        b = list(map(int, input().split()))
        
        if can_reach_target(n, b):
            print("YES")
        else:
            print("NO")

def test_examples():
    """Test with provided examples"""
    test_cases = [
        (4, [5, 6, 1, 1]),  # Expected: YES
        (3, [3, 1, 2]),     # Expected: NO  
        (3, [40, 60, 90]),  # Expected: NO
        (2, [1, 1])         # Expected: YES
    ]
    
    expected = ["YES", "NO", "NO", "YES"]
    
    print("Testing provided examples:")
    all_passed = True
    
    for i, (n, b) in enumerate(test_cases):
        result = "YES" if can_reach_target(n, b) else "NO"
        status = "✓" if result == expected[i] else "✗"
        print(f"Test {i+1}: {b} -> {result} (expected: {expected[i]}) {status}")
        if result != expected[i]:
            all_passed = False
    
    print(f"\nAll tests passed: {all_passed}")
    return all_passed

if __name__ == "__main__":
    if test_examples():
        print("\n" + "="*50)
        print("All tests passed! Solution is ready.")
        print("To run with competitive programming input, call solve()")
        print("="*50)

