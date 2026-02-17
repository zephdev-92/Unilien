import '@testing-library/jest-dom'

// Supprime les warnings console.warn/console.error non critiques dans les tests
// (ex: act() warnings résiduels de bibliothèques tierces)
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : ''
  // Supprime les double-warnings React act() provenant de mises à jour asynchrones internes
  if (msg.includes('inside a test was not wrapped in act')) return
  originalWarn(...args)
}
