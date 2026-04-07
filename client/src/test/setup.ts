import '@testing-library/jest-dom'

// Node.js 22+ provides a global localStorage but without clear().
// Replace it with a full in-memory implementation for tests.
class LocalStorageMock implements Storage {
  private store: Record<string, string> = {}

  get length() { return Object.keys(this.store).length }
  key(index: number) { return Object.keys(this.store)[index] ?? null }
  getItem(key: string) { return this.store[key] ?? null }
  setItem(key: string, value: string) { this.store[key] = String(value) }
  removeItem(key: string) { delete this.store[key] }
  clear() { this.store = {} }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new LocalStorageMock(),
  writable: true,
})
