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

// --- 2. UI CONTROLLER (Markise & Physik-Regen) ---
class UIController {
    constructor() {
        this.canvas = document.getElementById('rain-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.awning = document.getElementById('awning');
        this.person = document.getElementById('person-png');
        this.percentageText = document.getElementById('percentage-text');
        this.milestoneMessage = document.getElementById('milestone-message');

        this.words = ["SCHUTZ", "RUHE", "ZUFLUCHT", "STILLE", "SICHERHEIT", "GEBORGENHEIT", "FRIEDEN", "KLARHEIT", "AATM MANTHAN"];

        this.drops = [];
        this.splashes = [];
        this.currentAwningWidthPx = 0; // Wie viele Pixel ist das Dach gerade breit?

        this.initCanvas();
        window.addEventListener('resize', () => this.initCanvas());
        this.drawLoop();
    }

    initCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Fülle das Array mit Regentropfen
        this.drops = [];
        for (let i = 0; i < 300; i++) {
            this.drops.push(this.createDrop());
        }
    }

    createDrop(startAtTop = true) {
        return {
            x: Math.random() * (this.canvas.width * 1.5), // Etwas weiter rechts starten lassen wegen dem Wind
            y: startAtTop ? Math.random() * -this.canvas.height : -10,
            length: Math.random() * 15 + 10,
            speedY: Math.random() * 15 + 15, // Fallgeschwindigkeit
            speedX: - (Math.random() * 3 + 2), // Windgeschwindigkeit (nach links)
            opacity: Math.random() * 0.3 + 0.1
        };
    }

    createSplash(x, y) {
        this.splashes.push({
            x: x,
            y: y,
            radius: 1,
            maxRadius: Math.random() * 5 + 3,
            opacity: 0.5
        });
    }

    updateScene(percentage) {
        this.percentageText.innerHTML = `${percentage.toFixed(1)} <span class="percent-sign">%</span>`;

        // 1. Markise ausfahren
        // Bei 0% ist sie 0vw breit, bei 100% ist sie 60vw breit (deckt die Person ab)
        let maxAwningVw = 60;
        let currentVw = (percentage / 100) * maxAwningVw;
        this.awning.style.setProperty('--awning-width', `${currentVw}vw`);

        // Berechne die absolute Pixelbreite für die Regen-Kollision
        let wallWidthPx = window.innerWidth * 0.15; // 15vw Wandbreite
        let startX = window.innerWidth - wallWidthPx; // X-Koordinate der Wand
        this.currentAwningWidthPx = (currentVw / 100) * window.innerWidth;

        // Y-Koordinate der Markise für die Kollision (25vh)
        this.awningY = window.innerHeight * 0.25;
        this.awningLeftEdgeX = startX - this.currentAwningWidthPx;

        // 2. Figur wird heller, je geschützter sie ist
        let brightness = 0.4 + (percentage / 100) * 0.6;
        this.person.style.setProperty('--person-brightness', brightness);
    }

    drawLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Regentropfen bewegen und zeichnen
        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';

        for (let i = 0; i < this.drops.length; i++) {
            let drop = this.drops[i];

            // Nächste Position berechnen
            let nextX = drop.x + drop.speedX;
            let nextY = drop.y + drop.speedY;

            // KOLLISIONSERKENNUNG MIT DER MARKISE
            // Wenn der Tropfen die Y-Linie der Markise kreuzt UND er sich X-technisch unter der Markise befindet
            if (drop.y < this.awningY && nextY >= this.awningY) {
                if (nextX > this.awningLeftEdgeX && nextX < (window.innerWidth - window.innerWidth * 0.15)) {
                    // Treffer! Tropfen prallt am Dach ab.
                    this.createSplash(nextX, this.awningY);
                    this.drops[i] = this.createDrop(false); // Neuer Tropfen oben
                    continue; // Diesen Tropfen nicht mehr zeichnen
                }
            }

            // Tropfen zeichnen
            this.ctx.strokeStyle = `rgba(150, 200, 255, ${drop.opacity})`;
            this.ctx.beginPath();
            this.ctx.moveTo(drop.x, drop.y);
            this.ctx.lineTo(nextX, nextY);
            this.ctx.stroke();

            // Position aktualisieren
            drop.x = nextX;
            drop.y = nextY;

            // Zurücksetzen, wenn er unten aus dem Bild fliegt
            if (drop.y > this.canvas.height || drop.x < 0) {
                this.drops[i] = this.createDrop(false);
            }
        }

        // Splash-Effekte (Wassertropfen, die auf dem Dach zerplatzen) zeichnen
        for (let j = this.splashes.length - 1; j >= 0; j--) {
            let splash = this.splashes[j];
            splash.radius += 0.5;
            splash.opacity -= 0.05;

            if (splash.opacity <= 0) {
                this.splashes.splice(j, 1);
            } else {
                this.ctx.strokeStyle = `rgba(200, 230, 255, ${splash.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(splash.x, splash.y - splash.radius, splash.radius, Math.PI, 0); // Halbkreis nach oben
                this.ctx.stroke();
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

// --- 3. & 4. INPUT MANAGERS ---
class ArduinoInputManager {
    constructor(engine) {
        this.engine = engine;
        this.port = null;
        this.reader = null;

        this.btn = document.createElement('button');
        this.btn.innerText = "🔌 Arduino verbinden";
        this.btn.style.position = "absolute";
        this.btn.style.top = "20px";
        this.btn.style.right = "20px";
        this.btn.style.zIndex = "100";
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