class GuitarTuner {
    constructor() {
        this.audioCtx = null;
        this.analyser = null;
        this.dataArray = null;
        this.isRunning = false;
        this.selectedMode = 'Auto'; // New state tracker

        this.standardTuning = [
            { note: 'E2', freq: 82.41 },
            { note: 'A2', freq: 110.00 },
            { note: 'D3', freq: 146.83 },
            { note: 'G3', freq: 196.00 },
            { note: 'B3', freq: 246.94 },
            { note: 'E4', freq: 329.63 }
        ];

        this.ui = {
            note: document.getElementById('noteDisplay'),
            freq: document.getElementById('frequencyDisplay'),
            status: document.getElementById('statusIndicator'),
            canvas: document.getElementById('meterCanvas'),
            startBtn: document.getElementById('startBtn'),
            stringBtns: document.querySelectorAll('.string-btn') // Grab the new buttons
        };

        this.ctx = this.ui.canvas.getContext('2d');
        this.currentCents = 0;

        this.ui.startBtn.addEventListener('click', () => this.toggleTuner());
        
        // Setup listeners for string selection
        this.ui.stringBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.selectString(e.target));
        });
    }

    selectString(btnTarget) {
        // Update UI styling
        this.ui.stringBtns.forEach(btn => btn.classList.remove('active'));
        btnTarget.classList.add('active');

        // Update internal state
        this.selectedMode = btnTarget.dataset.note;
        
        // Reset display if the tuner isn't actively running
        if (!this.isRunning) {
            this.ui.note.textContent = this.selectedMode === 'Auto' ? '-' : this.selectedMode.replace(/[0-9]/g, '');
        }
    }

    async toggleTuner() {
        if (this.isRunning) {
            this.audioCtx.close();
            this.isRunning = false;
            this.ui.startBtn.textContent = "Start Tuner";
            this.ui.status.textContent = "Ready";
            return;
        }

        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = this.audioCtx.createMediaStreamSource(stream);
            
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 2048;
            source.connect(this.analyser);

            this.dataArray = new Float32Array(this.analyser.fftSize);
            this.isRunning = true;
            this.ui.startBtn.textContent = "Stop Tuner";
            this.update();
        } catch (err) {
            alert("Microphone access denied or not available.");
        }
    }

    update() {
        if (!this.isRunning) return;

        this.analyser.getFloatTimeDomainData(this.dataArray);
        const pitch = this.autoCorrelate(this.dataArray, this.audioCtx.sampleRate);

        if (pitch !== -1) {
            let targetNoteObj;

            // Decide whether to auto-detect or force the selected string
            if (this.selectedMode === 'Auto') {
                targetNoteObj = this.getClosestNote(pitch);
            } else {
                targetNoteObj = this.standardTuning.find(n => n.note === this.selectedMode);
            }

            const cents = this.getCents(pitch, targetNoteObj.freq);
            
            // Only update display if the detected pitch is somewhat close (within an octave) 
            // to the target string to prevent wild jumps on background noise
            if (this.selectedMode === 'Auto' || Math.abs(cents) < 1200) {
                this.ui.note.textContent = targetNoteObj.note.replace(/[0-9]/g, '');
                this.ui.freq.textContent = `${pitch.toFixed(2)} Hz`;
                
                // Clamp cents for the visual meter between -50 and 50
                this.currentCents = Math.max(-50, Math.min(50, cents));

                if (Math.abs(cents) < 5) {
                    this.ui.status.textContent = "In Tune";
                    this.ui.status.style.color = "#47cf73";
                } else {
                    this.ui.status.textContent = cents > 0 ? "Sharp" : "Flat";
                    this.ui.status.style.color = "#ff4a4a";
                }
            }
        }

        this.drawMeter();
        requestAnimationFrame(() => this.update());
    }

    autoCorrelate(buffer, sampleRate) {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        if (Math.sqrt(sum / buffer.length) < 0.01) return -1;

        let r1 = 0, r2 = buffer.length - 1, thres = 0.2;
        for (let i = 0; i < buffer.length / 2; i++) {
            if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
        }
        for (let i = 1; i < buffer.length / 2; i++) {
            if (Math.abs(buffer[buffer.length - i]) < thres) { r2 = buffer.length - i; break; }
        }

        buffer = buffer.slice(r1, r2);
        const c = new Array(buffer.length).fill(0);
        for (let i = 0; i < buffer.length; i++) {
            for (let j = 0; j < buffer.length - i; j++) {
                c[i] = c[i] + buffer[j] * buffer[j + i];
            }
        }

        let d = 0; while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < buffer.length; i++) {
            if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
        }

        return sampleRate / maxpos;
    }

    getClosestNote(freq) {
        return this.standardTuning.reduce((prev, curr) => {
            return (Math.abs(curr.freq - freq) < Math.abs(prev.freq - freq) ? curr : prev);
        });
    }

    getCents(detected, target) {
        return Math.floor(1200 * Math.log2(detected / target));
    }

    drawMeter() {
        const width = this.ui.canvas.width = this.ui.canvas.offsetWidth;
        const height = this.ui.canvas.height = this.ui.canvas.offsetHeight;
        const centerX = width / 2;

        this.ctx.clearRect(0, 0, width, height);

        // Draw static scale
        this.ctx.strokeStyle = "#444";
        this.ctx.lineWidth = 2;
        for (let i = -50; i <= 50; i += 10) {
            const x = centerX + (i * (width / 120));
            this.ctx.beginPath();
            this.ctx.moveTo(x, height - 20);
            this.ctx.lineTo(x, height - (i === 0 ? 50 : 35));
            this.ctx.stroke();
        }

        // Draw Needle
        const needleX = centerX + (this.currentCents * (width / 120));
        const color = Math.abs(this.currentCents) < 5 ? "#47cf73" : "#ff4a4a";
        
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = color;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(needleX, height - 10);
        this.ctx.lineTo(needleX, 20);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GuitarTuner();
});