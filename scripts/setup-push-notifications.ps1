# ============================================
# Script de configuration Web Push Notifications
# ============================================
# Ce script configure les secrets Supabase nécessaires
# pour les notifications push et déploie l'Edge Function

Write-Host "=== Configuration Web Push Notifications ===" -ForegroundColor Cyan
Write-Host ""

# Vérifier si les clés VAPID existent
$vapidKeysPath = ".\.vapid-keys.json"
if (-not (Test-Path $vapidKeysPath)) {
    Write-Host "Erreur: Fichier .vapid-keys.json non trouvé" -ForegroundColor Red
    Write-Host "Exécutez d'abord: npx web-push generate-vapid-keys --json" -ForegroundColor Yellow
    exit 1
}

# Lire les clés VAPID
$vapidKeys = Get-Content $vapidKeysPath | ConvertFrom-Json
$publicKey = $vapidKeys.publicKey
$privateKey = $vapidKeys.privateKey
$subject = $vapidKeys.subject

Write-Host "Clés VAPID trouvées:" -ForegroundColor Green
Write-Host "  Public Key: $($publicKey.Substring(0, 20))..." -ForegroundColor Gray
Write-Host "  Subject: $subject" -ForegroundColor Gray
Write-Host ""

# Étape 1: Login Supabase
Write-Host "Étape 1: Connexion à Supabase" -ForegroundColor Yellow
Write-Host "Si vous n'êtes pas connecté, une fenêtre de navigateur va s'ouvrir..."
Write-Host ""

npx supabase login

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la connexion à Supabase" -ForegroundColor Red
    exit 1
}

# Étape 2: Lier le projet
Write-Host ""
Write-Host "Étape 2: Liaison du projet Supabase" -ForegroundColor Yellow

# Extraire le project ref depuis .env
$envContent = Get-Content ".\.env" -Raw
if ($envContent -match "VITE_SUPABASE_URL=https://([^.]+)\.supabase\.co") {
    $projectRef = $matches[1]
    Write-Host "Project ref détecté: $projectRef" -ForegroundColor Gray
} else {
    Write-Host "Impossible de détecter le project ref depuis .env" -ForegroundColor Red
    $projectRef = Read-Host "Entrez votre project ref Supabase"
}

npx supabase link --project-ref $projectRef

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la liaison du projet" -ForegroundColor Red
    exit 1
}

# Étape 3: Configurer les secrets
Write-Host ""
Write-Host "Étape 3: Configuration des secrets VAPID" -ForegroundColor Yellow

npx supabase secrets set VAPID_PUBLIC_KEY="$publicKey"
npx supabase secrets set VAPID_PRIVATE_KEY="$privateKey"
npx supabase secrets set VAPID_SUBJECT="$subject"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la configuration des secrets" -ForegroundColor Red
    exit 1
}

Write-Host "Secrets configurés avec succès!" -ForegroundColor Green

# Étape 4: Appliquer la migration
Write-Host ""
Write-Host "Étape 4: Application de la migration (push_subscriptions)" -ForegroundColor Yellow

npx supabase db push

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de l'application de la migration" -ForegroundColor Red
    Write-Host "Vous pouvez l'appliquer manuellement via le dashboard Supabase" -ForegroundColor Yellow
}

# Étape 5: Déployer l'Edge Function
Write-Host ""
Write-Host "Étape 5: Déploiement de l'Edge Function" -ForegroundColor Yellow

npx supabase functions deploy send-push-notification --no-verify-jwt

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du déploiement de l'Edge Function" -ForegroundColor Red
    exit 1
}

# Terminé
Write-Host ""
Write-Host "=== Configuration terminée! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Les notifications push sont maintenant configurées." -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour tester:"
Write-Host "  1. Lancez l'application: npm run dev"
Write-Host "  2. Connectez-vous"
Write-Host "  3. Acceptez la demande de notification"
Write-Host "  4. Créez une notification via l'UI"
Write-Host ""
