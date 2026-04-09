import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('affiche le dashboard après login', async ({ page }) => {
    await page.goto('/tableau-de-bord')
    await expect(page).toHaveURL(/tableau-de-bord/)
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('affiche la navigation principale', async ({ page }) => {
    await page.goto('/tableau-de-bord')
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('navigue vers le planning', async ({ page }) => {
    await page.goto('/tableau-de-bord')
    await page.getByRole('link', { name: 'Voir le planning' }).click()
    await expect(page).toHaveURL(/planning/)
  })

  test('navigue vers la messagerie', async ({ page }) => {
    await page.goto('/tableau-de-bord')
    await page.getByRole('link', { name: /message/i }).click()
    await expect(page).toHaveURL(/messagerie/)
  })
})
