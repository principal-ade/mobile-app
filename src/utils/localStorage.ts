// Polyfill for localStorage in React Native
// This provides a simple in-memory storage that mimics localStorage API

class LocalStoragePolyfill {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  get length(): number {
    return this.storage.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.storage.keys());
    return keys[index] ?? null;
  }
}

// Install the polyfill globally
if (typeof localStorage === 'undefined') {
  (global as typeof globalThis).localStorage = new LocalStoragePolyfill();
}
