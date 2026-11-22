import { test, expect } from '@playwright/test';
import { expectInViewport, openCollection, playButton, quiz, savedTitle, tabTo, typeWithKeyboard } from './helpers.js';

test('5: полный сценарий квиза только через Tab, Enter и Space', async ({ page }) => {
  await openCollection(page);
  const play = playButton(page);
  await tabTo(page, play);
  const focusStyle = await play.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outline: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(focusStyle.outline).not.toBe('none');
  expect(focusStyle.width).toBeGreaterThanOrEqual(2);
  await expectInViewport(page, play);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');

  for (const [index, question] of quiz.questions.entries()) {
    await expect(dialog.getByRole('heading', { name: question.q, exact: true })).toBeFocused();
    const answer = dialog.getByRole('button', { name: question.options[question.correct], exact: true });
    await tabTo(page, answer);
    await expectInViewport(page, answer);
    await page.keyboard.press(index === 0 ? 'Space' : 'Enter');
    await expect(dialog.getByRole('status')).toContainText('That’s right!');
    const next = dialog.getByRole('button', { name: index === quiz.questions.length - 1 ? 'To the result' : 'Next question', exact: true });
    await expect(next).toBeFocused();
    await expectInViewport(page, next);
    await page.keyboard.press('Enter');
  }

  await expect(dialog.getByRole('heading', { name: 'Perfect score!' })).toBeFocused();
  await expect(dialog.getByText('2/2', { exact: true })).toBeVisible();
  await tabTo(page, dialog.getByRole('button', { name: 'All games', exact: true }));
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(play).toBeFocused();
});

test('5: редактор и Select работают только с клавиатуры', async ({ page }) => {
  await openCollection(page);
  await tabTo(page, page.getByRole('button', { name: 'New game', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Game name', { exact: true })).toBeFocused();
  await page.keyboard.insertText('Keyboard creation');
  await typeWithKeyboard(page, page.getByLabel('Category', { exact: false }), 'Practice');
  await typeWithKeyboard(page, page.getByLabel('Cover emoji', { exact: false }), '🧑‍💻');
  await typeWithKeyboard(page, page.getByLabel('Question', { exact: true }), 'Which option is correct?');
  for (const [i, text] of ['First', 'Second', 'Third', 'Fourth'].entries()) {
    await typeWithKeyboard(page, page.getByLabel(`Question 1, option ${'ABCD'[i]}`, { exact: true }), text);
  }
  const select = page.getByRole('combobox', { name: 'Correct answer for question 1' });
  await tabTo(page, select);
  await page.keyboard.press('Space');
  await expect(page.getByRole('option', { name: 'A', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'B', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(select).toHaveText('B');
  await typeWithKeyboard(page, page.getByLabel('Explanation', { exact: false }), 'The second answer is correct.');
  const save = page.getByRole('button', { name: 'Save game', exact: true });
  await tabTo(page, save);
  await expectInViewport(page, save);
  await page.keyboard.press('Enter');
  await expect(savedTitle(page, 'Keyboard creation')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('5: Tab и Shift+Tab удерживают фокус в диалоге, Escape возвращает его', async ({ page }) => {
  await openCollection(page);
  const create = page.getByRole('button', { name: 'New game', exact: true });
  await tabTo(page, create);
  await page.keyboard.press('Enter');
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press(key);
      expect(await page.getByRole('dialog').evaluate((element) => element.contains(document.activeElement))).toBe(true);
    }
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(create).toBeFocused();
});

test('5: Cancel и подтверждение удаления доступны с клавиатуры', async ({ page }) => {
  await openCollection(page);
  const remove = page.getByRole('button', { name: `Delete ${quiz.title}`, exact: true });
  await tabTo(page, remove);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(savedTitle(page, quiz.title)).toBeVisible();
  await expect(remove).toBeFocused();
  await page.keyboard.press('Enter');
  await tabTo(page, page.getByRole('button', { name: 'Delete quiz', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByText('A little curiosity starts here.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeFocused();
});

test('5: узкая раскладка и длинная форма не скрывают действия', async ({ page }) => {
  await openCollection(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tabTo(page, page.getByRole('button', { name: 'New game', exact: true }));
  await page.keyboard.press('Enter');
  const add = page.getByRole('button', { name: 'Add another question', exact: true });
  await tabTo(page, add);
  await page.keyboard.press('Enter');
  await tabTo(page, page.getByRole('button', { name: 'Save game', exact: true }));
  await expectInViewport(page, page.getByRole('button', { name: 'Save game', exact: true }));
  expect(await page.getByRole('dialog').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});
