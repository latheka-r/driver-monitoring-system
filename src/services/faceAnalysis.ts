// Temporal state machines for blink and yawn detection. These deliberately
// avoid "one low-EAR frame = blink" logic, and avoid "one open mouth frame =
// yawn" logic, per the false-alarm-prevention requirements.

const BLINK_MIN_DURATION_MS = 80;   // ignore noise faster than this
const BLINK_MAX_DURATION_MS = 500;  // longer than this is treated as eye closure, not a blink

const YAWN_MAR_THRESHOLD = 0.5;
const YAWN_MIN_DURATION_MS = 500; // mouth must stay open this long to count

export class BlinkDetector {
  private eyeClosed = false;
  private closeStartTime = 0;
  private blinkCount = 0;

  update(ear: number, threshold: number, now: number): { blinked: boolean } {
    const isClosed = ear < threshold;

    if (isClosed && !this.eyeClosed) {
      this.eyeClosed = true;
      this.closeStartTime = now;
      return { blinked: false };
    }

    if (!isClosed && this.eyeClosed) {
      this.eyeClosed = false;
      const duration = now - this.closeStartTime;
      if (duration >= BLINK_MIN_DURATION_MS && duration <= BLINK_MAX_DURATION_MS) {
        this.blinkCount += 1;
        return { blinked: true };
      }
    }

    return { blinked: false };
  }

  getCurrentClosureDurationMs(now: number): number {
    if (!this.eyeClosed) return 0;
    return now - this.closeStartTime;
  }

  isEyeClosed(): boolean {
    return this.eyeClosed;
  }

  get count() {
    return this.blinkCount;
  }

  reset() {
    this.eyeClosed = false;
    this.closeStartTime = 0;
    this.blinkCount = 0;
  }
}

export class YawnDetector {
  private mouthOpen = false;
  private openStartTime = 0;
  private alreadyCountedThisOpen = false;
  private yawnCount = 0;

  update(mar: number, now: number): { yawned: boolean } {
    const isOpen = mar > YAWN_MAR_THRESHOLD;

    if (isOpen && !this.mouthOpen) {
      this.mouthOpen = true;
      this.openStartTime = now;
      this.alreadyCountedThisOpen = false;
      return { yawned: false };
    }

    if (isOpen && this.mouthOpen && !this.alreadyCountedThisOpen) {
      const duration = now - this.openStartTime;
      if (duration >= YAWN_MIN_DURATION_MS) {
        // Confirmed sustained opening — count once for this continuous
        // mouth-open event; won't count again until the mouth closes and
        // reopens.
        this.alreadyCountedThisOpen = true;
        this.yawnCount += 1;
        return { yawned: true };
      }
    }

    if (!isOpen) {
      this.mouthOpen = false;
      this.alreadyCountedThisOpen = false;
    }

    return { yawned: false };
  }

  get count() {
    return this.yawnCount;
  }

  reset() {
    this.mouthOpen = false;
    this.openStartTime = 0;
    this.yawnCount = 0;
  }
}
