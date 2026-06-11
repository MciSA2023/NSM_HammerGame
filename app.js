// --- 1. GAME ENGINE ---
class GameEngine {
    constructor(uiController) {
        this.ui = uiController;
        this.clicks = 0;
        this.difficulty = 1500;
        this.lastTenStep = 0;
        this.decayRate = 3;
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
        this.ui.updateScene(percentage);

        let currentTenStep = Math.floor(percentage / 10);
        if (currentTenStep > this.lastTenStep && currentTenStep > 0 && currentTenStep < 10) {
            this.ui.triggerMilestone(currentTenStep * 10);
            this.lastTenStep = currentTenStep;
        } else if (currentTenStep < this.lastTenStep) {
            this.lastTenStep = currentTenStep;
        }
    }
}

// --- 2. UI CONTROLLER (2 Phasen System mit Variablen & repariertem Regen) ---
class UIController {
    constructor() {
        this.canvas = document.getElementById('rain-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stormOverlay = document.getElementById('storm-overlay');
        this.personCover = document.getElementById('person-cover');
        this.percentageText = document.getElementById('percentage-text');
        this.milestoneMessage = document.getElementById('milestone-message');

        this.words = ["RUHE", "FOKUS", "KLARHEIT", "STILLE", "ERWACHEN", "LIEBE", "FRIEDEN", "ERKENNTNIS", "AATM MANTHAN"];

        // ========================================================
        // ⚙️ KONFIGURATION DER PHASEN
        // ========================================================
        this.config = {
            rainStopPercent: 20,
            revealStartPercent: 30,
            revealEndPercent: 100
        };
        // ========================================================

        this.drops = [];
        this.splashes = [];
        this.groundY = 0;
        this.targetDrops = 300; // Maximale Regenmenge zu Beginn

        this.initCanvas();
        window.addEventListener('resize', () => this.initCanvas());
        this.drawLoop();
    }

    initCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.groundY = this.canvas.height * 0.95;

        this.drops = [];
        for (let i = 0; i < this.targetDrops; i++) {
            this.drops.push(this.createDrop());
        }
    }

    createDrop(startAtTop = true) {
        return {
            x: Math.random() * this.canvas.width,
            y: startAtTop ? Math.random() * -this.canvas.height : -20,
            length: Math.random() * 20 + 10,
            speedY: Math.random() * 15 + 20,
            speedX: (Math.random() - 0.5) * 2,
            opacity: Math.random() * 0.4 + 0.1
        };
    }

    createSplash(x, y) {
        this.splashes.push({
            x: x, y: y,
            radius: 1, maxRadius: Math.random() * 6 + 3,
            opacity: 0.5
        });
    }

    updateScene(percentage) {
        this.percentageText.innerHTML = `${percentage.toFixed(1)} <span class="percent-sign">%</span>`;

        // ==========================================
        // PHASE 1: Regen steuern (Stoppt beim Hochgehen, startet beim Runtergehen)
        // ==========================================
        let rainIntensity = 1.0;
        if (percentage < this.config.rainStopPercent) {
            rainIntensity = 1.0 - (percentage / this.config.rainStopPercent);
        } else {
            rainIntensity = 0;
        }

        // Steuert, wie viele Tropfen aktuell im Bild sein SOLLTEN
        this.targetDrops = Math.floor(300 * rainIntensity);
        this.stormOverlay.style.opacity = rainIntensity;

        // ==========================================
        // PHASE 2: Farbe & Natur (Dynamisch über config)
        // ==========================================
        let revealProgress = 0;
        let environmentProgress = 0;

        if (percentage >= this.config.revealStartPercent) {
            let revealRange = this.config.revealEndPercent - this.config.revealStartPercent;
            revealProgress = ((percentage - this.config.revealStartPercent) / revealRange) * 100;
            if (revealProgress > 100) revealProgress = 100;

            environmentProgress = revealProgress / 100;
        }

        this.personCover.style.setProperty('--reveal-percentage', `${revealProgress}%`);
        document.documentElement.style.setProperty('--grass-opacity', environmentProgress);
        document.documentElement.style.setProperty('--sun-opacity', environmentProgress * 0.9);
        document.documentElement.style.setProperty('--sun-scale', 0.5 + environmentProgress * 0.5);

        let flowerScale = environmentProgress * 1.2;
        if (flowerScale > 1) flowerScale = 1;
        document.documentElement.style.setProperty('--flower-scale', flowerScale);
    }

    drawLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';

        // REPARATUR: Auffüllen fehlender Tropfen (z.B. beim Verfall)
        if (this.drops.length < this.targetDrops) {
            let dropsToAdd = Math.min(5, this.targetDrops - this.drops.length);
            for (let k = 0; k < dropsToAdd; k++) {
                this.drops.push(this.createDrop(false)); // Startet sofort an der Oberkante
            }
        }

        for (let i = 0; i < this.drops.length; i++) {
            let drop = this.drops[i];
            let nextX = drop.x + drop.speedX;
            let nextY = drop.y + drop.speedY;

            // Kollision mit dem Boden
            if (nextY >= this.groundY) {
                this.createSplash(nextX, this.groundY);

                // Wenn wir zu viele Tropfen haben (beim Hochkurbeln), löschen wir sie
                if (this.drops.length > this.targetDrops) {
                    this.drops.splice(i, 1);
                    i--;
                    continue;
                } else {
                    // Normaler Fall: Tropfen schlägt auf, startet wieder ganz oben
                    this.drops[i] = this.createDrop(false);
                    continue;
                }
            }

            this.ctx.strokeStyle = `rgba(180, 210, 255, ${drop.opacity})`;
            this.ctx.beginPath();
            this.ctx.moveTo(drop.x, drop.y);
            this.ctx.lineTo(nextX, nextY);
            this.ctx.stroke();

            drop.x = nextX;
            drop.y = nextY;
        }

        // Splashes am Boden zeichnen
        for (let j = this.splashes.length - 1; j >= 0; j--) {
            let splash = this.splashes[j];
            splash.radius += 1;
            splash.opacity -= 0.05;

            if (splash.opacity <= 0) {
                this.splashes.splice(j, 1);
            } else {
                this.ctx.fillStyle = `rgba(200, 230, 255, ${splash.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(splash.x, splash.y, splash.radius, 0, Math.PI);
                this.ctx.fill();
            }
        }

        requestAnimationFrame(() => this.drawLoop());
    }

    triggerMilestone(milestone) {
        let index = (milestone / 10) - 1;
        this.milestoneMessage.innerText = this.words[index] || "AATM MANTHAN";
        this.milestoneMessage.classList.add('show');
        setTimeout(() => { this.milestoneMessage.classList.remove('show'); }, 2000);
    }
}


// --- 3. HARDWARE INPUT MANAGER ---
class ArduinoInputManager {
    constructor(engine) {
        this.engine = engine;
        this.port = null;
        this.reader = null;

        this.btn = document.createElement('button');
        this.btn.innerText = "🔌 Arduino verbinden";
        this.btn.style.position = "absolute";
        this.btn.style.top = "20px";
        this.btn.style.left = "20px";
        this.btn.style.zIndex = "100";
        this.btn.style.background = "rgba(255,255,255,0.1)";
        this.btn.style.color = "white";
        this.btn.style.border = "1px solid rgba(255,255,255,0.3)";
        this.btn.style.padding = "10px 20px";
        this.btn.style.cursor = "pointer";
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

document.addEventListener("DOMContentLoaded", () => {
    const ui = new UIController();
    const engine = new GameEngine(ui);
    const hardwareInput = new ArduinoInputManager(engine);
    const keyboardInput = new KeyboardInputManager(engine);
});