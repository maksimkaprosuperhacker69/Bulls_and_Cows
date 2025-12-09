class TrickyButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.escapeCount = 0;
        this.maxEscapes = 20;

        this.onMouseOver = this.onMouseOver.bind(this);
        this.onClick = this.onClick.bind(this);
    }

    static get observedAttributes() {
        return ['escapes'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'escapes') {
            this.maxEscapes = parseInt(newValue, 10) || 20;
        }
    }

    connectedCallback() {
        this.render();
        this.btn = this.shadowRoot.getElementById('btn');


        this.btn.addEventListener('mouseover', this.onMouseOver);
        this.btn.addEventListener('click', this.onClick);
        this.btn.addEventListener('touchstart', (e) => {
            if (this.escapeCount < this.maxEscapes) {
                e.preventDefault();
                this.onMouseOver();
            }
        });
    }

    disconnectedCallback() {
        if (this.btn) {
            this.btn.removeEventListener('mouseover', this.onMouseOver);
            this.btn.removeEventListener('click', this.onClick);
        }
    }

    onMouseOver() {

        if (this.escapeCount < this.maxEscapes) {

            this.btn.classList.add('escaping');

            const maxX = window.innerWidth - this.btn.offsetWidth;
            const maxY = window.innerHeight - this.btn.offsetHeight;

            const newX = Math.random() * maxX;
            const newY = Math.random() * maxY;

            this.btn.style.left = `${newX}px`;
            this.btn.style.top = `${newY}px`;

            this.escapeCount++;
            console.log(`Попытка: ${this.escapeCount}/${this.maxEscapes}`);
        } else {
            this.btn.classList.add('surrendered');
            this.btn.textContent = "I give up!";
        }
    }

    onClick(e) {
        e.preventDefault();

        if (this.escapeCount >= this.maxEscapes) {

            this.dispatchEvent(new CustomEvent('caught', {
                bubbles: true,
                composed: true
            }));


            this.reset();
        }
    }

    reset() {
        this.escapeCount = 0;

        this.btn.classList.remove('escaping', 'surrendered');

        this.btn.textContent = "Send Feedback";

        this.btn.style.left = "";
        this.btn.style.top = "";
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                font-family: sans-serif;
                padding: 20px;
                text-align: center;
            }

            button {
                padding: 15px 30px;
                font-size: 1.2rem;
                background: #eee;
                color: #111;
                border: 2px solid #000;
                border-radius: 30px;
                cursor: pointer;
                font-weight: bold;
                white-space: nowrap;
                user-select: none;

                position: relative;
                transition: top 0.2s ease-out, left 0.2s ease-out, background-color 0.3s;
            }

            button.escaping {
                position: fixed;
                z-index: 10000;
                box-shadow: 0 10px 20px rgba(0,0,0,0.5);
            }


            button.surrendered {
                background-color: #2ecc71;
                color: white;
                border-color: #27ae60;
                cursor: pointer;
            }
        </style>

        <button id="btn" type="button">Send Feedback</button>
        `;
    }
}

customElements.define('tricky-button', TrickyButton);