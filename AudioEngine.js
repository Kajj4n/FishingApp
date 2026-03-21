// AudioEngine.js
export class AudioEngine {
    constructor() {
        this.audioCtx = null;
        this.analyser = null;
        this.dataArray = null;
        this.isRunning = false;
        
        // For MP3 Playback
        this.currentAudio = null;
        this.fadeInterval = null;
        this.fadeTimeout = null;
    }

    async init() {
        if (this.isRunning) return;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = this.audioCtx.createMediaStreamSource(stream);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 2048;
            source.connect(this.analyser);
            this.dataArray = new Float32Array(this.analyser.fftSize);
            this.isRunning = true;
        } catch (err) {
            console.error("Microphone access denied.", err);
        }
    }

    getPitch() {
        if (!this.isRunning) return -1;
        this.analyser.getFloatTimeDomainData(this.dataArray);
        return this.autoCorrelate(this.dataArray, this.audioCtx.sampleRate);
    }

    // Logic to find the closest note from your current tuning
    getClosestNote(freq, activeTuning) {
        return activeTuning.reduce((prev, curr) => {
            return (Math.abs(curr.freq - freq) < Math.abs(prev.freq - freq) ? curr : prev);
        });
    }

    getCents(detected, target) {
        return Math.floor(1200 * Math.log2(detected / target));
    }

    // --- Audio Playback Logic ---
    playStringAudio(note) {
        this.stopAllAudio();
        this.currentAudio = new Audio(`./audio/${note}-standard.mp3`);
        this.currentAudio.volume = 1.0;
        this.currentAudio.play().catch(() => console.warn("Audio file missing for", note));

        this.fadeTimeout = setTimeout(() => {
            this.fadeInterval = setInterval(() => {
                if (this.currentAudio && this.currentAudio.volume > 0.05) {
                    this.currentAudio.volume -= 0.05;
                } else {
                    this.stopAllAudio();
                }
            }, 50);
        }, 2000);
    }

    stopAllAudio() {
        clearTimeout(this.fadeTimeout);
        clearInterval(this.fadeInterval);
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
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
}