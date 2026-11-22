export const TIME_PER_QUESTION = 15;

export function createId() {
  return crypto.randomUUID();
}

export function validateDeck(deck) {
  return Boolean(
    deck && typeof deck.title === 'string' && deck.title.trim() &&
    Array.isArray(deck.questions) && deck.questions.length > 0 &&
    deck.questions.every((question) =>
      question && typeof question.q === 'string' && question.q.trim() &&
      Array.isArray(question.options) && question.options.length === 4 &&
      question.options.every((option) => typeof option === 'string' && option.trim()) &&
      Number.isInteger(question.correct) && question.correct >= 0 && question.correct < 4 &&
      (question.explain === undefined || typeof question.explain === 'string'),
    ),
  );
}

// Идентификаторы уникальны даже при повторном импорте одного файла.
export function normalizeDecks(decks, existing = []) {
  const usedIds = new Set(existing.map((deck) => deck.id));
  return decks.map((deck) => {
    const id = typeof deck.id === 'string' && deck.id.trim() && !usedIds.has(deck.id)
      ? deck.id : createId();
    usedIds.add(id);
    return { ...deck, id };
  });
}

export function newQuestion() {
  return { id: createId(), q: '', options: ['', '', '', ''], correct: 0, explain: '' };
}
