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
        if (!city) {
            this.showError("Please enter a location.");
            return;
        }

        this.checkBtn.textContent = "Casting line...";
        this.checkBtn.classList.add('loading-pulse');
        this.resultDiv.classList.remove('visible');

        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) throw new Error("Location not found");
            
            const data = await response.json();
            this.analyzeConditions(data);
        } catch (error) {
            this.showError("Could not find that location. Try again!");
        } finally {
            this.checkBtn.textContent = "Check Conditions";
            this.checkBtn.classList.remove('loading-pulse');
        }
    }

    analyzeConditions(data) {
        const windSpeed = data.wind.speed;
        const temp = data.main.temp;
        let verdict = (windSpeed > 8) ? "Too windy! The fish are deep." : "Great conditions for a catch!";
        
        this.updateUI(`<strong>${data.name}</strong>: ${temp}°C, ${windSpeed} m/s wind.<br>${verdict}`);
    }

    updateUI(message) {
        this.resultDiv.innerHTML = message;
        setTimeout(() => this.resultDiv.classList.add('visible'), 50);
    }

    showError(message) {
        this.resultDiv.innerHTML = `<span style="color: #ff4444;">${message}</span>`;
        this.resultDiv.classList.add('visible');
    }
}

class LiquidNav {
    constructor() {
        this.nav = document.getElementById('liquidNav');
        this.water = document.getElementById('water-surface');
        this.bobber = document.getElementById('bobber');
        this.splash = document.getElementById('splash');
        this.buttons = document.querySelectorAll('.nav-item');
        
        this.initEvents();
    }

    initEvents() {
        // 1. Handle Bobber Clicks
        this.buttons.forEach(btn => {
            btn.addEventListener('click', (e) => this.castBobber(e));
        });

        // 2. Handle Water Physics (Gyroscope)
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => this.handleTilt(e));
        }
    }

    handleTilt(event) {
        // gamma is the left-to-right tilt in degrees, where right is positive
        let tilt = event.gamma; 
        
        // Cap the tilt so the water doesn't completely turn sideways
        if (tilt > 30) tilt = 30;
        if (tilt < -30) tilt = -30;

        // Apply a rotation to the water container based on device tilt
        // We add this to the existing idleWave animation via a container trick, 
        // or manipulate the element directly. 
        this.water.style.transform = `rotate(${tilt}deg)`;
    }

    castBobber(event) {
        const btn = event.currentTarget;
        
        // Calculate the center of the clicked button
        const btnRect = btn.getBoundingClientRect();
        const navRect = this.nav.getBoundingClientRect();
        const centerX = btnRect.left - navRect.left + (btnRect.width / 2) - 10; // -10 to center the 20px emoji

        // Reset animations
        this.bobber.style.animation = 'none';
        this.splash.style.animation = 'none';
        this.bobber.offsetHeight; // Trigger reflow to restart animation

        // Move elements to the clicked X coordinate
        this.bobber.style.left = `${centerX}px`;
        this.splash.style.left = `${centerX + 5}px`; // center splash

        // Show elements
        this.bobber.classList.remove('hidden');
        this.splash.classList.remove('hidden');

        // Trigger animations
        this.bobber.style.animation = 'dropBobber 0.6s ease-out forwards';
        
        // Delay the splash slightly so it happens when the bobber hits the water
        setTimeout(() => {
            this.splash.style.animation = 'splashEffect 0.5s ease-out forwards';
        }, 400); 
    }
}

// Update your initialization:
document.addEventListener('DOMContentLoaded', () => {
    new FishingApp();
    new LiquidNav(); // Start the nav bar logic
});