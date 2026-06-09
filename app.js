// --- 1. GAME ENGINE ---
class GameEngine {
    constructor(uiController) {
        this.ui = uiController;
        this.clicks = 0;
        this.difficulty = 1500;
        this.lastTenStep = 0;
        this.decayRate = 4;
        this.lastInputTime = Date.now();

        setInterval(() => this.updateLoop(), 1000 / 30);
    }

    addSpin(amount = 25) {
        this.clicks += amount;
        this.lastInputTime = Date.now();
        this.calculateAndNotify();
    }

    updateLoop() {
        const isIdle = (Date.now() - this.lastInputTime) > 1500;

        if (isIdle && this.clicks > 0) {
            this.clicks -= this.decayRate;
            if (this.clicks < 0) this.clicks = 0;
            this.calculateAndNotify();
        }
    }

    calculateAndNotify() {
        let percentage = 100 * (this.clicks / (this.clicks + this.difficulty));
        this.ui.updateMirror(percentage);

        let currentTenStep = Math.floor(percentage / 10);
        if (currentTenStep > this.lastTenStep && currentTenStep > 0 && currentTenStep < 10) {
            this.ui.triggerMilestone(currentTenStep * 10);
            this.lastTenStep = currentTenStep;
        } else if (currentTenStep < this.lastTenStep) {
            this.lastTenStep = currentTenStep;
        }
    }
}

// --- 2. UI CONTROLLER (Der virtuelle Kamera-Fokus) ---
class UIController {
    constructor() {
        this.reflection = document.getElementById('reflection-figure');
        this.percentageText = document.getElementById('percentage-text');
        this.milestoneMessage = document.getElementById('milestone-message');

        this.words = ["INNERES SEHEN", "STILLE", "BEWUSSTSEIN", "KLARHEIT", "WIRKLICHKEIT", "BILDNIS", "KRAFT", "WURZELN", "SELBSTERKENNTNIS"];
    }

    updateMirror(percentage) {
        this.percentageText.innerHTML = `${percentage.toFixed(1)} <span class="percent-sign">%</span>`;

        // Der cinemastische Fokus-Pull
        // Startet bei extremen 35px Blur und wird komplett scharf (0px)
        let blurValue = 35 - (percentage / 100) * 35;
        if (blurValue < 0) blurValue = 0;

        // Das Spiegelbild fängt dunkel an und fängt an zu leuchten
        let brightnessValue = 0.3 + (percentage / 100) * 0.9;

        // Kommt dem Betrachter leicht entgegen
        let scaleValue = 1.1 - (percentage / 100) * 0.1;

        this.reflection.style.setProperty('--blur-amount', `${blurValue}px`);
        this.reflection.style.setProperty('--brightness-amount', brightnessValue);
        this.reflection.style.setProperty('--scale-amount', scaleValue);
    }

    triggerMilestone(milestone) {
        let index = (milestone / 10) - 1;
        this.milestoneMessage.innerText = this.words[index] || "AATM MANTHAN";
        this.milestoneMessage.classList.add('show');
        setTimeout(() => { this.milestoneMessage.classList.remove('show'); }, 2000);
    }
}

// --- 3. ARDUINO INPUT MANAGER ---
class ArduinoInputManager {
    constructor(engine) {
        this.engine = engine;
        this.port = null;
        this.reader = null;

        this.btn = document.createElement('button');
        this.btn.innerText = "🔌 Hardware verbinden";
        this.btn.style.position = "absolute";
        this.btn.style.top = "20px";
        this.btn.style.right = "20px";
        this.btn.style.padding = "10px 20px";
        this.btn.style.zIndex = "100";
        this.btn.style.background = "rgba(255,255,255,0.1)";
        this.btn.style.color = "white";
        this.btn.style.border = "1px solid rgba(255,255,255,0.3)";
        this.btn.style.cursor = "pointer";
        this.btn.style.borderRadius = "4px";
        document.body.appendChild(this.btn);

        this.btn.addEventListener('click', () => this.connectToArduino());
    }

    async connectToArduino() {
        if ('serial' in navigator) {
            try {
                this.port = await navigator.serial.requestPort();
                await this.port.open({ baudRate: 115200 });
                this.btn.style.display = "none";

                const textDecoder = new TextDecoderStream();
                this.port.readable.pipeTo(textDecoder.writable);
                this.reader = textDecoder.readable.getReader();
                this.readLoop();
            } catch (error) {
                console.error("Verbindungsfehler:", error);
            }
        }
    }

    async readLoop() {
        let buffer = "";
        while (true) {
            const { value, done } = await this.reader.read();
            if (done) { this.reader.releaseLock(); break; }
            if (value) {
                buffer += value;
                let lines = buffer.split("\n");
                buffer = lines.pop();
                for (let line of lines) {
                    if (line.trim() === "TICK") { this.engine.addSpin(25); }
                }
            }
        }
    }
}

// --- 4. KEYBOARD INPUT MANAGER ---
class KeyboardInputManager {
    constructor(engine) {
        this.engine = engine;
        window.addEventListener('keydown', (e) => {
            if (e.key === "w" || e.key === "W") { this.engine.addSpin(25); }
        });
    }
}

// --- INITIALISIERUNG ---
document.addEventListener("DOMContentLoaded", () => {
    const ui = new UIController();
    const engine = new GameEngine(ui);
    const hardwareInput = new ArduinoInputManager(engine);
    const keyboardInput = new KeyboardInputManager(engine);
});