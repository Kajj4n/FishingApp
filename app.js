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

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    new FishingApp();
});