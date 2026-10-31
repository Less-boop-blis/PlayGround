/* ============================================================
   SAPO SALVAJE — audio sintetizado (sin archivos externos)
   ============================================================ */
(function () {
  'use strict';

  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  class SapoAudio {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.muted = false;
      this.musicTimer = null;
      this.step = 0;
      this.nextTime = 0;
      this.started = false;
      this.noiseBuf = null;
      this.stepDur = 60 / 116 / 2;
      this.lead = [
        72, 0, 76, 0, 79, 0, 76, 74,
        72, 0, 67, 0, 69, 0, 72, 0,
        74, 0, 76, 0, 79, 0, 81, 0,
        79, 0, 76, 0, 74, 0, 72, 0
      ];
      this.bass = [45, 0, 0, 0, 45, 0, 0, 0, 41, 0, 0, 0, 41, 0, 0, 0, 48, 0, 0, 0, 48, 0, 0, 0, 43, 0, 0, 0, 43, 0, 0, 0];
    }

    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.55;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.0001;
        this.musicGain.connect(this.master);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.85;
        this.sfxGain.connect(this.master);
        this.makeNoise();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    makeNoise() {
      const len = this.ctx.sampleRate * 1.0;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }

    setMuted(m) {
      this.muted = m;
      if (this.master && this.ctx) {
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.05);
      }
    }

    /* ---------- primitivas ---------- */
    tone(freq, dur, opts = {}) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + (opts.delay || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = opts.type || 'square';
      osc.frequency.setValueAtTime(Math.max(20, freq), t0);
      if (opts.slide) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t0 + dur);
      }
      const vol = opts.vol == null ? 0.12 : opts.vol;
      const attack = opts.attack == null ? 0.006 : opts.attack;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    noise(dur, opts = {}) {
      if (!this.ctx || !this.noiseBuf) return;
      const t0 = this.ctx.currentTime + (opts.delay || 0);
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = opts.filter || 'bandpass';
      filter.frequency.setValueAtTime(opts.freq || 900, t0);
      if (opts.slide) filter.frequency.exponentialRampToValueAtTime(Math.max(60, (opts.freq || 900) * opts.slide), t0 + dur);
      filter.Q.value = opts.q == null ? 0.8 : opts.q;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(opts.vol == null ? 0.14 : opts.vol, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter); filter.connect(gain); gain.connect(this.sfxGain);
      src.start(t0); src.stop(t0 + dur + 0.02);
    }

    /* ---------- efectos ---------- */
    jump() {
      this.tone(340, 0.15, { type: 'square', vol: 0.1, slide: 2.1 });
      this.noise(0.09, { freq: 500, vol: 0.035, filter: 'highpass' });
    }
    doubleJump() {
      this.tone(520, 0.16, { type: 'triangle', vol: 0.12, slide: 1.9 });
      this.tone(780, 0.13, { type: 'sine', vol: 0.07, slide: 1.4, delay: 0.03 });
    }
    coin() {
      this.tone(988, 0.07, { type: 'triangle', vol: 0.11 });
      this.tone(1319, 0.14, { type: 'triangle', vol: 0.09, delay: 0.06 });
    }
    stomp() {
      this.tone(180, 0.13, { type: 'square', vol: 0.16, slide: 0.45 });
      this.noise(0.1, { freq: 320, vol: 0.1, filter: 'lowpass' });
    }
    tongue() {
      this.tone(560, 0.07, { type: 'sawtooth', vol: 0.06, slide: 0.35 });
      this.noise(0.09, { freq: 1600, vol: 0.08, slide: 0.3 });
    }
    block() {
      this.tone(150, 0.1, { type: 'square', vol: 0.13, slide: 0.7 });
      this.noise(0.06, { freq: 240, vol: 0.06, filter: 'lowpass' });
    }
    hurt() {
      this.tone(320, 0.42, { type: 'square', vol: 0.14, slide: 0.23 });
      this.tone(160, 0.5, { type: 'sawtooth', vol: 0.08, slide: 0.4, delay: 0.08 });
    }
    splash() {
      this.noise(0.38, { freq: 1200, vol: 0.16, slide: 0.25, filter: 'bandpass', q: 0.7 });
    }
    checkpoint() {
      [523, 659, 784].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.1, delay: i * 0.08 }));
    }
    life() {
      [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.1, delay: i * 0.07 }));
    }
    win() {
      const seq = [523, 659, 784, 1046, 784, 1046, 1319];
      seq.forEach((f, i) => this.tone(f, i === seq.length - 1 ? 0.55 : 0.19, {
        type: 'triangle', vol: 0.12, delay: i * 0.11
      }));
    }
    gameover() {
      [392, 349, 311, 233].forEach((f, i) => this.tone(f, 0.33, { type: 'triangle', vol: 0.13, delay: i * 0.17 }));
    }
    select() {
      this.tone(620, 0.08, { type: 'square', vol: 0.07 });
      this.tone(880, 0.1, { type: 'square', vol: 0.06, delay: 0.05 });
    }

    /* ---------- música ---------- */
    startMusic() {
      if (!this.ctx || this.started) return;
      this.started = true;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.12;
      this.musicGain.gain.setTargetAtTime(0.16, this.ctx.currentTime, 1.2);
      this.musicTimer = setInterval(() => this.schedule(), 28);
    }

    stopMusic() {
      this.started = false;
      if (this.musicTimer) clearInterval(this.musicTimer);
      this.musicTimer = null;
      if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
    }

    schedule() {
      if (!this.ctx) return;
      const horizon = this.ctx.currentTime + 0.16;
      while (this.nextTime < horizon) {
        this.playStep(this.step, this.nextTime);
        this.step = (this.step + 1) % 32;
        this.nextTime += this.stepDur;
      }
    }

    playStep(step, when) {
      const leadNote = this.lead[step];
      const bassNote = this.bass[step];
      if (leadNote) {
        this.musicNote(midi(leadNote), when, this.stepDur * 1.55, 'triangle', 0.11);
      }
      if (bassNote) {
        this.musicNote(midi(bassNote), when, this.stepDur * 3.4, 'sine', 0.16);
      }
      if (step % 4 === 2) {
        // pequeña percusión de bambú
        this.musicNoise(when, 0.035, 0.02);
      }
    }

    musicNote(freq, when, dur, type, vol) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, when);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(vol, when + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(gain); gain.connect(this.musicGain);
      osc.start(when); osc.stop(when + dur + 0.03);
    }

    musicNoise(when, dur, vol) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 5200;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      src.connect(f); f.connect(g); g.connect(this.musicGain);
      src.start(when); src.stop(when + dur + 0.02);
    }
  }

  window.SapoAudio = new SapoAudio();
})();
