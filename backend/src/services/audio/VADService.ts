export interface VADResult {
  isSpeech: boolean
  isSilence: boolean
  energy: number
}

export class VADService {
  private threshold = 0.01
  private silenceDuration = 0
  private maxSilenceDuration = 1500 // ms
  private speechDuration = 0
  private minSpeechDuration = 300 // ms

  detect(audioData: Float32Array): VADResult {
    // 计算音频能量
    const energy = audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length
    const isSpeech = energy > this.threshold

    if (isSpeech) {
      this.silenceDuration = 0
      this.speechDuration += 20 // 假设每 20ms 一帧
    } else {
      this.silenceDuration += 20 // 假设每 20ms 一帧

      // 只有在检测到足够的语音后才计算静默
      if (this.speechDuration > this.minSpeechDuration) {
        // 重置语音时长，准备下一轮
        if (this.silenceDuration > this.maxSilenceDuration) {
          this.speechDuration = 0
        }
      }
    }

    const hasValidSpeech = this.speechDuration > this.minSpeechDuration
    const isSilence = hasValidSpeech && this.silenceDuration > this.maxSilenceDuration

    return {
      isSpeech,
      isSilence,
      energy
    }
  }

  reset(): void {
    this.silenceDuration = 0
    this.speechDuration = 0
  }

  setThreshold(threshold: number): void {
    this.threshold = threshold
  }

  getThreshold(): number {
    return this.threshold
  }

  setMaxSilenceDuration(duration: number): void {
    this.maxSilenceDuration = duration
  }

  setMinSpeechDuration(duration: number): void {
    this.minSpeechDuration = duration
  }
}
