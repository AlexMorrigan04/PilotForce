export class SessionManager {
  private timeoutId: number | null = null;
  private readonly defaultTimeout = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  private readonly logoutCallback: () => void;
  
  constructor(logoutCallback: () => void, timeoutMinutes?: number) {
    this.logoutCallback = logoutCallback;
    this.defaultTimeout = (timeoutMinutes || 60) * 60 * 1000;
    this.resetTimeout = this.resetTimeout.bind(this);
    this.setupActivityListeners();
  }
  
  public startSession(): void {
    this.resetTimeout();
  }
  
  public endSession(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.removeActivityListeners();
  }
  
  private resetTimeout(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
    }
    this.timeoutId = window.setTimeout(() => {
      this.logoutCallback();
    }, this.defaultTimeout);
  }
  
  private setupActivityListeners(): void {
    this.events.forEach(event => {
      window.addEventListener(event, this.resetTimeout);
    });
  }
  
  private removeActivityListeners(): void {
    this.events.forEach(event => {
      window.removeEventListener(event, this.resetTimeout);
    });
  }
}
