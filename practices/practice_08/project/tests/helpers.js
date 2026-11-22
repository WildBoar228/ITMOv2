import { expect } from '@playwright/test';

// Тот же контракт, что у public/data/decks.json. Никаких alternate API shapes.
export const quiz = {
  id: 'keyboard-quiz',
  title: 'Keyboard quiz',
  category: 'Arithmetic',
  description: 'Two small questions.',
  emoji: '🧮',
  color: '#dce8d5',
  questions: [
    { id: 'q1', q: '2 + 2?', options: ['4', '3', '5', '6'], correct: 0, explain: 'Two plus two is four.' },
    { id: 'q2', q: '3 + 3?', options: ['5', '6', '7', '8'], correct: 1 },
  ],
};

export async function openCollection(page, decks = [quiz]) {
  await page.route('**/data/decks.json', (route) => route.fulfill({ json: decks }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
}

export function playButton(page) {
  return page.getByRole('button', { name: `Play ${quiz.title}`, exact: true });
}

export async function tabTo(page, target, backwards = false) {
  await expect(target).toBeVisible();
  for (let i = 0; i < 40; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
  }
  await expect(target, 'Элемент должен быть достижим клавишей Tab').toBeFocused();
}

export async function typeWithKeyboard(page, target, text) {
  await tabTo(page, target);
  await page.keyboard.insertText(text);
}

export async function fillQuiz(page, title = 'Created quiz') {
  await page.getByLabel('Game name', { exact: true }).fill(title);
  await page.getByLabel('Question', { exact: true }).fill('What is 2 + 2?');
  for (const [i, text] of ['4', '3', '5', '6'].entries()) {
    await page.getByLabel(`Question 1, option ${'ABCD'[i]}`, { exact: true }).fill(text);
  }
}

export function savedTitle(page, title) {
  return page.getByRole('region', { name: 'Find your next quiz' }).getByRole('heading', { name: title, exact: true });
}

export async function expectInViewport(page, locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}
