import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = 'e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  await page.goto('/connexion')

  await page.getByLabel('Adresse e-mail').fill(process.env.E2E_EMAIL!)
  await page.getByRole('textbox', { name: 'Mot de passe' }).fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: /se connecter/i }).click()

  // Attendre la redirection vers le dashboard
  await page.waitForURL('**/tableau-de-bord', { timeout: 10000 })
  await expect(page).toHaveURL(/tableau-de-bord/)

  // Sauvegarder la session pour les autres tests
  await page.context().storageState({ path: AUTH_FILE })
})
