from flask import Flask, request, session, jsonify, render_template, redirect
from random import choice

app = Flask(__name__)
app.config['SECRET_KEY'] = 'super_secret_key_change_me'

file = open("./static/words_set.txt", "r")
WORDS = file.read().split()

def bulls_cows(a, b):
    a = str(a).lower()
    b = str(b).lower()
    bulls = sum(x == y for x, y in zip(a, b))
    cows = sum(min(a.count(ch), b.count(ch)) for ch in set(a)) - bulls
    return bulls, cows

@app.route("/")
def index():
    return redirect("/guess_mode")

@app.route("/guess_mode")
def render_guess_page():
    return render_template("guess_mode.html")

@app.route("/secret_mode")
def render_secret_page():
    return render_template("secret_mode.html")

@app.route("/api/secret_mode")
def api_start_secret():
    session["candidates"] = WORDS[:]
    guess = session["candidates"][0]
    session["last_guess"] = guess
    return jsonify({"guess": guess})

@app.route("/api/secret_mode/feedback", methods=["POST"])
def api_feedback_secret():
    data = request.json
    bulls = int(data.get("bulls", 0))
    cows = int(data.get("cows", 0))

    if "last_guess" not in session:
        return jsonify({"error": "Game not started. Refresh page."}), 400

    last = session["last_guess"]
    candidates = session["candidates"]

    if bulls == 4:
        return jsonify({'result': "guessed"})

    new_candidates = [
        w for w in candidates
        if bulls_cows(w, last) == (bulls, cows)
    ]

    if not new_candidates:
        return jsonify({"guess": None, "error": "No words left"})

    new_guess = new_candidates[0]
    session["candidates"] = new_candidates
    session["last_guess"] = new_guess
    return jsonify({"guess": new_guess})

@app.route("/api/guess_mode")
def api_start_guess():
    goal = choice(WORDS)
    session['goal'] = goal
    return jsonify({"status": "started", "msg": "Computer selected a word", "length": len(goal)})

@app.route("/api/guess_mode/feedback", methods=["POST"])
def api_feedback_guess():
    data = request.json
    user_word = data.get('word')

    if 'goal' not in session:
        return jsonify({"error": "Game not started"}), 400

    goal = session['goal']
    bulls, cows = bulls_cows(goal, user_word)

    if bulls == len(goal):
        return jsonify({'result': "guessed", "answer": goal})

    return jsonify({"cows": cows, "bulls": bulls})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)