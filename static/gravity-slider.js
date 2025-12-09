class GravitySlider extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        this.FRAME_RATE = 60;
        this.GRAVITY_CONST = 0.5;

        this.MAX_VALUE = 15;

        this.isDragging = false;
        this.timer = null;

        this.centerX = 0;
        this.centerY = 0;
        this.angleOffset = 0;
        this.angle = 0;
        this.velocity = 0;

        this._value = this.MAX_VALUE / 2;

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.stopDrag = this.stopDrag.bind(this);
        this.updatePhysics = this.updatePhysics.bind(this);
    }

    connectedCallback() {
        this.render();

        this.container = this.shadowRoot.getElementById("slider-container");
        this.inputRange = this.shadowRoot.getElementById("slider");
        this.displayTitle = this.shadowRoot.getElementById("display-value");

        this.container.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("mouseup", this.stopDrag);

        this.container.addEventListener("touchstart", (e) => {
            if (!e.target.classList.contains("handle")) return;
            e.preventDefault();
            const touch = e.touches[0];
            this.onMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: e.target,
            });
        });
        window.addEventListener("touchmove", (e) => {
            if (!this.isDragging) return;
            const touch = e.touches[0];
            this.onMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY,
            });
        });
        window.addEventListener("touchend", this.stopDrag);
    }

    disconnectedCallback() {
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mouseup", this.stopDrag);
        window.removeEventListener("touchmove", this.onMouseMove);
        window.removeEventListener("touchend", this.stopDrag);
        this.stopDrag();
    }

    onMouseDown(e) {
        if (!e.target.classList.contains("handle")) return;

        this.isDragging = true;
        this.container.classList.remove("transition");

        const bounds = this.container.getBoundingClientRect();
        this.centerX = (bounds.left + bounds.right) / 2;
        this.centerY = (bounds.top + bounds.bottom) / 2;

        this.angleOffset = Math.atan2(
            e.clientY - this.centerY,
            e.clientX - this.centerX
        );

        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(this.updatePhysics, 1000 / this.FRAME_RATE);
    }

    onMouseMove(e) {
        if (this.isDragging) {
            const currentAngle = Math.atan2(
                e.clientY - this.centerY,
                e.clientX - this.centerX
            );

            this.angle = currentAngle - this.angleOffset;
            this.container.style.transform = `rotate(${
                (this.angle * 180) / Math.PI
            }deg)`;
        }
    }

    updatePhysics() {
        const acceleration = Math.sin(this.angle) * this.GRAVITY_CONST;
        this.velocity += acceleration;
        let nextValue = this._value + this.velocity;

        if (nextValue > this.MAX_VALUE) {
            nextValue = this.MAX_VALUE;
            this.velocity = 0;
        } else if (nextValue < 0) {
            nextValue = 0;
            this.velocity = 0;
        }
        this.updateValue(nextValue);
    }

    stopDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;
        clearInterval(this.timer);
        this.timer = null;
        this.velocity = 0;
        this.angle = 0;

        this.container.classList.add("transition");
        this.container.style.transform = "rotate(0deg)";
    }

    updateValue(val) {
        this._value = val;
        this.inputRange.value = val;
        this.displayTitle.innerText = Math.round(val);
        this.dispatchEvent(
            new CustomEvent("input", {
                detail: { value: Math.round(val) },
                bubbles: true,
                composed: true,
            })
        );
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                font-family: sans-serif;
            }
            .control-container {
                height: 300px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                user-select: none;
            }
            .control-title {
                margin-bottom: 20px;
                font-size: 1.2rem;
                font-weight: bold;
            }
            #slider-container {
                background: #f0f0f0;
                border: 2px solid #333;
                border-radius: 8px;
                display: flex;
                align-items: stretch;
                padding: 0;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                transform-origin: center center;
                will-change: transform;
                overflow: hidden;
            }
            #slider-container.transition {
                transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .handle {
                width: 40px;
                background: #ddd;
                cursor: grab;
                display: flex;
                justify-content: center;
                align-items: center;
                transition: background 0.2s;
                background-image: repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 4px,
                    #aaa 4px,
                    #aaa 5px
                );
                background-clip: content-box;
                padding: 15px 10px;
            }
            .handle:hover {
                background-color: #ccc;
            }
            .handle:active {
                cursor: grabbing;
                background-color: #bbb;
            }
            .center-part {
                padding: 15px 10px;
                background: #f0f0f0;
                display: flex;
                align-items: center;
                border-left: 1px solid #ccc;
                border-right: 1px solid #ccc;
            }
            #slider {
                width: 180px;
                pointer-events: none;
            }
            input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 16px; width: 16px;
                background: #fff;
                box-shadow: 2px 2px 2px #000000;
                border-radius: 50%;
                margin-top: -4px;
            }
            input[type=range] {
                -webkit-appearance: none;
                background: transparent;
            }
            input[type=range]::-webkit-slider-runnable-track {
                width: 100%; height: 8px;
                background: #ccc; border-radius: 4px;
            }
        </style>

        <div class="control-container">
            <div class="control-title">Cows:<span id="display-value">${Math.round(this._value)}</span></div>

            <div id="slider-container" class="transition">
                <div class="handle left"></div>
                <div class="center-part">
                    <input id="slider" type="range" min="0" max="${this.MAX_VALUE}" value="${this._value}" disabled>
                </div>
                <div class="handle right"></div>
            </div>

            <p style="margin-top: 20px; color: #666; font-size: 0.8rem;">
                Cows = value (Max: ${this.MAX_VALUE})
            </p>
        </div>
        `;
    }
}

customElements.define("gravity-slider", GravitySlider);