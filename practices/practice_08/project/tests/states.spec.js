import { test, expect } from '@playwright/test';
import { fillQuiz, openCollection, quiz, savedTitle } from './helpers.js';

test('6: задержка загрузки отображается до успешного ответа', async ({ page }) => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  await page.route('**/data/decks.json', async (route) => { await pending; await route.fulfill({ json: [quiz] }); });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('status')).toContainText('Getting your quizzes ready…');
    await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeDisabled();
  } finally { release(); }
  await expect(savedTitle(page, quiz.title)).toBeVisible();
  await expect(page.getByText('Getting your quizzes ready…')).toBeHidden();
});

test('6: пустой ответ показывает создание и импорт, а не ошибку', async ({ page }) => {
  await openCollection(page, []);
  await expect(page.getByText('A little curiosity starts here.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create a quiz', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Import JSON', exact: true })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

for (const [name, response] of [
  ['HTTP 503', { status: 503 }],
  ['повреждённый JSON', { contentType: 'application/json', body: '{broken' }],
  ['неверная схема', { json: [{ title: 'Broken', questions: [] }] }],
]) {
  test(`6: ${name} — понятная ошибка и успешная повторная попытка`, async ({ page }) => {
    let failing = true;
    await page.route('**/data/decks.json', (route) => route.fulfill(failing ? response : { json: [quiz] }));
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText('Could not load quizzes');
    await expect(page.getByText('A little curiosity starts here.', { exact: true })).toBeHidden();
    failing = false;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(savedTitle(page, quiz.title)).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('5–6: обязательные поля, пробелы и исправление без потери данных', async ({ page }) => {
  await openCollection(page);
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  const title = page.getByLabel('Game name', { exact: true });
  await expect(title).toBeFocused();
  expect(await title.evaluate((element) => element.validity.valueMissing)).toBe(true);
  await fillQuiz(page, '   ');
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  const error = page.getByRole('alert');
  await expect(error).toContainText('spaces alone do not count');
  await expect(error).toBeFocused();
  await expect(page.getByLabel('Question', { exact: true })).toHaveValue('What is 2 + 2?');
  await title.fill('Corrected quiz');
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await expect(savedTitle(page, 'Corrected quiz')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Your quiz is ready to play.');
});

test('5–6: незаполненный вариант не сохраняется и может быть исправлен', async ({ page }) => {
  await openCollection(page);
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await fillQuiz(page);
  const option = page.getByLabel('Question 1, option D', { exact: true });
  await option.clear();
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await expect(option).toBeFocused();
  expect(await option.evaluate((element) => element.validity.valueMissing)).toBe(true);
  await option.fill('6');
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await expect(savedTitle(page, 'Created quiz')).toBeVisible();
});

test('6: нельзя сохранить игру без вопросов', async ({ page }) => {
  await openCollection(page);
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Game name', { exact: true }).fill('No questions');
  await page.getByRole('button', { name: 'Remove question 1', exact: true }).click();
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('at least one question');
  await expect(savedTitle(page, 'No questions')).toHaveCount(0);
  await expect(page.getByLabel('Game name', { exact: true })).toHaveValue('No questions');
});

test('6: после ошибки импорта можно выбрать исправленный файл', async ({ page }) => {
  await openCollection(page, []);
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByRole('alert')).toContainText('Could not import JSON');
  await expect(page.getByRole('button', { name: 'Import JSON', exact: true })).toBeEnabled();
  await input.setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([quiz])) });
  await expect(savedTitle(page, quiz.title)).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Imported 1 quiz(es).');
});
