export const TIME_PER_QUESTION = 15;

export function createId() {
  return crypto.randomUUID();
}

export function validateDeck(deck) {
  return Boolean(
    deck && typeof deck.title === 'string' && deck.title.trim() &&
    Array.isArray(deck.questions) && deck.questions.length > 0 &&
    ['category', 'description', 'emoji', 'color'].every((field) => deck[field] === undefined || typeof deck[field] === 'string') &&
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

const coverColors = ['#dce8d5', '#d9e2f2', '#f1e4cc', '#f2dce1', '#e9e6c9', '#e0ddee'];
const coverEmojis = ['💻', '🐍', '🗃️', '🎨', '🌱', '✨'];

export function getDeckAppearance(deck, index = 0) {
  return {
    category: deck.category?.trim() || 'Made by you',
    description: deck.description?.trim() || 'A fresh challenge, made for the curious.',
    emoji: deck.emoji?.trim() || coverEmojis[index % coverEmojis.length],
    color: /^#[0-9a-f]{6}$/i.test(deck.color ?? '') ? deck.color : coverColors[index % coverColors.length],
  };
}
