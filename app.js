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

// --- 2. UI CONTROLLER ---
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

        this.wallX = 0;
        this.awningStartY = 0;
        this.currentAwningWidthPx = 0;
        this.roofAngleRadians = 5 * (Math.PI / 180);
        this.groundY = 0; // NEU: Höhe des Bodens

        this.initCanvas();
        window.addEventListener('resize', () => this.initCanvas());
        this.drawLoop();
    }

    initCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.wallX = this.canvas.width * 0.15;
        this.awningStartY = this.canvas.height * 0.20;
        // Der Boden fängt bei 95% der Bildschirmhöhe an (5vh Höhe)
        this.groundY = this.canvas.height * 0.95;

        this.drops = [];
        for (let i = 0; i < 350; i++) {
            this.drops.push(this.createDrop());
        }
    }

    createDrop(startAtTop = true) {
        return {
            x: Math.random() * (this.canvas.width * 2),
            y: startAtTop ? Math.random() * -this.canvas.height : -20,
            length: Math.random() * 20 + 10,
            speedY: Math.random() * 15 + 20,
            speedX: -(Math.random() * 10 + 15),
            opacity: Math.random() * 0.4 + 0.1
        };
    }

    createSplash(x, y, isGround = false) {
        this.splashes.push({
            x: x,
            y: y,
            radius: 1,
            maxRadius: isGround ? Math.random() * 8 + 4 : Math.random() * 6 + 3,
            opacity: 0.6
        });
    }

    updateScene(percentage) {
        this.percentageText.innerHTML = `${percentage.toFixed(1)} <span class="percent-sign">%</span>`;

        let maxAwningVw = 45;
        let currentVw = (percentage / 100) * maxAwningVw;
        this.awning.style.setProperty('--awning-width', `${currentVw}vw`);

        this.currentAwningWidthPx = (currentVw / 100) * window.innerWidth;

        let brightness = percentage > 50 ? 1.0 : 0.3 + (percentage / 100) * 0.8;
        this.person.style.setProperty('--person-brightness', brightness);
    }

    drawLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';

        let awningRightEdgeX = this.wallX + this.currentAwningWidthPx;

        for (let i = 0; i < this.drops.length; i++) {
            let drop = this.drops[i];
            let nextX = drop.x + drop.speedX;
            let nextY = drop.y + drop.speedY;

            // 1. KOLLISION MIT DEM DACH
            if (nextX > this.wallX && nextX < awningRightEdgeX) {
                let distanceFromWall = nextX - this.wallX;
                let roofYAtThisX = this.awningStartY + Math.tan(this.roofAngleRadians) * distanceFromWall;

                if (drop.y < roofYAtThisX && nextY >= roofYAtThisX) {
                    this.createSplash(nextX, roofYAtThisX, false);
                    this.drops[i] = this.createDrop(false);
                    continue;
                }
            }

            // 2. KOLLISION MIT DEM GRÜNEN BODEN
            if (nextY >= this.groundY) {
                this.createSplash(nextX, this.groundY, true); // Größerer Splash auf dem Boden
                this.drops[i] = this.createDrop(false);
                continue;
            }

            this.ctx.strokeStyle = `rgba(180, 210, 255, ${drop.opacity})`;
            this.ctx.beginPath();
            this.ctx.moveTo(drop.x, drop.y);
            this.ctx.lineTo(nextX, nextY);
            this.ctx.stroke();

            drop.x = nextX;
            drop.y = nextY;

            if (drop.x < -100) {
                this.drops[i] = this.createDrop(false);
            }
        }

        // Splashes zeichnen
        for (let j = this.splashes.length - 1; j >= 0; j--) {
            let splash = this.splashes[j];
            splash.radius += 0.8;
            splash.x -= 1;
            splash.opacity -= 0.05;

            if (splash.opacity <= 0) {
                this.splashes.splice(j, 1);
            } else {
                this.ctx.fillStyle = `rgba(200, 230, 255, ${splash.opacity})`;
                this.ctx.beginPath();
                // Wenn der Splash auf dem Boden ist, machen wir einen vollen, flachen Tropfen
                this.ctx.arc(splash.x, splash.y, splash.radius, 0, Math.PI * 2);
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
        this.btn.style.right = "20px";
        this.btn.style.zIndex = "100";
        this.btn.style.background = "rgba(255,255,255,0.1)";
        this.btn.style.color = "white";
        this.btn.style.border = "1px solid rgba(255,255,255,0.3)";
        this.btn.style.padding = "10px 20px";
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