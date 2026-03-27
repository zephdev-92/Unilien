# Vérification des findings — Offensive Security Review

**Date** : 2026-03-18  
**Référence** : `docs/OFFENSIVE_SECURITY_REVIEW.md`

> **26/03/2026** — L’analyse du **18/03** reste valide comme **historique**. Les correctifs sont dans **`041_security_fixes.sql`** et **`docs/SECURITY_CHECK_2026-03-26.md`**. Les findings **1** et **5** sont détaillés dans **`docs/SECURITY_IDOR_ANALYSIS.md`** ; pas de doublon ici.

---

## Finding 2 — Cross-tenant takeover via `employer_id`

### Question

Un caregiver peut-il modifier `employer_id` sur sa propre ligne via RLS ?

### Analyse des policies

**Migration 007** — "Employers can update their caregivers" :
```sql
USING (auth.uid() = employer_id)
WITH CHECK (auth.uid() = employer_id)
```
→ S'applique aux employeurs uniquement.

**Migration 008** — "Caregivers can update their own profile" :
```sql
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid())
```
→ S'applique aux caregivers sur leur propre ligne.

En PostgreSQL RLS, les policies pour une même opération sont évaluées en **OR**. Un caregiver satisfait la policy 008 : il peut UPDATE les lignes où `profile_id = auth.uid()`.

### Restriction sur les colonnes ?

**Aucune.** La policy ne limite pas les colonnes modifiables. Elle impose seulement :
- **USING** : la ligne doit avoir `profile_id = auth.uid()` (avant update)
- **WITH CHECK** : après update, `profile_id = auth.uid()` doit rester vrai

Un caregiver peut donc envoyer :
```json
{"employer_id": "<uuid_employeur_victime>", "legal_status": "tutor"}
```
sans violer la policy, car `profile_id` reste inchangé.

### Conclusion (état analysé au 18/03/2026)

**✅ CONFIRMÉ** — Un caregiver peut réécrire `employer_id` sur sa propre ligne et effectuer un pivot cross-tenant. Le Finding 2 du OFFENSIVE_SECURITY_REVIEW est valide.

### Après migration 041

La policy **`Caregivers can update own profile limited`** interdit la modification de `employer_id` en self-service. Rejeu du `PATCH` REST attendu en **échec** sur une base à jour.

---

## Finding 3 — Bucket justifications public

### État des migrations

**011** : Création du bucket avec `public = true` :
```sql
INSERT INTO storage.buckets (id, name, public, ...)
VALUES ('justifications', 'justifications', true, ...)
```

**011** : Policy "Public read access for justifications" — `TO public`, `USING (bucket_id = 'justifications')`

**021** : Suppression de la policy "Public read access for justifications" :
```sql
DROP POLICY "Public read access for justifications" ON storage.objects;
```

Aucune migration ne modifie le flag `public` du bucket (`UPDATE storage.buckets SET public = false`).

### Comportement Supabase

Pour un bucket avec `public = true` :
- URL publique : `https://<ref>.supabase.co/storage/v1/object/public/justifications/<path>`
- L’accès via cette URL ne passe pas par les policies RLS `storage.objects` (accès direct au serveur de stockage pour les buckets publics).

Même après suppression de la policy "Public read access", si `public = true` est conservé au niveau du bucket, les objets restent accessibles sans authentification via l’URL publique.

### Usage dans le code

- `absenceJustificationService.ts` : `getPublicUrl(fileName)` → URL publique renvoyée au client.
- Chemins prévisibles : `<employee_id>/arret_YYYY_MM_DD_<timestamp>.<ext>`

### Conclusion

**✅ PROBABLEMENT VALIDE** — Le bucket est créé avec `public = true` et aucune migration ne le repasse en privé. La suppression de la policy ne change pas le flag du bucket. À valider en conditions réelles (accès sans token à une URL d’objet connue).

**Recommandation** : Exécuter
```sql
UPDATE storage.buckets SET public = false WHERE id = 'justifications';
```
et utiliser des URLs signées (`createSignedUrl`) pour les justifications.

### Après migration 041

La recommandation SQL est **appliquée** dans **041**. Le service **`absenceJustificationService.ts`** utilise des **URL signées** (plus de `getPublicUrl` pour ce flux). Vérifier en staging/prod qu’aucun lien public ne fonctionne sans token.

---

## Finding 4 — Enumération des profils

### Policy analysée

```sql
CREATE POLICY "Employers can search profiles by email"
  ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM employers WHERE employers.profile_id = auth.uid()));
```

La condition ne filtre pas les lignes de `profiles` : elle vérifie seulement que l’appelant est employeur. Un employeur authentifié satisfait la condition pour **toutes** les lignes de `profiles`.

### Conclusion (état analysé au 18/03/2026)

**✅ CONFIRMÉ** — Un employeur peut exécuter :
```http
GET /rest/v1/profiles?select=id,first_name,last_name,email,phone,role
```
et récupérer tous les profils. Le Finding 4 est valide.

### Après migration 041

Policies **Employers** / **Tutors can search profiles by email** resserrées — réexécuter les requêtes larges et comparer avec les attentes de `SECURITY_CHECK_2026-03-26.md`.

---

## Synthèse

| Finding | Statut (18/03) | Après 041 |
|---------|----------------|-----------|
| 1 — Caregiver mass assignment | ✅ Confirmé | Corrigé — policy limited |
| 2 — Cross-tenant via employer_id | ✅ Confirmé | Corrigé — `employer_id` figé en self-service |
| 3 — Bucket justifications public | ⚠️ Probable | Corrigé — `public = false` + URLs signées |
| 4 — Profile enumeration | ✅ Confirmé | Mitigé — policies resserrées |
| 5 — Notification injection | ✅ Confirmé | Corrigé — voir `SECURITY_IDOR_ANALYSIS` |
