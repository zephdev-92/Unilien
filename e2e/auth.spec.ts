import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } }) // non authentifié

test.describe('Authentification', () => {
  test('affiche la page de connexion', async ({ page }) => {
    await page.goto('/connexion')
    await expect(page).toHaveTitle(/Unilien/)
    await expect(page.getByLabel('Adresse e-mail')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Mot de passe' })).toBeVisible()
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible()
  })

  test('redirige vers connexion si non authentifié', async ({ page }) => {
    await page.goto('/tableau-de-bord')
    await expect(page).toHaveURL(/connexion/)
  })

  test('affiche une erreur sur mauvais mot de passe', async ({ page }) => {
    await page.goto('/connexion')
    await page.getByLabel('Adresse e-mail').fill('test@example.com')
    await page.getByRole('textbox', { name: 'Mot de passe' }).fill('mauvaismdp')
    await page.getByRole('button', { name: /se connecter/i }).click()
    await expect(page.getByText(/email ou mot de passe incorrect/i)).toBeVisible({ timeout: 10000 })
  })
})
