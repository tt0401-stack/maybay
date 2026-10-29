/* ============================================
   NEBULA STRIKE — Audio Engine
   Web Audio API Sound System
   ============================================ */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.initialized = false;
        this.muted = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.6;
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.15;
            this.musicGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }

    playTone(frequency, duration, type = 'square', volume = 0.3, detune = 0) {
        if (!this.initialized || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        osc.detune.value = detune;
        gain.gain.value = volume;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playNoise(duration, volume = 0.1) {
        if (!this.initialized || this.muted) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = volume;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        source.start();
    }

    // Sound Effects
    shoot() {
        this.playTone(880, 0.08, 'square', 0.15);
        this.playTone(660, 0.06, 'sawtooth', 0.08, 10);
    }

    shootMulti() {
        this.playTone(1000, 0.1, 'square', 0.12);
        this.playTone(800, 0.08, 'sawtooth', 0.08);
        this.playTone(1200, 0.06, 'triangle', 0.06);
    }

    shootLaser() {
        this.playTone(200, 0.15, 'sawtooth', 0.2);
        this.playTone(150, 0.2, 'square', 0.1);
    }

    enemyHit() {
        this.playTone(300, 0.1, 'square', 0.15);
        this.playNoise(0.05, 0.08);
    }

    enemyDestroy() {
        this.playTone(200, 0.2, 'sawtooth', 0.2);
        this.playTone(100, 0.3, 'square', 0.15);
        this.playNoise(0.15, 0.15);
    }

    bossHit() {
        this.playTone(150, 0.15, 'square', 0.2);
        this.playNoise(0.08, 0.12);
    }

    bossDestroy() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.playTone(80 + i * 40, 0.4, 'sawtooth', 0.2);
                this.playNoise(0.3, 0.2);
            }, i * 100);
        }
    }

    playerHit() {
        this.playTone(100, 0.3, 'sawtooth', 0.3);
        this.playNoise(0.2, 0.2);
    }

    playerDeath() {
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.playTone(400 - i * 40, 0.3, 'sawtooth', 0.2);
                this.playNoise(0.2, 0.15);
            }, i * 80);
        }
    }

    powerUp() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((note, i) => {
            setTimeout(() => {
                this.playTone(note, 0.15, 'triangle', 0.2);
            }, i * 60);
        });
    }

    combo() {
        this.playTone(1200, 0.1, 'triangle', 0.15);
        this.playTone(1500, 0.1, 'triangle', 0.12);
    }

    waveStart() {
        this.playTone(440, 0.2, 'triangle', 0.15);
        setTimeout(() => this.playTone(660, 0.2, 'triangle', 0.15), 150);
        setTimeout(() => this.playTone(880, 0.3, 'triangle', 0.2), 300);
    }

    bossWarning() {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playTone(200, 0.3, 'square', 0.2);
                this.playTone(100, 0.4, 'sawtooth', 0.15);
            }, i * 400);
        }
    }

    shieldHit() {
        this.playTone(800, 0.15, 'triangle', 0.2);
        this.playTone(1200, 0.1, 'sine', 0.1);
    }

    menuSelect() {
        this.playTone(600, 0.1, 'triangle', 0.15);
        this.playTone(900, 0.08, 'triangle', 0.1);
    }

    menuHover() {
        this.playTone(500, 0.05, 'triangle', 0.08);
    }

    toggle() {
        this.muted = !this.muted;
        return !this.muted;
    }
}

// Global audio instance
const audio = new AudioEngine();
