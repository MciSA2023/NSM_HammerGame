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

// --- 2. UI CONTROLLER (Gestaffelte Timeline: Wolken -> Regen -> Abfluss) ---
class UIController {
    constructor() {
        this.canvas = document.getElementById('rain-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stormOverlay = document.getElementById('storm-overlay');
        this.personCover = document.getElementById('person-cover');
        this.percentageText = document.getElementById('percentage-text');
        this.milestoneMessage = document.getElementById('milestone-message');

        this.lightning = document.createElement('div');
        this.lightning.id = 'lightning-flash';
        document.getElementById('exhibition-scene').appendChild(this.lightning);

        this.words = ["RUHE", "FOKUS", "KLARHEIT", "STILLE", "ERWACHEN", "LIEBE", "FRIEDEN", "ERKENNTNIS", "AATM MANTHAN"];

        this.drops = [];
        this.splashes = [];
        this.groundY = 0;
        this.targetDrops = 0;
        this.currentPercentage = 0; // Speichern wir für die Blitze

        this.initCanvas();
        window.addEventListener('resize', () => this.initCanvas());
        this.drawLoop();
    }

    initCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.groundY = this.canvas.height * 0.95;
        this.drops = [];
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
        // UI Text-Update
        this.percentageText.innerHTML = `${percentage.toFixed(1)} <span class="percent-sign">%</span>`;
        this.currentPercentage = percentage;

        // ==============================================================
        // 1. DAS INNERE WACHSTUM (Figur leert das Wasser nach unten)
        // ==============================================================
        if (this.personCover) {
            this.personCover.style.setProperty('--reveal-raw', percentage);
        }

        // ==============================================================
        // 2. DAS ÄUSSERE WETTER (Linear von 0% Sturm zu 100% Sonne)
        // ==============================================================
        let progress = percentage / 100;

        // Licht, Gras & Berge (werden stetig bunter)
        document.documentElement.style.setProperty('--day-opacity', progress);

        // Die Sonne (bricht stetig durch)
        document.documentElement.style.setProperty('--sun-opacity', progress);
        document.documentElement.style.setProperty('--ray-opacity', progress);
        document.documentElement.style.setProperty('--sun-scale', 0.5 + (progress * 0.5));

        // Wolken (verziehen sich nach außen)
        document.documentElement.style.setProperty('--cloud-parting', progress);
        document.documentElement.style.setProperty('--cloud-opacity', 1.0 - progress);

        // Regen (hört kurz vor 100% komplett auf)
        let rainIntensity = 1.0 - (progress * 1.2);
        if (rainIntensity < 0) rainIntensity = 0;
        this.targetDrops = Math.floor(600 * rainIntensity);

        // ==============================================================
        // 3. DIE WELT-BEWEGUNG (Direkt linear an 0-100% gekoppelt!)
        // ==============================================================

        // Wipp-Animation (Gehen) triggern, wenn sich der Wert verändert
        if (typeof this.lastPercentage === 'undefined') {
            this.lastPercentage = percentage;
            this.worldPosition = 0;
        }

        let delta = percentage - this.lastPercentage;
        this.lastPercentage = percentage;

        // Wenn gekurbelt wird, Welt bewegen
        if (Math.abs(delta) > 0.01) {
            this.worldPosition += delta * 10;
        }

        // --- DER 5x5 GRID WALKCYCLE ---
        // Wie schnell die Beine wechseln (Tipp: Spiel mit diesem Wert, bis es natürlich aussieht)
        let walkSpeed = 1.2;
        let totalFrames = 25; // Dein Bild hat 25 Frames
        let columns = 5;      // 5 Spalten

        // Aktuellen Frame anhand der zurückgelegten Strecke berechnen
        let currentFrame = Math.floor(this.worldPosition * walkSpeed) % totalFrames;

        // Verhindert Abstürze, falls man rückwärts kurbelt
        if (currentFrame < 0) currentFrame = totalFrames + currentFrame;

        // Ausrechnen, in welcher Zeile und Spalte sich der aktuelle Frame befindet
        let col = currentFrame % columns;
        let row = Math.floor(currentFrame / columns);

        // Die CSS-Prozente für das Raster berechnen 
        // (Bei 5 Bildern gibt es 4 Abstände -> 100% / 4 = 25%)
        let percentX = col * 25;
        let percentY = row * 25;

        // Werte an das CSS schicken
        document.documentElement.style.setProperty('--walk-x', `${percentX}%`);
        document.documentElement.style.setProperty('--walk-y', `${percentY}%`);


        // --- DER LINEARE WEG FÜR DIE LANDSCHAFT ---
        let posGround = percentage * 2.5;
        let posMFast = percentage * 1.5;
        let posMMid = percentage * 0.8;
        let posMSlow = percentage * 0.3;

        document.documentElement.style.setProperty('--scroll-ground', posGround);
        document.documentElement.style.setProperty('--scroll-m-fast', posMFast);
        document.documentElement.style.setProperty('--scroll-m-mid', posMMid);
        document.documentElement.style.setProperty('--scroll-m-slow', posMSlow);
    }

    drawLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';

        // --- BLITZ LOGIK (Erst in der absoluten Endphase ab 10%) ---
        if (this.currentPercentage < 10 && Math.random() < 0.03) {
            this.lightning.style.opacity = 0.8 + Math.random() * 0.2;
            setTimeout(() => { this.lightning.style.opacity = 0; }, 50);
        }

        // Regen Auffüllen
        if (this.drops.length < this.targetDrops) {
            let dropsToAdd = Math.min(5, this.targetDrops - this.drops.length);
            for (let k = 0; k < dropsToAdd; k++) {
                this.drops.push(this.createDrop(false));
            }
        }

        for (let i = 0; i < this.drops.length; i++) {
            let drop = this.drops[i];
            let nextX = drop.x + drop.speedX;
            let nextY = drop.y + drop.speedY;

            if (nextY >= this.groundY) {
                this.createSplash(nextX, this.groundY);

                if (this.drops.length > this.targetDrops) {
                    this.drops.splice(i, 1);
                    i--;
                    continue;
                } else {
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


// --- 3. HARDWARE INPUT MANAGER (Für 600 PPR Rotary Encoder) ---
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
                await this.port.open({ baudRate: 115200 }); // Muss mit dem Arduino Code übereinstimmen
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
                buffer = lines.pop(); // Behalte unfertige Zeilen im Puffer

                for (let line of lines) {
                    line = line.trim();

                    // NEU: Reagiert auf "SPIN:15" etc.
                    if (line.startsWith("SPIN:")) {
                        // Schneide das "SPIN:" ab und mache eine Zahl daraus
                        let pulses = parseInt(line.split(":")[1]);

                        // Hier kannst du die Empfindlichkeit der Kurbel einstellen!
                        // Wenn es zu schnell geht, mach * 0.5. Wenn zu langsam, * 2.
                        let spinPower = pulses * 0.5;

                        this.engine.addSpin(spinPower);
                    }
                    // Fallback, falls du die Tastatur (W-Taste) benutzt
                    else if (line === "TICK") {
                        this.engine.addSpin(25);
                    }
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