import { expect, test } from '@playwright/test';

test('resumes an IndexedDB job after a real page reload', async ({ page }) => {
  await page.goto('/tests/browser/fixture.html');
  await page.waitForFunction(() => Boolean((window as any).pptaskFixture));
  await page.evaluate(() => (window as any).pptaskFixture.clear());

  const jobId = await page.evaluate(() => (window as any).pptaskFixture.start());
  expect(jobId).toMatch(/^job-/);
  expect(await page.evaluate(() => (window as any).pptaskFixture.stats())).toMatchObject({
    starts: 1,
    statuses: 0,
    jobId,
  });

  await page.reload();
  await page.waitForFunction(() => Boolean((window as any).pptaskFixture));
  const bytes = await page.evaluate(() => (window as any).pptaskFixture.resume());

  expect(bytes).toEqual([8, 9, 10]);
  expect(await page.evaluate(() => (window as any).pptaskFixture.stats())).toMatchObject({
    starts: 1,
    statuses: 2,
    jobId,
  });
});
