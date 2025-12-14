"""
Stress test for Bulls and Cows game.
Runs the program many times, guessing randomly generated sequences.
Calculates statistics on the number of attempts made.
"""

from itertools import permutations
from random import choice


def has_distinct_digits(sequence):
    """Check if sequence has distinct digits (no repetitions)"""
    return len(sequence) == len(set(sequence))


def generate_valid_sequences(length):
    """Generate all valid sequences of given length with distinct digits using permutations"""
    if length > 10:
        return []
    digits = "0123456789"
    perms = list(permutations(digits, length))
    sequences = ["".join(p) for p in perms]
    return sequences


def bulls_cows(secret, guess):
    """
    Calculate bulls and cows for a guess.
    Bulls: correct digit in correct position
    Cows: correct digit in wrong position
    """
    secret = str(secret)
    guess = str(guess)
    bulls = sum(s == g for s, g in zip(secret, guess))
    
    # Count all matching digits, then subtract bulls to get cows
    cows = 0
    for char in set(secret):
        secret_count = secret.count(char)
        guess_count = guess.count(char)
        # Count how many of this char are in correct position (bulls)
        bulls_for_char = sum(1 for s, g in zip(secret, guess) if s == g == char)
        # Cows = min of counts minus the bulls
        cows += min(secret_count, guess_count) - bulls_for_char
    
    return bulls, cows


def filter_candidates(candidates, last_guess, bulls, cows):
    """Filter candidates based on feedback"""
    return [c for c in candidates if bulls_cows(c, last_guess) == (bulls, cows)]


def play_single_game(secret, candidates):
    """
    Play a single game where computer tries to guess the secret.
    Returns number of attempts made.
    Uses a simple strategy: filter candidates based on feedback.
    """
    attempts = 0
    current_candidates = candidates[:]
    
    while current_candidates:
        attempts += 1
        # Choose a guess (simple strategy: random from candidates)
        guess = choice(current_candidates)
        
        # Calculate feedback
        bulls, cows = bulls_cows(secret, guess)
        
        # Check if guessed
        if bulls == len(secret):
            return attempts
        
        # Filter candidates
        current_candidates = filter_candidates(current_candidates, guess, bulls, cows)
    
    # Should not happen with correct feedback, but handle edge case
    return attempts


def run_stress_test(num_games, word_length):
    """
    Run stress test: play num_games games and return statistics.
    This simulates the computer guessing sequences.
    
    Parameters:
        num_games: number of games to play
        word_length: length of the sequence (default 4)
    
    Returns:
        Dictionary with statistics
    """
    attempts_list = []
    valid_sequences = generate_valid_sequences(word_length)
    
    if not valid_sequences:
        return {"error": f"No valid sequences for length {word_length}"}
    
    print(f"Running stress test: {num_games} games with {word_length}-digit sequences...")
    
    for i in range(num_games):
        # Random secret sequence
        secret = choice(valid_sequences)
        attempts = play_single_game(secret, valid_sequences)
        attempts_list.append(attempts)
        
        if (i + 1) % 100 == 0:
            print(f"Completed {i + 1}/{num_games} games...")
    
    avg_attempts = sum(attempts_list) / len(attempts_list)
    min_attempts = min(attempts_list)
    max_attempts = max(attempts_list)
    
    results = {
        "num_games": num_games,
        "word_length": word_length,
        "average_attempts": round(avg_attempts, 2),
        "min_attempts": min_attempts,
        "max_attempts": max_attempts,
        "total_attempts": sum(attempts_list)
    }
    
    print("\n" + "="*50)
    print("STRESS TEST RESULTS")
    print("="*50)
    print(f"Number of games: {num_games}")
    print(f"Word length: {word_length}")
    print(f"Average attempts: {results['average_attempts']}")
    print(f"Minimum attempts: {min_attempts}")
    print(f"Maximum attempts: {max_attempts}")
    print(f"Total attempts: {results['total_attempts']}")
    print("="*50)
    
    return results


if __name__ == "__main__":
    # Run stress test with default parameters
    run_stress_test(num_games=9999, word_length=4)
    
    

