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


            let drain = (this.clicks * 0.02) + 5;
            this.clicks -= drain;

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
        this.updateScene(0);
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
        // 2. DAS ÄUSSERE WETTER (In 3 klaren Phasen)
        // ==============================================================
        let progress = percentage / 100; // Geht von 0.0 bis 1.0

        // 🌧️ PHASE 1: DER REGEN (0% bis 40% der Kurbel)
        // Das Wasser hört jetzt viel früher auf. Schon bei 40% Kurbeln ist der Regen auf 0.
        let rainIntensity = 1.0 - (progress / 0.4);
        if (rainIntensity < 0) rainIntensity = 0;

        // targetDrops steuert wahrscheinlich deine Regentropfen-Menge
        this.targetDrops = Math.floor(600 * rainIntensity);


        // ☁️ PHASE 2: DIE WOLKEN (30% bis 70% der Kurbel)
        // Sobald der Regen fast vorbei ist (30%), fangen die Wolken an sich zu verziehen.
        // Bei 70% sind sie komplett vom Bildschirm verschwunden.
        let cloudProgress = (progress - 0.3) / 0.4; // Dauer der Phase: 0.4 (70% - 30%)
        if (cloudProgress < 0) cloudProgress = 0;
        if (cloudProgress > 1) cloudProgress = 1;

        document.documentElement.style.setProperty('--cloud-parting', cloudProgress);
        document.documentElement.style.setProperty('--cloud-opacity', 1.0 - cloudProgress);


        // ☀️ PHASE 3: DIE SONNE (60% bis 100% der Kurbel)
        // Die Sonne wartet, bis die Wolken fast weg sind. Erst ab 60% fängt sie an zu strahlen.
        let sunProgress = (progress - 0.6) / 0.4; // Dauer der Phase: 0.4 (100% - 60%)
        if (sunProgress < 0) sunProgress = 0;
        if (sunProgress > 1) sunProgress = 1;

        document.documentElement.style.setProperty('--sun-opacity', sunProgress);
        document.documentElement.style.setProperty('--ray-opacity', sunProgress);
        document.documentElement.style.setProperty('--sun-scale', 0.5 + (sunProgress * 0.5));


        // 🌄 DAS ALLGEMEINE LICHT (0% bis 100%)
        // Die Landschaft selbst wird über die gesamte Zeit sanft heller.
        document.documentElement.style.setProperty('--day-opacity', progress);

        // 🌄 PHASE 4: DER HIMMEL (Startet ab 50%)
        // Rechnet den Bereich von 50% - 100% in einen Wert von 0.0 bis 1.0 um
        // 🌄 PHASE 4: DER HIMMEL (Startet ab 50%)
        let skyProgress = (progress - 0.5) / 0.5;
        if (skyProgress < 0) skyProgress = 0;
        if (skyProgress > 1) skyProgress = 1;

        // DER FIX: Wir rechnen * 100 und hängen das '%' direkt hier im JS an!
        document.documentElement.style.setProperty('--sky-progress', `${skyProgress * 100}%`);

        // ==============================================================
        // 3. DIE WELT-BEWEGUNG & DER WALKCYCLE (Nur noch vorwärts!)
        // ==============================================================

        // 1. Setup für den "Kilometerzähler" (Wird nur beim ersten Start aufgerufen)
        if (typeof this.totalDistance === 'undefined') {
            this.totalDistance = 0;
            this.lastPercentage = percentage;
        }

        // 2. Wie stark wurde gekurbelt seit dem letzten Frame?
        let delta = percentage - this.lastPercentage;
        this.lastPercentage = percentage;

        // 3. DIE STRENGE VORWÄRTS-LOGIK (Mit Anti-Hardware-Lag)

        // Der Filter ist jetzt viel feiner (0.005 statt 0.05), 
        // damit die winzigen Poti-Schritte am Ende nicht mehr verschluckt werden!
        if (delta > 0.005) {

            // 🚀 DER TURBOLADER FÜR DAS ENDE
            let hardwareBoost = 1.0;

            // Wenn wir im letzten Fünftel der Kurbel sind (ab 80%)...
            if (percentage > 80) {
                // ... verdoppeln wir künstlich die ausgelesene Strecke, 
                // um die schwache Hardware auszugleichen! (Teste hier Werte wie 1.5, 2.0 oder 3.0)
                hardwareBoost = 2.0;
            }

            this.totalDistance += (delta * hardwareBoost);
        }

        // ⚙️ DEIN HAUPT-REGLER FÜR DIE GESCHWINDIGKEIT:
        let masterSpeed = 0.3;

        // --- A. DER WEG FÜR DIE LANDSCHAFT ---
        // WICHTIG: Das "% 200" ist die Magie! 
        // Es setzt den Wert nahtlos auf 0 zurück, sobald er die 200vw-Marke erreicht.
        // Da Bild 1 und Bild 2 (gespiegelt) exakt 200vw breit sind, ist der Sprung 100% unsichtbar!

        let posGround = (this.totalDistance * (2.5 * masterSpeed)) % 200;
        let posMFast = (this.totalDistance * (1.5 * masterSpeed)) % 200;
        let posMMid = (this.totalDistance * (0.8 * masterSpeed)) % 200;
        let posMSlow = (this.totalDistance * (0.3 * masterSpeed)) % 200;

        document.documentElement.style.setProperty('--scroll-ground', posGround);
        document.documentElement.style.setProperty('--scroll-m-fast', posMFast);
        document.documentElement.style.setProperty('--scroll-m-mid', posMMid);
        document.documentElement.style.setProperty('--scroll-m-slow', posMSlow);

        // --- B. DER WALKCYCLE ---
        let totalFrames = 25;
        let columns = 5;
        let walkSpeed = 2.5 * masterSpeed;

        // Frame aus dem Kilometerzähler ableiten
        let rawFrame = Math.floor(this.totalDistance * walkSpeed);
        let currentFrame = rawFrame % totalFrames;

        if (currentFrame < 0) currentFrame = totalFrames + currentFrame;

        let col = currentFrame % columns;
        let row = Math.floor(currentFrame / columns);

        let percentX = col * 25;
        let percentY = row * 25;

        document.documentElement.style.setProperty('--walk-x', `${percentX}%`);
        document.documentElement.style.setProperty('--walk-y', `${percentY}%`);
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