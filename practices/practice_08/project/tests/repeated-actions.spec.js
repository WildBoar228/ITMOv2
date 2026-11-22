import { test, expect } from '@playwright/test';
import { fillQuiz, openCollection, playButton, quiz, savedTitle } from './helpers.js';

for (const action of ['double click', 'repeated Enter']) {
  test(`6: ${action} сохраняет только одну игру`, async ({ page }) => {
    await openCollection(page, []);
    await page.getByRole('button', { name: 'New game', exact: true }).click();
    await fillQuiz(page, 'Saved once');
    const save = page.getByRole('button', { name: 'Save game', exact: true });
    if (action === 'double click') await save.dblclick();
    else {
      await save.focus();
      await page.keyboard.down('Enter');
      await page.keyboard.down('Enter');
      await page.keyboard.up('Enter');
    }
    // Сохранение синхронное: проверяется число реальных записей в коллекции.
    if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
    await expect(savedTitle(page, 'Saved once')).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Find your next quiz' }).getByRole('heading', { level: 3 })).toHaveCount(1);
  });
}

test('6: повторный импорт во время чтения не запускает вторую операцию', async ({ page }) => {
  // Задерживается только браузерное чтение файла, сама логика импорта настоящая.
  await page.addInitScript(() => {
    const read = File.prototype.text;
    window.fileReads = 0;
    File.prototype.text = async function () {
      window.fileReads++;
      await new Promise((resolve) => { window.finishFileRead = resolve; });
      return read.call(this);
    };
  });
  await openCollection(page, []);
  const input = page.locator('input[type="file"]');
  const file = { name: 'quizzes.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([quiz])) };
  await input.setInputFiles(file);
  await expect(page.getByRole('button', { name: 'Importing…', exact: true })).toBeDisabled();
  await expect(savedTitle(page, quiz.title)).toHaveCount(0);
  // Второе change проверяет guard, даже если файл пришёл из уже открытого picker.
  await input.setInputFiles(file);
  expect(await page.evaluate(() => window.fileReads)).toBe(1);
  await page.evaluate(() => window.finishFileRead());
  await expect(savedTitle(page, quiz.title)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Import JSON', exact: true })).toBeEnabled();
});

test('6: ошибка чтения файла снимает блокировку и позволяет повторить импорт', async ({ page }) => {
  await page.addInitScript(() => {
    const read = File.prototype.text;
    let fail = true;
    File.prototype.text = function () {
      if (fail) { fail = false; return Promise.reject(new Error('File could not be read')); }
      return read.call(this);
    };
  });
  await openCollection(page, []);
  const input = page.locator('input[type="file"]');
  const file = { name: 'quizzes.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([quiz])) };
  await input.setInputFiles(file);
  await expect(page.getByRole('alert')).toContainText('File could not be read');
  await expect(page.getByRole('button', { name: 'Import JSON', exact: true })).toBeEnabled();
  await input.setInputFiles(file);
  await expect(savedTitle(page, quiz.title)).toHaveCount(1);
});

test('6: повторный ответ не меняет очки, таймер останавливается', async ({ page }) => {
  await page.clock.install();
  await openCollection(page);
  // Останавливаем часы до старта вопроса: через 5 с останется ровно 10 с,
  // правильный ответ должен дать ровно 20 очков, даже после двойного клика.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await playButton(page).click();
  const dialog = page.getByRole('dialog');
  const progress = page.getByRole('progressbar', { name: 'Time remaining' });
  await expect(progress).toHaveAttribute('aria-valuenow', '100');
  await page.clock.fastForward(5000);
  expect(Number(await progress.getAttribute('aria-valuenow'))).toBeCloseTo(100 * 10 / 15, 5);
  const answer = dialog.getByRole('button', { name: /^4(?: Correct answer)?$/ });
  await answer.dblclick();
  await expect(answer).toBeDisabled();
  const feedback = page.getByRole('status');
  await expect(feedback).toContainText('That’s right! +20 points');
  await expect(dialog.getByText('20 points', { exact: true })).toBeVisible();
  const frozen = await progress.getAttribute('aria-valuenow');
  await page.clock.fastForward(10000);
  await expect(feedback).toContainText('That’s right! +20 points');
  await expect(dialog.getByText('20 points', { exact: true })).toBeVisible();
  await expect(progress).toHaveAttribute('aria-valuenow', frozen);
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '100');
  // Завершаем вторым, неверным ответом, чтобы проверить итоговый счёт.
  await dialog.getByRole('button', { name: '5', exact: true }).click();
  await dialog.getByRole('button', { name: 'To the result', exact: true }).click();
  await expect(dialog.getByText('1/2', { exact: true })).toBeVisible();
  await expect(dialog.locator('.result-score')).toHaveText('20pts');
});

test('5–6: таймаут блокирует ответы и переводит фокус на продолжение', async ({ page }) => {
  await page.clock.install();
  await openCollection(page);
  await playButton(page).click();
  await page.clock.fastForward(16000);
  await expect(page.getByRole('status')).toContainText('Time’s up!');
  await expect(page.getByRole('progressbar', { name: 'Time remaining' })).toHaveAttribute('aria-valuenow', '0');
  for (const answer of quiz.questions[0].options) {
    await expect(page.getByRole('dialog').getByRole('button', { name: answer, exact: false })).toBeDisabled();
  }
  await expect(page.getByRole('button', { name: 'Next question', exact: true })).toBeFocused();
});
