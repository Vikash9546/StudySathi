export function routeTask(task) {
  switch (task) {
    case 'MCQ_GENERATION':
    case 'SUBJECTIVE_GENERATION':
      return { provider: 'groq', model: 'llama-3.3-70b-versatile' };
    case 'FLASHCARD_GENERATION':
      return { provider: 'groq', model: 'llama-3.3-70b-versatile' };
    case 'RAG_TUTOR':
      return { provider: 'groq', model: 'llama-3.3-70b-versatile' };
    case 'TOPIC_EXTRACTION':
    case 'MODERATION':
    case 'STUDY_PLAN':
    default:
      return { provider: 'groq', model: 'llama-3.3-70b-versatile' };
  }
}
