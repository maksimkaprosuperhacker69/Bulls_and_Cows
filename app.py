from flask import Flask, request, session, jsonify, render_template, redirect
from random import choice, randint
from flask_session import Session
from itertools import permutations


def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'super_secret_key_change_me'
    app.config["SESSION_PERMANENT"] = False
    app.config["SESSION_TYPE"] = "filesystem"
    Session(app)
    return app


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


def get_valid_sequences_by_length(length):
    """Get all valid sequences of specified length with distinct digits"""
    return generate_valid_sequences(length)


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
    secret_chars = list(secret)
    guess_chars = list(guess)
    
    # Count cows: digits that are in secret but not in correct position
    cows = 0
    for char in set(secret):
        secret_count = secret.count(char)
        guess_count = guess.count(char)
        # Count how many of this char are in correct position (bulls)
        bulls_for_char = sum(1 for s, g in zip(secret, guess) if s == g == char)
        # Cows = min of counts minus the bulls
        cows += min(secret_count, guess_count) - bulls_for_char
    
    return bulls, cows


def validate_feedback_consistency(candidates, last_guess, bulls, cows, word_length):
    """
    Check if the feedback is consistent with previous candidates.
    Returns (is_valid, error_message)
    """
    if not candidates:
        return False, "No candidates left"
    
    # Check if any candidate matches this feedback
    matching = [c for c in candidates if bulls_cows(c, last_guess) == (bulls, cows)]
    
    if not matching:
        return False, "Inconsistent feedback: No valid sequences match this result. Please check your bulls/cows count."
    
    # Check if bulls + cows exceeds word length (impossible)
    if bulls + cows > word_length:
        return False, f"Inconsistent feedback: Bulls ({bulls}) + Cows ({cows}) cannot exceed sequence length ({word_length})"
    
    # Check if bulls equals word_length but cows > 0 (impossible)
    if bulls == word_length and cows > 0:
        return False, f"Inconsistent feedback: If all digits are correct (bulls={word_length}), cows must be 0"
    
    return True, None


def detect_repetitions_in_guess(guess):
    """Detect if a guess has repeated digits"""
    return len(guess) != len(set(guess))


def filter_candidates(candidates, last_guess, bulls, cows):
    """Filter candidates based on feedback"""
    return [c for c in candidates if bulls_cows(c, last_guess) == (bulls, cows)]


def initialize_app_routes(app):
    """Initialize all Flask routes"""
    
    @app.route("/")
    def index():
        return redirect("/guess_mode")

    @app.route("/guess_mode")
    def render_guess_page():
        return render_template("guess_mode.html")

    @app.route("/secret_mode")
    def render_secret_page():
        return render_template("secret_mode.html")

    @app.route("/rules")
    def render_rules_page():
        return render_template("rules.html")

    @app.route("/api/secret_mode")
    def api_start_secret():
        """Start secret mode - computer tries to guess user's sequence"""
        word_length = session.get('word_length', 4)
        candidates = get_valid_sequences_by_length(word_length)
        
        if not candidates:
            return jsonify({"error": f"No valid sequences available for length {word_length}"}), 400
        
        session["candidates"] = candidates[:]
        guess = choice(candidates)  # Random first guess
        session["last_guess"] = guess
        session["guess_history"] = []  # Track guess history for error detection
        return jsonify({"guess": guess, "history": []})

    @app.route("/api/secret_mode/feedback", methods=["POST"])
    def api_feedback_secret():
        """Process feedback for secret mode"""
        data = request.json
        bulls = int(data.get("bulls", 0))
        cows = int(data.get("cows", 0))

        if "last_guess" not in session:
            return jsonify({"error": "Game not started. Refresh page."}), 400

        last_guess = session["last_guess"]
        candidates = session.get("candidates", [])
        word_length = session.get('word_length', len(last_guess))
        guess_history = session.get("guess_history", [])

        # Check for repetitions in last guess (improvement feature)
        has_repetitions = detect_repetitions_in_guess(last_guess)
        repetition_warning = None
        if has_repetitions:
            repetition_warning = "Warning: Your sequence may have repeated digits, but the guess had distinct digits."

        # Validate feedback consistency (improvement feature)
        is_valid, error_msg = validate_feedback_consistency(
            candidates, last_guess, bulls, cows, word_length
        )
        if not is_valid:
            return jsonify({"guess": None, "error": error_msg}), 400

        if bulls == word_length:
            # Add final guess to history before returning
            guess_history.append({
                "guess": last_guess,
                "bulls": bulls,
                "cows": cows
            })
            session["guess_history"] = guess_history
            return jsonify({
                'result': "guessed",
                "warning": repetition_warning,
                "history": guess_history
            })

        # Filter candidates based on feedback
        new_candidates = filter_candidates(candidates, last_guess, bulls, cows)

        if not new_candidates:
            return jsonify({"guess": None, "error": "No valid sequences left. There may have been an error in the feedback."}), 400

        # Store history for error detection
        guess_history.append({
            "guess": last_guess,
            "bulls": bulls,
            "cows": cows
        })
        session["guess_history"] = guess_history

        # Choose next guess (simple: first candidate, could be improved with better strategy)
        new_guess = choice(new_candidates)
        session["candidates"] = new_candidates
        session["last_guess"] = new_guess
        
        response = {
            "guess": new_guess,
            "history": guess_history  # Return full history
        }
        if repetition_warning:
            response["warning"] = repetition_warning
        return jsonify(response)

    @app.route("/api/guess_mode")
    def api_start_guess():
        """Start guess mode - user tries to guess computer's sequence"""
        word_length = session.get('word_length', 4)
        valid_sequences = get_valid_sequences_by_length(word_length)
        
        if not valid_sequences:
            return jsonify({"error": f"No valid sequences available for length {word_length}"}), 400
        
        goal = choice(valid_sequences)
        session['goal'] = goal
        return jsonify({"status": "started", "msg": "Computer selected a sequence", "length": len(goal)})

    @app.route("/api/set_word_length", methods=["POST"])
    def api_set_word_length():
        """Set the word length for the game"""
        data = request.json
        length = int(data.get('length', 4))
        
        if length < 1 or length > 10:
            return jsonify({"error": "Word length must be between 1 and 10"}), 400
        
        valid_sequences = get_valid_sequences_by_length(length)
        if not valid_sequences:
            return jsonify({"error": f"No valid sequences available for length {length}"}), 400
        
        session['word_length'] = length
        return jsonify({
            "status": "success",
            "length": length,
            "available_sequences": len(valid_sequences)
        })

    @app.route("/api/guess_mode/feedback", methods=["POST"])
    def api_feedback_guess():
        """Process user's guess in guess mode"""
        data = request.json
        user_guess = data.get('word', '')

        if 'goal' not in session:
            return jsonify({"error": "Game not started"}), 400

        goal = session['goal']
        word_length = session.get('word_length', len(goal))
        
        # Validate guess length
        if len(user_guess) != word_length:
            return jsonify({"error": f"Guess must be {word_length} digits long"}), 400
        
        # Validate distinct digits (improvement: warn if user guesses with repetitions)
        if not has_distinct_digits(user_guess):
            return jsonify({
                "error": "Guess must contain distinct digits (no repetitions)",
                "hint": "The secret sequence has distinct digits, so your guess should too."
            }), 400
        
        bulls, cows = bulls_cows(goal, user_guess)

        if bulls == len(goal):
            return jsonify({'result': "guessed", "answer": goal})

        return jsonify({"cows": cows, "bulls": bulls})

    @app.route("/api/stress_test", methods=["POST"])
    def api_stress_test():
        """Run stress test: play multiple games and return statistics"""
        data = request.json
        num_games = int(data.get('num_games', 100))
        word_length = int(data.get('word_length', 4))
        
        if num_games < 1 or num_games > 1000:
            return jsonify({"error": "Number of games must be between 1 and 1000"}), 400
        
        if word_length < 1 or word_length > 10:
            return jsonify({"error": "Word length must be between 1 and 10"}), 400
        
        results = run_stress_test(num_games, word_length)
        return jsonify(results)


def run_stress_test(num_games, word_length):
    """
    Run stress test: play num_games games and return statistics.
    This simulates the computer guessing sequences.
    """
    attempts_list = []
    valid_sequences = get_valid_sequences_by_length(word_length)
    
    if not valid_sequences:
        return {"error": f"No valid sequences for length {word_length}"}
    
    for _ in range(num_games):
        # Random secret sequence
        secret = choice(valid_sequences)
        attempts = play_single_game(secret, valid_sequences)
        attempts_list.append(attempts)
    
    avg_attempts = sum(attempts_list) / len(attempts_list)
    min_attempts = min(attempts_list)
    max_attempts = max(attempts_list)
    
    return {
        "num_games": num_games,
        "word_length": word_length,
        "average_attempts": round(avg_attempts, 2),
        "min_attempts": min_attempts,
        "max_attempts": max_attempts,
        "total_attempts": sum(attempts_list)
    }


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


# Initialize Flask app
app = create_app()
initialize_app_routes(app)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=82)
