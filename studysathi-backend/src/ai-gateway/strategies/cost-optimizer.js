export function getCostOptimizedProvider(task) {
  // Groq is free and fast — use it for all tasks
  return { provider: 'groq', model: 'llama-3.3-70b-versatile' };
}
