// Audio chiptune generado con WebAudio. Sin archivos externos.
const MELODY = [
  72, 76, 79, 76, 72, 76, 79, 84,
  83, 79, 76, 79, 72, 0, 74, 76,
  77, 81, 84, 81, 77, 76, 74, 72,
  74, 76, 77, 79, 76, 0, 72, 0,
]
const BASS = [48, 48, 43, 43, 41, 41, 43, 43]
const STEP = 0.16

const midiToFreq = (n) => 440 * Math.pow(2, (n - 69) / 12)

export class AudioEngine {
  constructor() {
    this.ctx = null
    this.enabled = true
    try {
      this.enabled = localStorage.getItem('sapobros.sound') !== 'off'
    } catch {
      this.enabled = true
    }
    this.musicWanted = false
    this.master = null
    this.musicGain = null
    this.sfxGain = null
    this.step = 0
    this.nextTime = 0
    this.noiseBuffer = null
    this.playing = false
  }

  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return false
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.enabled ? 0.6 : 0
      this.master.connect(this.ctx.destination)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.5
      this.musicGain.connect(this.master)
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 0.9
      this.sfxGain.connect(this.master)
      const len = this.ctx.sampleRate * 0.4
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      this.noiseBuffer = buffer
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return true
  }

  unlock() {
    this.ensure()
    if (this.musicWanted && this.ctx) this.playing = true
  }

  setEnabled(on) {
    this.enabled = on
    try {
      localStorage.setItem('sapobros.sound', on ? 'on' : 'off')
    } catch {
      // Sin persistencia disponible.
    }
    if (this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime)
      this.master.gain.linearRampToValueAtTime(on ? 0.6 : 0, this.ctx.currentTime + 0.08)
    }
    if (on) this.unlock()
  }

  toggle() {
    this.setEnabled(!this.enabled)
    return this.enabled
  }

  tone(freq, when, dur, type = 'square', vol = 0.08, slideTo = null, dest = null) {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, when)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), when + dur)
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(vol, when + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    osc.connect(gain)
    gain.connect(dest || this.sfxGain)
    osc.start(when)
    osc.stop(when + dur + 0.02)
  }

  noise(when, dur, vol = 0.12, freq = 900) {
    if (!this.ctx || !this.noiseBuffer) return
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(vol, when)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxGain)
    src.start(when)
    src.stop(when + dur)
  }

  jump() {
    if (!this.ensure()) return
    const t = this.ctx.currentTime
    this.tone(330, t, 0.14, 'square', 0.07, 620)
  }

  coin() {
    if (!this.ensure()) return
    const t = this.ctx.currentTime
    this.tone(988, t, 0.07, 'square', 0.06)
    this.tone(1319, t + 0.07, 0.16, 'square', 0.06)
  }

  stomp() {
    if (!this.ensure()) return
    const t = this.ctx.currentTime
    this.tone(180, t, 0.12, 'triangle', 0.12, 60)
    this.noise(t, 0.08, 0.1, 700)
  }

  bump() {
    if (!this.ensure()) return
    const t = this.ctx.currentTime
    this.tone(140, t, 0.07, 'square', 0.08, 90)
  }

  brick() {
    if (!this.ensure()) return
    const t = this.ctx.currentTime
    this.noise(t, 0.14, 0.16, 500)
    this.tone(220, t, 0.1, 'square', 0.06, 80)
  }

  power() {
    if (!this.ensure()) return
    const t = this.ctx.currentTime
    ;[523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.07, 0.12, 'square', 0.07))
  }

  checkpoint() {
    if (!this.ensure()) return
    const t = this.ctx.currentTime
    this.tone(784, t, 0.1, 'triangle', 0.08)
    this.tone(1047, t + 0.1, 0.22, 'triangle', 0.08)
  }

  shieldPop() {
    if (!this.ensure()) return
    const t = this.ctx.currentTime
    this.noise(t, 0.18, 0.14, 1400)
    this.tone(600, t, 0.16, 'sine', 0.08, 200)
  }

  hurt() {
    if (!this.ensure()) return
    const t = this.ctx.currentTime
    this.tone(320, t, 0.3, 'sawtooth', 0.09, 80)
  }

  death() {
    if (!this.ensure()) return
    const t = this.ctx.currentTime
    ;[392, 330, 262, 196].forEach((f, i) => this.tone(f, t + i * 0.13, 0.18, 'square', 0.08))
  }

  win() {
    if (!this.ensure()) return
    const t = this.ctx.currentTime
    const notes = [523, 659, 784, 1047, 784, 1047, 1319]
    notes.forEach((f, i) => this.tone(f, t + i * 0.12, i === notes.length - 1 ? 0.6 : 0.14, 'square', 0.08))
    this.tone(262, t, 0.8, 'triangle', 0.06)
  }

  startMusic() {
    this.musicWanted = true
    if (!this.ensure()) return
    this.playing = true
    this.step = 0
    this.nextTime = this.ctx.currentTime + 0.1
  }

  stopMusic() {
    this.musicWanted = false
    this.playing = false
  }

  tick() {
    if (!this.ctx || !this.playing || !this.enabled) return
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      const i = this.step % 32
      const note = MELODY[i]
      if (note) {
        this.tone(midiToFreq(note), this.nextTime, STEP * 0.82, 'square', 0.035, null, this.musicGain)
      }
      if (i % 4 === 0) {
        const b = BASS[(i / 4) % BASS.length]
        this.tone(midiToFreq(b), this.nextTime, STEP * 1.6, 'triangle', 0.05, null, this.musicGain)
      }
      if (i % 2 === 0) this.noise(this.nextTime, 0.03, 0.012, 6000)
      this.nextTime += STEP
      this.step++
    }
  }
}
