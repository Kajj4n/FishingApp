class FishingApp {
    constructor() {
        this.checkBtn = document.getElementById('checkBtn');
        this.locationInput = document.getElementById('locationInput');
        this.resultDiv = document.getElementById('result');
        this.apiKey = 'e7c0111f206349331bc76ad140a75f4f'; 
        this.checkBtn.addEventListener('click', () => this.handleCheck());
    }

    async handleCheck() {
        const city = this.locationInput.value.trim();
        if (!city) { this.showError("Please enter a location."); return; }
        this.checkBtn.textContent = "Casting line...";
        this.checkBtn.classList.add('loading-pulse');
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${this.apiKey}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Location not found");
            const data = await response.json();
            this.analyzeConditions(data);
        } catch (error) { this.showError("Location not found!"); }
        finally {
            this.checkBtn.textContent = "Check Conditions";
            this.checkBtn.classList.remove('loading-pulse');
        }
    }

    analyzeConditions(data) {
        const wind = data.wind.speed;
        const verdict = (wind > 8) ? "Too windy! Fish deep." : "Great conditions!";
        this.resultDiv.innerHTML = `<strong>${data.name}</strong>: ${data.main.temp}°C<br>${verdict}`;
        this.resultDiv.classList.add('visible');
    }

    showError(msg) {
        this.resultDiv.innerHTML = `<span style="color:red">${msg}</span>`;
        this.resultDiv.classList.add('visible');
    }
}

class WaterNav {
    constructor() {
        this.canvas = document.getElementById('waterCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.buttons = document.querySelectorAll('.nav-item');
        
        // Physics
        this.springs = [];
        this.numSprings = 35;
        this.targetHeight = 35; // Centered in 70px nav to prevent clipping
        this.tension = 0.025;
        this.damping = 0.08;
        this.spread = 0.15;
        
        // Bobber State
        this.bobber = {
            x: -100,
            y: -200,
            targetX: -100,
            isCasting: false,
            activeIdx: -1
        };

        this.tilt = 0;
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        for (let i = 0; i < this.numSprings; i++) {
            this.springs[i] = {
                x: (this.canvas.width / (this.numSprings - 1)) * i,
                y: this.targetHeight,
                height: this.targetHeight,
                vel: 0
            };
        }

        this.buttons.forEach((btn, idx) => {
            btn.addEventListener('click', () => this.castToButton(idx));
        });

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => {
                this.tilt = (e.gamma || 0) * 0.5;
            });
        }
        this.animate();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    castToButton(idx) {
        // Reset text on all buttons first
        this.buttons.forEach(btn => btn.querySelector('span').classList.remove('text-hidden'));

        const rect = this.buttons[idx].getBoundingClientRect();
        const navRect = this.canvas.getBoundingClientRect();
        
        this.bobber.activeIdx = idx;
        this.bobber.targetX = (rect.left - navRect.left) + (rect.width / 2);
        this.bobber.x = this.bobber.targetX;
        this.bobber.y = -300; // Start way above screen
        this.bobber.isCasting = true;
    }

    update() {
        // Water Physics
        for (let i = 0; i < this.numSprings; i++) {
            const s = this.springs[i];
            const tiltOffset = (i / this.numSprings - 0.5) * this.tilt;
            const diff = (this.targetHeight + tiltOffset) - s.height;
            s.vel += this.tension * diff - s.vel * this.damping;
            s.height += s.vel;
        }

        // Spread waves
        for (let j = 0; j < 6; j++) {
            for (let i = 0; i < this.numSprings; i++) {
                if (i > 0) {
                    let diff = this.spread * (this.springs[i].height - this.springs[i-1].height);
                    this.springs[i-1].vel += diff;
                }
                if (i < this.numSprings - 1) {
                    let diff = this.spread * (this.springs[i].height - this.springs[i+1].height);
                    this.springs[i+1].vel += diff;
                }
            }
        }

        // Bobber Movement
        if (this.bobber.isCasting) {
            const waterY = this.getWaterHeightAt(this.bobber.x);
            if (this.bobber.y < waterY) {
                this.bobber.y += 5; // Gravity
            } else {
                this.bobber.isCasting = false;
                this.splash(this.bobber.x, 15);
                this.buttons[this.bobber.activeIdx].querySelector('span').classList.add('text-hidden');
            }
        } else if (this.bobber.activeIdx !== -1) {
            const waterY = this.getWaterHeightAt(this.bobber.x);
            // Floating logic: follow water + slight sine wave bob
            this.bobber.y = waterY + Math.sin(Date.now() / 400) * 3;
        }
    }

    getWaterHeightAt(x) {
        const idx = Math.round((x / this.canvas.width) * (this.numSprings - 1));
        return this.springs[idx] ? this.springs[idx].height : this.targetHeight;
    }

    splash(x, force) {
        const idx = Math.round((x / this.canvas.width) * (this.numSprings - 1));
        if (this.springs[idx]) this.springs[idx].vel = force;
    }

    draw() {
        // Clear frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.bobber.activeIdx !== -1) {
            // Draw Fishing Line
            this.ctx.beginPath();
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            this.ctx.lineWidth = 1;
            this.ctx.moveTo(this.bobber.x, -500); // Top of screen
            this.ctx.lineTo(this.bobber.x, this.bobber.y);
            this.ctx.stroke();

            // Draw Bobber (Drawn before water to be submerged)
            this.ctx.font = "26px serif";
            this.ctx.textAlign = "center";
            this.ctx.fillText("🔴", this.bobber.x, this.bobber.y + 10);
        }

        // Draw Water
        this.ctx.fillStyle = "rgba(0, 119, 190, 0.95)";
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height);
        for (let i = 0; i < this.numSprings; i++) {
            this.ctx.lineTo(this.springs[i].x, this.springs[i].height);
        }
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.fill();
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FishingApp();
    new WaterNav();
});