document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "";

    const computerGuessDisplay = document.getElementById("currentWord");
    const bullsInput = document.getElementById("quantity-input_bulls");
    const cowsInput = document.getElementById("quantity-input_cows");
    const sendFeedbackBtn = document.getElementById("comic-brutal-button");
    const historyContainer = document.getElementById("history");
    const secretHistoryContainer = document.getElementById("secretHistory");

    const terminalInput = document.getElementById("realInput");
    const terminalMirror = document.getElementById("mirror");
    const terminalOutput = document.getElementById("output");

    let currentBulls = 0;
    let currentCows = 0;
    let isChange = true;

    async function apiRequest(endpoint, method = "GET", body = null) {
        const options = {
            method: method,
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const url = `${API_BASE_URL}/api${endpoint}`;

        try {
            const response = await fetch(url, options);

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error(
                    "Сервер вернул не JSON. Возможно, ошибка в адресе URL."
                );
            }

            return await response.json();
        } catch (error) {
            console.error(`Ошибка запроса к ${url}:`, error);
            throw error;
        }
    }

    if (bullsInput) {
        bullsInput.addEventListener("input", () => {
            currentBulls = bullsInput.value;
            console.log("Выбрано быков:", currentBulls);
            bullsInput.value = bullsInput.value.replace(/\D/g, "");
        });
    }

    if (cowsInput) {
        cowsInput.addEventListener("input", (e) => {
            cowsInput.value = cowsInput.value.replace(/\D/g, "");
            currentCows = cowsInput.value;
        });
    }

    if (terminalInput) {
        terminalInput.addEventListener("input", (e) => {
            let temp = terminalInput.value;
            terminalInput.value = terminalInput.value.replace(/\D/g, "");
            isChange = !(temp == terminalInput.value);
        });
    }

    function updateSecretHistory(history) {
        if (!secretHistoryContainer) return;

        secretHistoryContainer.innerHTML = "";

        if (!history || history.length === 0) {
            return;
        }

        history.forEach((entry, index) => {
            const row = document.createElement("div");
            row.className = "history-row";

            const attemptNum = document.createElement("span");
            attemptNum.className = "history-word";
            attemptNum.textContent = `#${index + 1}`;
            attemptNum.style.minWidth = "40px";

            const guessSpan = document.createElement("span");
            guessSpan.className = "history-word";
            guessSpan.textContent = entry.guess;
            guessSpan.style.minWidth = "80px";

            const resultSpan = document.createElement("span");
            resultSpan.className = "history-result";
            resultSpan.textContent = `Bulls: ${entry.bulls} | Cows: ${entry.cows}`;

            row.appendChild(attemptNum);
            row.appendChild(guessSpan);
            row.appendChild(resultSpan);
            secretHistoryContainer.appendChild(row);
        });
    }

    async function startSecretGame() {
        if (!computerGuessDisplay) return;

        try {
            const data = await apiRequest("/secret_mode");
            if (data.guess) {
                computerGuessDisplay.innerText = data.guess;
                if (data.history) {
                    updateSecretHistory(data.history);
                }
            } else {
                computerGuessDisplay.innerText = "Error starting game";
            }
        } catch (e) {
            computerGuessDisplay.innerText = "Server Error";
        }
    }

    if (sendFeedbackBtn) {
        sendFeedbackBtn.addEventListener("click", async () => {
            try {
                const data = await apiRequest("/secret_mode/feedback", "POST", {
                    bulls: currentBulls,
                    cows: currentCows,
                });
                console.log(currentBulls);
                console.log(currentCows);

                if (data.result === "guessed") {
                    computerGuessDisplay.innerText = "I WON! 🎉";
                    computerGuessDisplay.style.color = "#2ecc71";
                    // Update history to show final attempt
                    if (data.history) {
                        updateSecretHistory(data.history);
                    }
                    if (data.warning) {
                        alert(data.warning);
                    }
                } else if (data.error) {
                    alert(data.error);
                    computerGuessDisplay.innerText = data.error + "\n" + computerGuessDisplay.innerText;
                    computerGuessDisplay.style.color = "red";
                } else {
                    computerGuessDisplay.innerText = data.guess;
                    computerGuessDisplay.style.opacity = 0;
                    computerGuessDisplay.style.color = "green";
                    setTimeout(
                        () => (computerGuessDisplay.style.opacity = 1),
                        200
                    );
                    // Update history with all previous attempts
                    if (data.history) {
                        updateSecretHistory(data.history);
                    }
                    if (data.warning) {
                        alert(data.warning);
                    }
                }
            } catch (e) {
                alert("Не удалось отправить данные на сервер");
            }
        });
    }

    if (terminalInput && terminalMirror) {
        function renderText(isDeletion = false) {
            const value = terminalInput.value;
            const chars = value.split("");
            terminalMirror.innerHTML = "";
            chars.forEach((char, index) => {
                const span = document.createElement("span");
                span.textContent = char;
                span.classList.add("char");
                if (!isDeletion && index === chars.length - 1) {
                    span.classList.add("animate");
                }
                terminalMirror.appendChild(span);
            });
            const cursor = document.createElement("span");
            cursor.classList.add("cursor");
            terminalMirror.appendChild(cursor);
        }

        terminalInput.addEventListener("input", (e) => {
            const isDeletion =
                e.inputType === "deleteContentBackward" ||
                e.inputType === "deleteContentForward" ||
                isChange;
            renderText(isDeletion);
        });

        terminalInput.addEventListener("keydown", async (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();

            const word = terminalInput.value.trim();
            if (!word) return;

            terminalInput.value = "";
            renderText(true);

            try {
                const data = await apiRequest("/guess_mode/feedback", "POST", {
                    word,
                });

                if (historyContainer && !data.error) {
                    const row = document.createElement("div");
                    row.className = "history-row";

                    const wordSpan = document.createElement("span");
                    wordSpan.className = "history-word";
                    wordSpan.textContent = word;

                    const resultSpan = document.createElement("span");
                    resultSpan.className = "history-result";

                    if (data.result === "guessed") {
                        resultSpan.textContent = "✓ GUESSED";
                        resultSpan.style.color = "#2ecc71";
                    } else {
                        resultSpan.textContent = `Bulls: ${data.bulls} | Cows: ${data.cows}`;
                    }

                    row.appendChild(wordSpan);
                    row.appendChild(resultSpan);
                    historyContainer.appendChild(row);
                }

                if (terminalOutput) {
                    if (data.result === "guessed") {
                        terminalOutput.innerText = `You won! Answer: ${data.answer}`;
                        terminalOutput.style.color = "#2ecc71";
                    } else if (data.error) {
                        terminalOutput.innerText =
                            data.error + (data.hint ? " " + data.hint : "");
                        terminalOutput.style.color = "red";
                    } else {
                        terminalOutput.innerText = "";
                    }
                }
            } catch (err) {
                console.error(err);
            }
        });

        renderText();
        terminalInput.focus();

        // Initialize game with default or saved word length
        async function startGuessGame() {
            try {
                const res = await apiRequest("/guess_mode");
                console.log("Guess mode started");
                const l = document.getElementById("length");
                if (l) {
                    l.innerText = "Length: " + res.length;
                }
            } catch (err) {
                console.error("Error starting guess game:", err);
            }
        }

        startGuessGame();
    }

    // Word length selection functionality
    const wordLengthSelect = document.getElementById("word-length-select");
    const applyLengthBtn = document.getElementById("apply-length-btn");

    if (wordLengthSelect && applyLengthBtn) {
        applyLengthBtn.addEventListener("click", async () => {
            const selectedLength = parseInt(wordLengthSelect.value);

            try {
                const response = await apiRequest("/set_word_length", "POST", {
                    length: selectedLength,
                });

                if (response.error) {
                    alert(response.error);
                    return;
                }

                // Restart the game with new length
                if (terminalInput) {
                    // Clear history and output
                    if (historyContainer) {
                        historyContainer.innerHTML = "";
                    }
                    if (terminalOutput) {
                        terminalOutput.innerText = "";
                    }

                    // Start new game
                    try {
                        const res = await apiRequest("/guess_mode");
                        const l = document.getElementById("length");
                        if (l) {
                            l.innerText = "Length: " + res.length;
                        }
                        alert(
                            `Word length set to ${selectedLength}. New game started!`
                        );
                    } catch (err) {
                        console.error("Error restarting game:", err);
                        alert(
                            "Error starting new game. Please refresh the page."
                        );
                    }
                }
            } catch (err) {
                console.error("Error setting word length:", err);
                alert("Error setting word length. Please try again.");
            }
        });
    }

    if (computerGuessDisplay) {
        startSecretGame();
    }

    // Word length selection for secret mode
    const wordLengthSelectSecret = document.getElementById(
        "word-length-select-secret"
    );
    const applyLengthBtnSecret = document.getElementById(
        "apply-length-btn-secret"
    );

    if (wordLengthSelectSecret && applyLengthBtnSecret) {
        applyLengthBtnSecret.addEventListener("click", async () => {
            const selectedLength = parseInt(wordLengthSelectSecret.value);

            try {
                const response = await apiRequest("/set_word_length", "POST", {
                    length: selectedLength,
                });

                if (response.error) {
                    alert(response.error);
                    return;
                }

                // Restart the secret game with new length
                if (computerGuessDisplay) {
                    computerGuessDisplay.innerText = "Restarting...";
                    // Clear history when restarting
                    if (secretHistoryContainer) {
                        secretHistoryContainer.innerHTML = "";
                    }
                    await startSecretGame();
                    alert(
                        `Word length set to ${selectedLength}. New game started!`
                    );
                }
            } catch (err) {
                console.error("Error setting word length:", err);
                alert("Error setting word length. Please try again.");
            }
        });
    }

    const input_cows = document.getElementById("quantity-input_cows");
    const incrementBtn_cows = document.getElementById("increment-button_cows");
    const decrementBtn_cows = document.getElementById("decrement-button_cows");

    incrementBtn_cows.addEventListener("click", () => {
        let value = parseInt(input_cows.value) || 0;
        if (value < 99999) value++;
        input_cows.value = value;
        currentCows = value;
        console.log(value);
    });

    decrementBtn_cows.addEventListener("click", () => {
        let value = parseInt(input_cows.value) || 0;
        if (value > 0) value--;
        input_cows.value = value;
        currentCows = value;
        console.log(value);
    });

    const input_bulls = document.getElementById("quantity-input_bulls");
    const incrementBtn_bulls = document.getElementById(
        "increment-button_bulls"
    );
    const decrementBtn_bulls = document.getElementById(
        "decrement-button_bulls"
    );

    incrementBtn_bulls.addEventListener("click", () => {
        let value = parseInt(input_bulls.value) || 0;
        if (value < 99999) value++;
        input_bulls.value = value;
        currentBulls = value;
        console.log(value);
    });

    decrementBtn_bulls.addEventListener("click", () => {
        let value = parseInt(input_bulls.value) || 0;
        if (value > 0) value--;
        input_bulls.value = value;
        currentBulls = value;
        console.log(value);
    });
});
