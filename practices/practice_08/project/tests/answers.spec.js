import { test, expect } from '@playwright/test';
import { openCollection, playButton, quiz } from './helpers.js';

test('7–9: неверный ответ показывает правильный вариант и не даёт очков', async ({ page }) => {
  await openCollection(page, [{ ...quiz, questions: [quiz.questions[0]] }]);
  await playButton(page).click();
  const dialog = page.getByRole('dialog');
  const wrongAnswer = dialog.getByRole('button', { name: '3', exact: true });
  await wrongAnswer.click();

  const feedback = dialog.getByRole('status');
  await expect(feedback).toContainText('Not quite.');
  await expect(feedback).toContainText('The correct answer is 4.');
  await expect(feedback).toContainText('Two plus two is four.');
  await expect(wrongAnswer).toBeDisabled();
  await expect(dialog.getByRole('button', { name: '4 Correct answer', exact: true })).toBeDisabled();
  for (const option of ['5', '6']) {
    await expect(dialog.getByRole('button', { name: option, exact: true })).toBeDisabled();
  }
  await expect(dialog.getByText('0 points', { exact: true })).toBeVisible();

  await dialog.getByRole('button', { name: 'To the result', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Good try!', exact: true })).toBeVisible();
  await expect(dialog.getByText('0/1', { exact: true })).toBeVisible();
  await expect(dialog.getByText('0%', { exact: true })).toBeVisible();
  await expect(dialog.locator('.result-score')).toHaveText('0pts');
});
