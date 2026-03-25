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

export default function LegalPage() {
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
            Mentions légales
          </Text>
          <Text fontSize="sm" color="text.inactive" mt={1}>
            Dernière mise à jour : mars 2026
          </Text>
        </Container>
      </Box>

      {/* Content */}
      <Container maxW="800px" py={8}>
        <Stack gap={8}>

          <Section title="1. Éditeur du site">
            <Text>
              <strong>Unilien</strong> (nom commercial de l&apos;application Handi-Lien)<br />
              Application web de gestion de soins pour personnes en situation de handicap.<br />
              Statut : en cours de développement — projet personnel.
            </Text>
            <Text>
              Responsable de la publication : Vincent Zepharren<br />
              Contact : <Link href="mailto:contact@unilien.fr" color="brand.solid">contact@unilien.fr</Link>
            </Text>
          </Section>

          <Section title="2. Hébergement">
            <Text>
              L&apos;application est hébergée par :<br />
              <strong>Vercel Inc.</strong> — 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis<br />
              Site : <Link href="https://vercel.com" color="brand.solid" target="_blank" rel="noopener noreferrer">vercel.com</Link>
            </Text>
            <Text>
              Les données sont stockées par :<br />
              <strong>Supabase Inc.</strong> — 970 Toa Payoh North #07-04, Singapore 318992<br />
              Infrastructure : Amazon Web Services (région eu-west).<br />
              Site : <Link href="https://supabase.com" color="brand.solid" target="_blank" rel="noopener noreferrer">supabase.com</Link>
            </Text>
          </Section>

          <Section title="3. Protection des données personnelles (RGPD)">
            <Text>
              Conformément au Règlement Général sur la Protection des Données (UE 2016/679)
              et à la loi Informatique et Libertés du 6 janvier 1978 modifiée, nous nous engageons
              à protéger vos données personnelles.
            </Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li"><strong>Responsable du traitement :</strong> Vincent Zepharren</Box>
              <Box as="li"><strong>Finalité :</strong> gestion des interventions, plannings, suivi des heures et communication entre employeurs particuliers, employés et auxiliaires de vie</Box>
              <Box as="li"><strong>Base légale :</strong> exécution du contrat (article 6.1.b RGPD) et consentement explicite pour les données de santé (article 9.2.a RGPD)</Box>
              <Box as="li"><strong>Durée de conservation :</strong> les données sont conservées pendant la durée de la relation contractuelle, puis supprimées dans un délai de 12 mois après clôture du compte</Box>
              <Box as="li"><strong>Destinataires :</strong> les données ne sont partagées avec aucun tiers. Seuls les utilisateurs autorisés (employeur, employé, auxiliaire lié) y accèdent via des politiques RLS (Row Level Security)</Box>
            </Box>
          </Section>

          <Section title="4. Données de santé">
            <Text>
              Certaines données collectées sont considérées comme des données sensibles au sens
              de l&apos;article 9 du RGPD (type de handicap, besoins spécifiques, informations PCH).
            </Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li">Ces données ne sont collectées qu&apos;avec votre <strong>consentement explicite</strong></Box>
              <Box as="li">Elles sont protégées par des politiques d&apos;accès strictes (RLS Supabase)</Box>
              <Box as="li">Elles transitent uniquement via des connexions chiffrées (HTTPS/TLS)</Box>
              <Box as="li">Elles ne sont jamais partagées avec des tiers</Box>
            </Box>
            <Text>
              <em>Note : Supabase n&apos;est pas certifié HDS (Hébergeur de Données de Santé).
              Les données de santé saisies le sont sous la responsabilité de l&apos;utilisateur.</em>
            </Text>
          </Section>

          <Section title="5. Vos droits">
            <Text>
              Vous disposez des droits suivants sur vos données personnelles :
            </Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li"><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données (Paramètres → Données → Exporter)</Box>
              <Box as="li"><strong>Droit de rectification :</strong> modifier vos informations depuis votre profil</Box>
              <Box as="li"><strong>Droit à l&apos;effacement :</strong> demander la suppression de votre compte et de toutes vos données</Box>
              <Box as="li"><strong>Droit à la portabilité :</strong> exporter vos données au format JSON ou CSV</Box>
              <Box as="li"><strong>Droit d&apos;opposition :</strong> vous opposer au traitement de vos données</Box>
            </Box>
            <Text>
              Pour exercer ces droits, contactez-nous à{' '}
              <Link href="mailto:contact@unilien.fr" color="brand.solid">contact@unilien.fr</Link>.
              Nous répondrons dans un délai de 30 jours.
            </Text>
            <Text>
              Vous pouvez également introduire une réclamation auprès de la{' '}
              <Link href="https://www.cnil.fr" color="brand.solid" target="_blank" rel="noopener noreferrer">CNIL</Link>{' '}
              (Commission Nationale de l&apos;Informatique et des Libertés).
            </Text>
          </Section>

          <Section title="6. Cookies et stockage local">
            <Text>
              Unilien utilise exclusivement des <strong>cookies strictement nécessaires</strong> au
              fonctionnement de l&apos;application. Aucun cookie publicitaire, analytique ou de suivi
              n&apos;est déposé.
            </Text>
            <Box bg="bg.surface" borderWidth="1px" borderColor="border.default" borderRadius="10px" overflow="hidden">
              <Flex bg="bg.muted" px={4} py={2} fontWeight="700" fontSize="xs" color="text.default" gap={4}>
                <Text flex={1}>Nom</Text>
                <Text flex={1}>Type</Text>
                <Text flex={2}>Finalité</Text>
              </Flex>
              {[
                { name: 'sb-*-auth-token', type: 'Cookie', desc: 'Session d\'authentification Supabase' },
                { name: 'unilien-apparence', type: 'localStorage', desc: 'Préférences d\'affichage (thème sombre, densité)' },
                { name: 'unilien-cookie-consent', type: 'localStorage', desc: 'Enregistrement de votre choix concernant ce bandeau' },
                { name: 'unilien-convention', type: 'localStorage', desc: 'Paramètres de convention collective' },
                { name: 'unilien-accessibilite', type: 'localStorage', desc: 'Préférences d\'accessibilité' },
              ].map((c) => (
                <Flex key={c.name} px={4} py={2} fontSize="xs" color="text.inactive" gap={4} borderTopWidth="1px" borderColor="border.default">
                  <Text flex={1} fontFamily="mono" fontWeight="600" color="text.default">{c.name}</Text>
                  <Text flex={1}>{c.type}</Text>
                  <Text flex={2}>{c.desc}</Text>
                </Flex>
              ))}
            </Box>
            <Text>
              Ces cookies et données de stockage local sont exemptés de consentement préalable
              conformément aux recommandations de la{' '}
              <Link href="https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/les-solutions-pour-les-cookies-de-fonctionnalite" color="brand.solid" target="_blank" rel="noopener noreferrer">
                CNIL
              </Link>{' '}
              (cookies fonctionnels strictement nécessaires).
            </Text>
          </Section>

          <Section title="7. Sécurité">
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li">Chiffrement en transit (HTTPS/TLS) sur toutes les communications</Box>
              <Box as="li">Authentification gérée par Supabase Auth (JWT)</Box>
              <Box as="li">Contrôle d&apos;accès par rôle (employeur, employé, auxiliaire) via Row Level Security</Box>
              <Box as="li">Sanitisation des entrées utilisateur (DOMPurify) avant toute écriture en base</Box>
              <Box as="li">Journalisation des accès sans données personnelles</Box>
            </Box>
          </Section>

          <Section title="8. Propriété intellectuelle">
            <Text>
              L&apos;ensemble du contenu de l&apos;application Unilien (code source, interface, textes, logos)
              est protégé par le droit d&apos;auteur. Toute reproduction, même partielle, est interdite
              sans autorisation préalable.
            </Text>
          </Section>

          <Section title="9. Droit applicable">
            <Text>
              Les présentes mentions légales sont soumises au droit français.
              En cas de litige, les tribunaux français seront seuls compétents.
            </Text>
          </Section>

        </Stack>

        {/* Footer */}
        <Flex justify="center" mt={12} mb={4}>
          <Link as={RouterLink} to="/" color="brand.solid" fontSize="sm" fontWeight="600">
            ← Retour à l&apos;accueil
          </Link>
        </Flex>
      </Container>
    </Box>
  )
}
