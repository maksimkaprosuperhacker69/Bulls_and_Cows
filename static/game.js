document.addEventListener("DOMContentLoaded", () => {

    const API_BASE_URL = "";


    const computerGuessDisplay = document.getElementById("currentWord");
    const bullsInput = document.getElementById("bullsInput");
    const cowsInput = document.getElementById("myGravityInput");
    const sendFeedbackBtn = document.getElementById("sendBtn");

    const terminalInput = document.getElementById("realInput");
    const terminalMirror = document.getElementById("mirror");
    const terminalOutput = document.getElementById("output");


    let currentBulls = 0;
    let currentCows = 0;


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
                throw new Error("Сервер вернул не JSON. Возможно, ошибка в адресе URL.");
            }

            return await response.json();
        } catch (error) {
            console.error(`Ошибка запроса к ${url}:`, error);
            throw error;
        }
    }



    if (bullsInput) {
        bullsInput.addEventListener("change", (e) => {
            currentBulls = e.detail.value;
            console.log("Выбрано быков:", currentBulls);
        });
    }

    if (cowsInput) {
        cowsInput.addEventListener("input", (e) => {
            currentCows = e.detail.value;
        });
    }

    async function startSecretGame() {
        if (!computerGuessDisplay) return;

        try {
            const data = await apiRequest("/secret_mode");
            if (data.guess) {
                computerGuessDisplay.innerText = data.guess;
            } else {
                computerGuessDisplay.innerText = "Error starting game";
            }
        } catch (e) {
            computerGuessDisplay.innerText = "Server Error";
        }
    }

    if (sendFeedbackBtn) {
        sendFeedbackBtn.addEventListener("click", async () => {
            sendFeedbackBtn.disabled = true;
            sendFeedbackBtn.innerText = "Thinking...";
            try {
                const data = await apiRequest("/secret_mode/feedback", "POST", {
                    bulls: currentBulls,
                    cows: currentCows,
                });

                if (data.result === "guessed") {
                    computerGuessDisplay.innerText = "I WON! 🎉";
                    computerGuessDisplay.style.color = "#2ecc71";
                    sendFeedbackBtn.style.display = "none";
                } else if (data.error) {
                    alert(data.error);
                    computerGuessDisplay.innerText = "No words left :(";
                } else {
                    computerGuessDisplay.innerText = data.guess;
                    computerGuessDisplay.style.opacity = 0;
                    setTimeout(() => (computerGuessDisplay.style.opacity = 1), 200);
                }
            } catch (e) {
                alert("Не удалось отправить данные на сервер");
            } finally {
                if (sendFeedbackBtn.style.display !== "none") {
                    sendFeedbackBtn.disabled = false;
                    sendFeedbackBtn.innerText = "Send Feedback";
                }
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
                e.inputType === "deleteContentForward";
            renderText(isDeletion);
        });

        terminalInput.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const word = terminalInput.value.trim();
                if (!word) return;


                terminalInput.value = "";
                renderText(true);

                try {
                    const data = await apiRequest("/guess_mode/feedback", "POST", {
                        word: word,
                    });

                    if (terminalOutput) {
                        if (data.result === "guessed") {
                            terminalOutput.innerText = `You won! Answer: ${data.answer}`;
                            terminalOutput.style.color = "#2ecc71";
                        } else if (data.error) {
                            terminalOutput.innerText = data.error;
                            terminalOutput.style.color = "red";
                        } else {
                            terminalOutput.innerText = `Bulls: ${data.bulls}, Cows: ${data.cows}`;
                            terminalOutput.style.color = "orange";
                        }
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        });

        renderText();
        terminalInput.focus();


        apiRequest("/guess_mode").then((res) => {
        console.log("Guess mode started");
        l=document.getElementById('length')
        l.innerText="Length: "+res.length
        });
    }

    if (computerGuessDisplay) {
        startSecretGame();
    }


});