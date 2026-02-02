#!/bin/bash
# ============================================
# Script de configuration Web Push Notifications
# ============================================
# Ce script configure les secrets Supabase nécessaires
# pour les notifications push et déploie l'Edge Function

set -e

echo "=== Configuration Web Push Notifications ==="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Vérifier si les clés VAPID existent
VAPID_KEYS_PATH="./.vapid-keys.json"
if [ ! -f "$VAPID_KEYS_PATH" ]; then
    echo -e "${RED}Erreur: Fichier .vapid-keys.json non trouvé${NC}"
    echo -e "${YELLOW}Exécutez d'abord: npx web-push generate-vapid-keys --json${NC}"
    exit 1
fi

# Lire les clés VAPID
PUBLIC_KEY=$(cat "$VAPID_KEYS_PATH" | grep -o '"publicKey":"[^"]*"' | cut -d'"' -f4)
PRIVATE_KEY=$(cat "$VAPID_KEYS_PATH" | grep -o '"privateKey":"[^"]*"' | cut -d'"' -f4)
SUBJECT=$(cat "$VAPID_KEYS_PATH" | grep -o '"subject":"[^"]*"' | cut -d'"' -f4)

echo -e "${GREEN}Clés VAPID trouvées:${NC}"
echo -e "${GRAY}  Public Key: ${PUBLIC_KEY:0:20}...${NC}"
echo -e "${GRAY}  Subject: $SUBJECT${NC}"
echo ""

# Étape 1: Login Supabase
echo -e "${YELLOW}Étape 1: Connexion à Supabase${NC}"
echo "Si vous n'êtes pas connecté, une fenêtre de navigateur va s'ouvrir..."
echo ""

npx supabase login

# Étape 2: Lier le projet
echo ""
echo -e "${YELLOW}Étape 2: Liaison du projet Supabase${NC}"

# Extraire le project ref depuis .env
PROJECT_REF=$(grep "VITE_SUPABASE_URL" .env | sed -n 's/.*https:\/\/\([^.]*\)\.supabase\.co.*/\1/p')

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}Impossible de détecter le project ref depuis .env${NC}"
    read -p "Entrez votre project ref Supabase: " PROJECT_REF
fi

echo -e "${GRAY}Project ref détecté: $PROJECT_REF${NC}"

npx supabase link --project-ref "$PROJECT_REF"

# Étape 3: Configurer les secrets
echo ""
echo -e "${YELLOW}Étape 3: Configuration des secrets VAPID${NC}"

npx supabase secrets set VAPID_PUBLIC_KEY="$PUBLIC_KEY"
npx supabase secrets set VAPID_PRIVATE_KEY="$PRIVATE_KEY"
npx supabase secrets set VAPID_SUBJECT="$SUBJECT"

echo -e "${GREEN}Secrets configurés avec succès!${NC}"

# Étape 4: Appliquer la migration
echo ""
echo -e "${YELLOW}Étape 4: Application de la migration (push_subscriptions)${NC}"

npx supabase db push || {
    echo -e "${YELLOW}Vous pouvez l'appliquer manuellement via le dashboard Supabase${NC}"
}

# Étape 5: Déployer l'Edge Function
echo ""
echo -e "${YELLOW}Étape 5: Déploiement de l'Edge Function${NC}"

npx supabase functions deploy send-push-notification --no-verify-jwt

# Terminé
echo ""
echo -e "${GREEN}=== Configuration terminée! ===${NC}"
echo ""
echo -e "${CYAN}Les notifications push sont maintenant configurées.${NC}"
echo ""
echo "Pour tester:"
echo "  1. Lancez l'application: npm run dev"
echo "  2. Connectez-vous"
echo "  3. Acceptez la demande de notification"
echo "  4. Créez une notification via l'UI"
echo ""
