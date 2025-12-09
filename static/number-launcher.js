class NumberLauncher extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        // --- КОНСТАНТЫ ---
        this.FRAME_RATE = 60;
        this.TRACK_LENGTH = 200; // Длина шкалы в пикселях
        this.MAX_VALUE = 20; // Максимальное значение
        this.ICON_WIDTH = 60;

        // Физика (угловая скорость, время полета)
        this.O_LAUNCHER = -Math.PI / 4 / (1.0 * this.FRAME_RATE);
        this.MAX_T = 1;
        this.V_0 =
            this.TRACK_LENGTH /
            Math.cos(Math.PI / 4) /
            (this.MAX_T * this.FRAME_RATE);
        this.MAX_H = this.ICON_WIDTH * Math.sin(Math.PI / 4);

        // Гравитация
        this.g =
            ((this.MAX_H +
                this.V_0 *
                    Math.sin(Math.PI / 4) *
                    (this.MAX_T * this.FRAME_RATE)) *
                2) /
            (this.MAX_T * this.FRAME_RATE * (this.MAX_T * this.FRAME_RATE));

        // --- СОСТОЯНИЕ ---
        this.powerAnim = null;
        this.isPowering = false;
        this.angle = 0;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.currentValue = 0; // Храним текущее значение

        // Bindings
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.powerUp = this.powerUp.bind(this);
    }

    connectedCallback() {
        this.render();
        this.iconBtn = this.shadowRoot.getElementById("icon");
        this.indicator = this.shadowRoot.getElementById("indicator");
        this.valueDisplay = this.shadowRoot.getElementById("value-display");

        // Listeners
        this.iconBtn.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("mouseup", this.onMouseUp);

        // Touch support
        this.iconBtn.addEventListener("touchstart", (e) => {
            e.preventDefault();
            this.onMouseDown();
        });
        window.addEventListener("touchend", this.onMouseUp);
    }

    disconnectedCallback() {
        window.removeEventListener("mouseup", this.onMouseUp);
        window.removeEventListener("touchend", this.onMouseUp);
    }

    powerUp() {
        this.angle += this.O_LAUNCHER;
        if (this.angle < -(Math.PI / 4)) {
            this.angle = -(Math.PI / 4);
        }
        this.iconBtn.style.transform = `rotate(${
            (this.angle * 180) / Math.PI
        }deg)`;
    }

    launch() {
        // Стартовые координаты
        this.y = (this.angle / (Math.PI / 4)) * this.MAX_H;
        this.vx = this.V_0 * Math.cos(this.angle);
        this.vy = this.V_0 * Math.sin(this.angle);

        this.indicator.style.visibility = "visible";

        let bulletAnim = setInterval(() => {
            // Если упали (y > 0)
            if (this.y > 0) {
                this.indicator.style.transform = `translateX(${
                    -6 + this.x
                }px) translateY(${-4}px)`;

                // --- ЛОГИКА РАСЧЕТА ЗНАЧЕНИЯ ---
                // Ограничиваем x от 0 до длины трека
                let clampedX = Math.max(0, Math.min(this.x, this.TRACK_LENGTH));

                // Пропорция: (дистанция / макс_дистанцию) * 10
                let rawValue = (clampedX / this.TRACK_LENGTH) * this.MAX_VALUE;

                // Округляем до целого int
                let intValue = Math.round(rawValue);

                this.updateValue(intValue);

                // Сброс физики
                this.x = this.y = this.vx = this.vy = 0;
                clearInterval(bulletAnim);
            } else {
                // Полет
                this.indicator.style.transform = `translateX(${
                    -6 + this.x
                }px) translateY(${-4 + this.y}px)`;
            }

            // Физика шага
            this.vy += this.g;
            this.y += this.vy;
            this.x += this.vx;
        }, 1000 / this.FRAME_RATE);
    }

    updateValue(val) {
        if (this.currentValue !== val) {
            this.currentValue = val;

            // 1. Обновляем текст внутри компонента
            this.valueDisplay.innerText = val;
            this.valueDisplay.classList.add("bump"); // Анимация удара
            setTimeout(() => this.valueDisplay.classList.remove("bump"), 200);

            // 2. Отправляем событие наружу
            this.dispatchEvent(
                new CustomEvent("change", {
                    detail: { value: val },
                    bubbles: true,
                    composed: true,
                })
            );
        }
    }

    onMouseDown() {
        this.isPowering = true;
        this.iconBtn.classList.remove("transition");
        this.powerAnim = setInterval(this.powerUp, 1000 / this.FRAME_RATE);
    }

    onMouseUp() {
        if (this.isPowering) {
            this.isPowering = false;
            clearInterval(this.powerAnim);
            this.powerAnim = null;
            this.iconBtn.classList.add("transition");
            this.launch();
            this.angle = 0;
            this.iconBtn.style.transform = `rotate(0)`;
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                font-family: sans-serif;
            }
            .control-container {
                padding: 40px 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
            }
            .launcher-area {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            /* --- ИКОНКА --- */
            #icon {
    width: 60px; /* Чуть увеличил для удобства */
    height: 60px;
    background-color: rgb(0, 96, 0); /* Цвет стрелки */

    /* Точка вращения:
       0% center = левый край (жопка стрелки).
       Подберите, чтобы ось была там, где крепление */
    transform-origin: 0% center;

    /* Убираем border-radius, иначе он обрубит концы стрелки */
    /* border-radius: 50%; <--- УДАЛИТЬ */

    /* Встроенная SVG стрелка (Data URI) */
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    mask-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');

    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;

    /* contain вписывает иконку целиком в квадрат */
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-position: center;
    mask-position: center;

    cursor: pointer;
    position: relative;
    z-index: 2;
}

#icon:hover {
    background-color: orange; /* Цвет при наведении */
}
            #icon.transition {
                transition: transform 0.2s ease-out;
            }

            /* --- ТРЕК --- */
            #track {
                width: 200px;
                height: 6px;
                border-radius: 3px;
                background: #e0e0e0;
                position: relative;
                /* Насечки для шкалы 0-10 */
                background-image: repeating-linear-gradient(90deg, #ccc 0, #ccc 1px, transparent 1px, transparent 20px);
            }

            /* --- ИНДИКАТОР ПОЛЕТА --- */
            #indicator {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: orange;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                visibility: hidden;
                position: absolute;
                left: 0;
                top: 0;
                transform: translateX(-7px) translateY(-4px);
                z-index: 10;
            }

            /* --- ЦИФРА РЕЗУЛЬТАТА --- */
            .value-wrapper {
                font-size: 2rem;
                font-weight: bold;
                color: #333;
                min-width: 50px;
                text-align: center;
            }
            .bump {
                animation: pop 0.2s ease-in-out;
                color: #6200ea;
            }

            @keyframes pop {
                0% { transform: scale(1); }
                50% { transform: scale(1.5); }
                100% { transform: scale(1); }
            }
        </style>

        <div class="control-container">
            <div class="value-wrapper">
                <span id="value-display">0</span>
            </div>

            <div class="launcher-area">
                <div id="icon" class="transition"></div>
                <div id="track">
                    <div id="indicator"></div>
                </div>

            </div>
            <p style="margin-top: 20px; color: #666; font-size: 0.8rem;">
                Bulls = value (Max: ${this.MAX_VALUE})
            </p>
        </div>
        `;
    }
}

customElements.define("number-launcher", NumberLauncher);
