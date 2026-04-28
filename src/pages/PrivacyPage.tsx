import { Link as RouterLink } from 'react-router-dom'
import { Box, Container, Flex, Stack, Text, Link } from '@chakra-ui/react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text fontSize="lg" fontWeight="700" color="text.default" mb={3}>
        {title}
      </Text>
      <Stack gap={3} fontSize="sm" color="text.inactive" lineHeight="1.8">
        {children}
      </Stack>
    </Box>
  )
}

export default function PrivacyPage() {
  return (
    <Box minH="100vh" bg="bg.page">
      {/* Header */}
      <Box bg="bg.surface" borderBottomWidth="1px" borderColor="border.default" py={6}>
        <Container maxW="800px">
          <Flex align="center" gap={3} mb={2}>
            <Link as={RouterLink} to="/" fontSize="sm" color="brand.solid" fontWeight="600" _hover={{ textDecoration: 'underline' }}>
              ← Retour
            </Link>
          </Flex>
          <Text fontSize="2xl" fontWeight="800" color="text.default">
            Politique de confidentialité
          </Text>
          <Text fontSize="sm" color="text.inactive" mt={1}>
            Dernière mise à jour : avril 2026 — brouillon, projet en développement
          </Text>
        </Container>
      </Box>

      {/* Content */}
      <Container maxW="800px" py={8}>
        <Stack gap={8}>

          <Section title="Préambule">
            <Text>
              La présente politique de confidentialité décrit la manière dont <strong>Unilien</strong>{' '}
              (ci-après « le Service ») collecte, utilise et protège les données personnelles de ses
              utilisateurs, conformément au Règlement Général sur la Protection des Données
              (UE 2016/679, ci-après « RGPD ») et à la loi Informatique et Libertés du 6 janvier 1978
              modifiée.
            </Text>
            <Text>
              Pour les coordonnées de l&apos;éditeur et l&apos;hébergement, voir les{' '}
              <Link as={RouterLink} to="/mentions-legales" color="brand.solid">mentions légales</Link>.
            </Text>
          </Section>

          <Section title="1. Responsable du traitement">
            <Text>
              Le responsable du traitement des données est Vincent Zepharren, éditeur du Service.<br />
              Contact : <Link href="mailto:contact@unilien.app" color="brand.solid">contact@unilien.app</Link>
            </Text>
            <Text>
              <em>
                Compte tenu du caractère personnel et expérimental du projet, aucun délégué à la
                protection des données (DPO) n&apos;est désigné. L&apos;éditeur assure directement
                cette fonction.
              </em>
            </Text>
          </Section>

          <Section title="2. Données collectées">
            <Text>Le Service collecte les catégories de données suivantes :</Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li"><strong>Données d&apos;identification :</strong> nom, prénom, adresse email, numéro de téléphone (facultatif)</Box>
              <Box as="li"><strong>Données de profil :</strong> rôle (employeur / employé / aidant), avatar (facultatif), adresse postale</Box>
              <Box as="li"><strong>Données contractuelles :</strong> contrats de travail, planning des interventions, heures travaillées, congés, absences</Box>
              <Box as="li"><strong>Données de communication :</strong> messages échangés via le cahier de liaison</Box>
              <Box as="li"><strong>Données techniques :</strong> logs d&apos;accès, adresse IP (uniquement pour la sécurité), préférences UI</Box>
              <Box as="li"><strong>Données de santé (sensibles, art. 9 RGPD) :</strong> type de handicap, besoins spécifiques, informations PCH — uniquement avec consentement explicite</Box>
            </Box>
          </Section>

          <Section title="3. Finalités et bases légales">
            <Text>Vos données sont traitées pour les finalités suivantes :</Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li"><strong>Gestion du compte et fourniture du Service</strong> — base légale : exécution du contrat (art. 6.1.b RGPD)</Box>
              <Box as="li"><strong>Gestion des interventions, plannings et paie</strong> — base légale : exécution du contrat (art. 6.1.b RGPD)</Box>
              <Box as="li"><strong>Communication entre utilisateurs liés</strong> — base légale : intérêt légitime (art. 6.1.f RGPD)</Box>
              <Box as="li"><strong>Sécurité et prévention des abus</strong> — base légale : intérêt légitime (art. 6.1.f RGPD)</Box>
              <Box as="li"><strong>Notifications email</strong> — base légale : exécution du contrat et consentement (art. 6.1.a et 6.1.b RGPD)</Box>
              <Box as="li"><strong>Données de santé</strong> — base légale : consentement explicite (art. 9.2.a RGPD)</Box>
            </Box>
          </Section>

          <Section title="4. Destinataires et sous-traitants">
            <Text>
              Vos données ne sont <strong>jamais vendues ni partagées</strong> avec des tiers à des
              fins commerciales. Elles sont accessibles :
            </Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li">À vous-même, depuis votre compte</Box>
              <Box as="li">Aux utilisateurs avec lesquels vous êtes liés (employeur ↔ employé ↔ aidant), dans la limite de leurs droits définis par les politiques RLS</Box>
              <Box as="li">À l&apos;éditeur du Service, pour les besoins de support et maintenance, uniquement sur demande ou en cas d&apos;incident</Box>
            </Box>
            <Text>Sous-traitants techniques :</Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li"><strong>OVH</strong> (hébergement VPS, France) — infrastructure</Box>
              <Box as="li"><strong>Resend</strong> (envoi des emails transactionnels) — données traitées : adresse email, contenu de la notification</Box>
            </Box>
          </Section>

          <Section title="5. Durée de conservation">
            <Text>
              Vos données sont conservées pendant la durée d&apos;utilisation du Service. À la
              suppression du compte :
            </Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li">Les données personnelles et métier sont <strong>supprimées immédiatement</strong> de la base de production</Box>
              <Box as="li">Les sauvegardes contenant ces données sont conservées au maximum 30 jours, puis effacées par roulement</Box>
              <Box as="li">Les logs techniques anonymisés peuvent être conservés jusqu&apos;à 12 mois pour des raisons de sécurité</Box>
              <Box as="li">Les obligations légales (comptabilité, paie) peuvent imposer une conservation plus longue de certains documents</Box>
            </Box>
          </Section>

          <Section title="6. Vos droits">
            <Text>
              Conformément au RGPD (articles 15 à 22), vous disposez des droits suivants :
            </Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li"><strong>Droit d&apos;accès</strong> — obtenir une copie de vos données (Paramètres → Données → Exporter)</Box>
              <Box as="li"><strong>Droit de rectification</strong> — modifier vos informations depuis votre profil</Box>
              <Box as="li"><strong>Droit à l&apos;effacement</strong> — supprimer votre compte (Paramètres → Zone de danger)</Box>
              <Box as="li"><strong>Droit à la portabilité</strong> — exporter vos données aux formats JSON ou CSV</Box>
              <Box as="li"><strong>Droit d&apos;opposition</strong> — vous opposer à un traitement fondé sur l&apos;intérêt légitime</Box>
              <Box as="li"><strong>Droit à la limitation</strong> — demander la suspension temporaire d&apos;un traitement</Box>
              <Box as="li"><strong>Droit de retirer votre consentement</strong> — à tout moment, sans affecter la licéité des traitements antérieurs</Box>
            </Box>
            <Text>
              Pour exercer ces droits, contactez-nous à{' '}
              <Link href="mailto:contact@unilien.app" color="brand.solid">contact@unilien.app</Link>.
              Nous répondrons dans un délai d&apos;un mois maximum.
            </Text>
            <Text>
              Vous pouvez également introduire une réclamation auprès de la{' '}
              <Link href="https://www.cnil.fr" color="brand.solid" target="_blank" rel="noopener noreferrer">CNIL</Link>{' '}
              (Commission Nationale de l&apos;Informatique et des Libertés).
            </Text>
          </Section>

          <Section title="7. Données de santé">
            <Text>
              Le Service permet la saisie de données de santé, considérées comme sensibles au sens
              de l&apos;article 9 du RGPD. Ces données font l&apos;objet de mesures de protection
              renforcées :
            </Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li">Collecte uniquement après <strong>consentement explicite</strong> de l&apos;utilisateur</Box>
              <Box as="li">Isolation dans une table dédiée avec contrôles d&apos;accès stricts (RLS)</Box>
              <Box as="li">Audit des accès enregistré pour traçabilité</Box>
              <Box as="li">Transit uniquement via connexions chiffrées HTTPS/TLS</Box>
              <Box as="li">Aucun partage avec des tiers</Box>
            </Box>
            <Text>
              <em>
                Note : l&apos;hébergement actuel n&apos;est pas certifié HDS (Hébergeur de Données
                de Santé). Les données de santé saisies le sont sous la responsabilité de l&apos;utilisateur.
              </em>
            </Text>
          </Section>

          <Section title="8. Sécurité">
            <Text>
              Nous mettons en œuvre les mesures techniques et organisationnelles suivantes :
            </Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li">Chiffrement TLS pour toutes les communications</Box>
              <Box as="li">Authentification forte avec mots de passe robustes et 2FA optionnelle (TOTP)</Box>
              <Box as="li">Contrôle d&apos;accès basé sur les rôles (RBAC) et politiques RLS</Box>
              <Box as="li">Sauvegardes régulières chiffrées</Box>
              <Box as="li">Mises à jour de sécurité appliquées rapidement</Box>
              <Box as="li">Aucun cookie de tracking ou publicitaire</Box>
            </Box>
          </Section>

          <Section title="9. Cookies et stockage local">
            <Text>
              Unilien utilise uniquement des <strong>cookies strictement nécessaires</strong> au
              fonctionnement (session, préférences). Aucun cookie publicitaire ou analytique n&apos;est
              déposé. Le détail des cookies est disponible dans les{' '}
              <Link as={RouterLink} to="/mentions-legales" color="brand.solid">mentions légales</Link>.
            </Text>
          </Section>

          <Section title="10. Modifications">
            <Text>
              La présente politique peut être modifiée pour refléter les évolutions du Service ou
              de la réglementation. Les utilisateurs seront informés des modifications substantielles
              par email. La date de dernière mise à jour est indiquée en haut de cette page.
            </Text>
          </Section>

          <Section title="11. Contact">
            <Text>
              Pour toute question relative à cette politique ou à vos données personnelles :{' '}
              <Link href="mailto:contact@unilien.app" color="brand.solid">contact@unilien.app</Link>
            </Text>
          </Section>

        </Stack>
      </Container>
    </Box>
  )
}
