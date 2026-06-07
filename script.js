// --- 1. GAME ENGINE (Die reine Mathematik) ---
class GameEngine {
    constructor(uiController) {
        this.ui = uiController;
        this.clicks = 0;          // x-Wert (gesammelte Energie)
        this.difficulty = 1500;   // Konstante C (Je höher, desto schwerer)
        this.lastTenStep = 0;
        this.decayRate = 3;       // Wie schnell sinkt der Balken im Leerlauf?
        this.lastInputTime = Date.now();

        // Game Loop (läuft 30x pro Sekunde)
        setInterval(() => this.updateLoop(), 1000 / 30);
    }

    addSpin(amount = 20) {
        this.clicks += amount;
        this.lastInputTime = Date.now(); // Timer zurücksetzen
        this.calculateAndNotify();
    }

    updateLoop() {
        // Verfall startet erst, wenn 2 Sekunden lang nicht gedreht wurde
        const isIdle = (Date.now() - this.lastInputTime) > 2000;

        if (isIdle && this.clicks > 0) {
            this.clicks -= this.decayRate;
            if (this.clicks < 0) this.clicks = 0;
            this.calculateAndNotify();
        }
    }

    calculateAndNotify() {
        // Asymptotische Formel: P(x) = 100 * (x / (x + C))
        let percentage = 100 * (this.clicks / (this.clicks + this.difficulty));

        this.ui.updateBar(percentage);

        // Prüfen auf 10er Meilensteine
        let currentTenStep = Math.floor(percentage / 10);

        // Wenn man hochdreht und eine neue 10er Grenze überschreitet
        if (currentTenStep > this.lastTenStep && currentTenStep > 0 && currentTenStep < 10) {
            this.ui.triggerMilestone(currentTenStep * 10);
            this.lastTenStep = currentTenStep;
        }
        // Wenn der Balken durch Verfall sinkt, Grenze still und heimlich zurücksetzen
        else if (currentTenStep < this.lastTenStep) {
            this.lastTenStep = currentTenStep;
        }
    }
}

// --- 2. UI CONTROLLER (Das visuelle Feedback) ---
class UIController {
    constructor() {
        this.fillBar = document.getElementById('fill-bar');
        this.percentageText = document.getElementById('percentage-text');
        this.milestoneMessage = document.getElementById('milestone-message');
        this.messageTimeout = null;
    }

    updateBar(percentage) {
        this.fillBar.style.height = `${percentage}%`;
        // Zeigt immer eine Nachkommastelle, z.B. "42.5 %"
        this.percentageText.innerHTML = `${percentage.toFixed(1)} <span class="percent-sign">%</span>`;
    }

    triggerMilestone(milestone) {
        // 1. Goldenen Glow aktivieren
        this.fillBar.classList.add('glow-gold');

        // 2. Motivierenden Text anzeigen
        this.milestoneMessage.innerText = "AATM MANTHAN";
        this.milestoneMessage.classList.add('show');

        // Alte Timer löschen, falls man sehr schnell dreht
        if (this.messageTimeout) clearTimeout(this.messageTimeout);

        // 3. Nach 1.5 Sekunden alles wieder auf das normale Blau zurücksetzen
        this.messageTimeout = setTimeout(() => {
            this.fillBar.classList.remove('glow-gold');
            this.milestoneMessage.classList.remove('show');
        }, 1500);
    }
}


// --- 3. INPUT MANAGER (Die Schnittstelle zur Hardware/Tastatur) ---
class InputManager {
    constructor(engine) {
        this.engine = engine;

        window.addEventListener('keydown', (e) => {
            // DEBUGGING: Zeigt dir in der Konsole an, welche Taste der Browser sieht
            console.log("Taste gedrückt:", e.key);

            // Pfeil nach oben ODER Leertaste (" ") ODER "w"
            if (e.key === "ArrowUp" || e.key === " " || e.key === "w" || e.key === "W") {
                // e.preventDefault() verhindert, dass die Seite nach unten scrollt, 
                // falls du die Leertaste oder Pfeiltasten drückst
                e.preventDefault();

                this.engine.addSpin();
            }
        });
    }
}

// --- INITIALISIERUNG ---
// Startet die Architektur, sobald die Seite geladen ist
document.addEventListener("DOMContentLoaded", () => {
    const ui = new UIController();
    const engine = new GameEngine(ui);

    // Später erstellen wir hier einen ArduinoInputManager stattdessen
    const input = new InputManager(engine);
});