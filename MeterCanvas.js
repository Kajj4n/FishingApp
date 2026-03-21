// MeterCanvas.js
export class MeterCanvas {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.currentCents = 0;
        this.isRunning = false;
    }

    updateCents(cents, isRunning) {
        this.currentCents = cents;
        this.isRunning = isRunning;
        this.draw();
    }

    draw() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        if (this.canvas.width !== rect.width * dpr) {
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
        }
        
        const width = rect.width;
        const height = rect.height;
        const ctx = this.ctx;
        
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        
        const baselineY = height - 45; 
        const centerX = width / 2;
        const edgeScale = 50; 
        const maxDrawWidth = width / 2 - 40; 

        // Center Line
        ctx.strokeStyle = "#573737"; 
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX, baselineY - 80); 
        ctx.lineTo(centerX, baselineY + 15);
        ctx.stroke();

        // Ticks
        const ticks = [10, 20, 30, 40, 50];
        ticks.forEach(tick => {
            const offset = (tick / edgeScale) * maxDrawWidth;
            ctx.beginPath();
            ctx.moveTo(centerX + offset, baselineY - 5);
            ctx.lineTo(centerX + offset, baselineY + 10);
            ctx.moveTo(centerX - offset, baselineY - 5);
            ctx.lineTo(centerX - offset, baselineY + 10);
            ctx.stroke();
        });

        // Needle
        if (this.isRunning) {
            const needleX = centerX + (this.currentCents / edgeScale) * maxDrawWidth;
            ctx.strokeStyle = Math.abs(this.currentCents) < 5 ? "#47cf73" : "#000000"; 
            ctx.lineWidth = 3; 
            ctx.beginPath();
            ctx.moveTo(needleX, baselineY - 90); 
            ctx.lineTo(needleX, baselineY + 15);
            ctx.stroke();
        }
    }
}