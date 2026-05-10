export class FabricHistory {
  private canvas: any;
  private history: string[] = [];
  private currentIdx: number = -1;
  public isProcessing: boolean = false;
  private onChange: (canUndo: boolean, canRedo: boolean) => void;

  constructor(canvas: any, onChange: (canUndo: boolean, canRedo: boolean) => void) {
    this.canvas = canvas;
    this.onChange = onChange;
  }

  saveState() {
    if (this.isProcessing) return;
    
    const json = JSON.stringify(this.canvas.toJSON());
    
    // If the state is same as current, don't save
    if (this.currentIdx >= 0 && this.history[this.currentIdx] === json) {
      return;
    }

    // If we've undone, and then make a change, clear the redo history
    if (this.currentIdx < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIdx + 1);
    }

    this.history.push(json);
    this.currentIdx = this.history.length - 1;
    this.notify();
  }

  async undo() {
    if (this.currentIdx > 0) {
      this.isProcessing = true;
      this.currentIdx--;
      await this.canvas.loadFromJSON(this.history[this.currentIdx]);
      this.canvas.renderAll();
      this.isProcessing = false;
      this.notify();
    }
  }

  async redo() {
    if (this.currentIdx < this.history.length - 1) {
      this.isProcessing = true;
      this.currentIdx++;
      await this.canvas.loadFromJSON(this.history[this.currentIdx]);
      this.canvas.renderAll();
      this.isProcessing = false;
      this.notify();
    }
  }

  clear() {
    this.history = [];
    this.currentIdx = -1;
    this.saveState();
  }

  get canUndo() {
    return this.currentIdx > 0;
  }

  get canRedo() {
    return this.currentIdx < this.history.length - 1;
  }

  private notify() {
    this.onChange(this.canUndo, this.canRedo);
  }
}
