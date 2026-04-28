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

export default function TermsPage() {
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
            Conditions d&apos;utilisation
          </Text>
          <Text fontSize="sm" color="text.inactive" mt={1}>
            Dernière mise à jour : avril 2026 — brouillon, projet en développement
          </Text>
        </Container>
      </Box>

      {/* Content */}
      <Container maxW="800px" py={8}>
        <Stack gap={8}>

          <Section title="1. Objet">
            <Text>
              Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») ont pour objet
              de définir les modalités d&apos;accès et d&apos;utilisation du service <strong>Unilien</strong>{' '}
              (ci-après « le Service »), application web de gestion de soins pour personnes en
              situation de handicap.
            </Text>
            <Text>
              Le Service est édité par l&apos;équipe Unilien et accessible à l&apos;adresse{' '}
              <Link href="https://unilien.app" color="brand.solid">unilien.app</Link>.
              Voir les <Link as={RouterLink} to="/mentions-legales" color="brand.solid">mentions légales</Link>{' '}
              pour les coordonnées complètes de l&apos;éditeur.
            </Text>
          </Section>

          <Section title="2. Acceptation des CGU">
            <Text>
              L&apos;utilisation du Service implique l&apos;acceptation pleine et entière des présentes CGU.
              L&apos;utilisateur reconnaît en avoir pris connaissance lors de la création de son compte
              et s&apos;engage à les respecter.
            </Text>
            <Text>
              L&apos;éditeur se réserve le droit de modifier les CGU à tout moment. Les utilisateurs
              seront informés des modifications substantielles. La poursuite de l&apos;utilisation du
              Service après notification vaut acceptation des nouvelles conditions.
            </Text>
          </Section>

          <Section title="3. Accès au Service">
            <Text>
              Le Service est destiné aux trois profils d&apos;utilisateurs suivants :
            </Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li"><strong>Employeurs particuliers</strong> — personnes en situation de handicap ou leur représentant légal, employant un ou plusieurs auxiliaires de vie</Box>
              <Box as="li"><strong>Auxiliaires de vie / employés</strong> — personnel intervenant au domicile, dans le cadre d&apos;un contrat de travail régi par la convention collective IDCC 3239</Box>
              <Box as="li"><strong>Aidants familiaux</strong> — proches autorisés à consulter ou gérer le planning au nom de l&apos;employeur</Box>
            </Box>
            <Text>
              La création de compte est gratuite et nécessite la fourniture d&apos;une adresse email
              valide ainsi que d&apos;informations exactes (nom, prénom, rôle).
            </Text>
          </Section>

          <Section title="4. Engagements de l'utilisateur">
            <Text>L&apos;utilisateur s&apos;engage à :</Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li">Fournir des informations exactes, complètes et à jour</Box>
              <Box as="li">Préserver la confidentialité de ses identifiants de connexion</Box>
              <Box as="li">Ne pas utiliser le Service à des fins illicites, frauduleuses ou contraires à l&apos;ordre public</Box>
              <Box as="li">Respecter les droits et la vie privée des autres utilisateurs</Box>
              <Box as="li">Ne pas tenter de contourner les mesures de sécurité ni d&apos;accéder aux données d&apos;autres utilisateurs sans autorisation</Box>
              <Box as="li">Recueillir le consentement explicite des personnes concernées avant la saisie de leurs données personnelles</Box>
            </Box>
          </Section>

          <Section title="5. Données saisies par l'utilisateur">
            <Text>
              L&apos;utilisateur reste responsable des données qu&apos;il saisit dans le Service, notamment
              concernant les tiers (auxiliaires, aidants, données de santé). Il s&apos;assure d&apos;avoir
              recueilli les consentements nécessaires.
            </Text>
            <Text>
              Le traitement des données personnelles est détaillé dans la{' '}
              <Link as={RouterLink} to="/politique-confidentialite" color="brand.solid">
                politique de confidentialité
              </Link>.
            </Text>
          </Section>

          <Section title="6. Disponibilité du Service">
            <Text>
              Le Service est accessible 24h/24 et 7j/7, sous réserve d&apos;interruptions pour maintenance,
              de pannes éventuelles ou de cas de force majeure. L&apos;éditeur ne saurait être tenu
              responsable des dommages liés à une indisponibilité temporaire.
            </Text>
            <Text>
              <strong>Note :</strong> Unilien est actuellement en phase de développement.
              Des évolutions, corrections et changements de fonctionnalités peuvent intervenir
              régulièrement. Les utilisateurs sont invités à signaler tout dysfonctionnement à{' '}
              <Link href="mailto:contact@unilien.app" color="brand.solid">contact@unilien.app</Link>.
            </Text>
          </Section>

          <Section title="7. Propriété intellectuelle">
            <Text>
              L&apos;ensemble des éléments composant le Service (code source, design, marques, textes,
              images, logos) est protégé par le droit de la propriété intellectuelle. Toute
              reproduction, représentation ou exploitation sans autorisation préalable est interdite.
            </Text>
            <Text>
              Les données saisies par l&apos;utilisateur lui appartiennent. Il en conserve la propriété
              et peut les exporter ou les supprimer à tout moment depuis les Paramètres.
            </Text>
          </Section>

          <Section title="8. Limitation de responsabilité">
            <Text>
              Le Service est fourni « en l&apos;état », sans garantie de fonctionnement parfait. L&apos;éditeur
              s&apos;efforce de fournir un service fiable mais ne peut garantir une absence totale d&apos;erreurs.
            </Text>
            <Text>
              L&apos;éditeur ne saurait être tenu responsable :
            </Text>
            <Box as="ul" pl={5} listStyleType="disc">
              <Box as="li">Des dommages directs ou indirects résultant de l&apos;utilisation du Service</Box>
              <Box as="li">Des erreurs ou inexactitudes dans les données saisies par les utilisateurs</Box>
              <Box as="li">Des conséquences juridiques liées à un usage non conforme à la convention collective IDCC 3239 ou à la réglementation du travail</Box>
              <Box as="li">Des pertes de données dues à un cas de force majeure ou à un usage incorrect</Box>
            </Box>
            <Text>
              Les fonctionnalités d&apos;aide à la conformité (compliance, calcul de paie, génération
              CESU) sont fournies à titre indicatif. L&apos;utilisateur reste seul responsable du respect
              de ses obligations légales.
            </Text>
          </Section>

          <Section title="9. Suspension et résiliation">
            <Text>
              L&apos;utilisateur peut supprimer son compte à tout moment depuis les Paramètres
              (Zone de danger → Supprimer mon compte). Cette action est irréversible et entraîne
              la suppression définitive de toutes ses données.
            </Text>
            <Text>
              L&apos;éditeur se réserve le droit de suspendre ou résilier l&apos;accès au Service en cas
              de manquement grave aux présentes CGU, après notification préalable lorsque cela est
              possible.
            </Text>
          </Section>

          <Section title="10. Droit applicable et juridiction">
            <Text>
              Les présentes CGU sont régies par le droit français. Tout litige relatif à
              l&apos;interprétation ou à l&apos;exécution des CGU sera soumis aux tribunaux français
              compétents, après tentative de résolution amiable.
            </Text>
          </Section>

          <Section title="11. Contact">
            <Text>
              Pour toute question relative aux présentes CGU, vous pouvez nous contacter à{' '}
              <Link href="mailto:contact@unilien.app" color="brand.solid">contact@unilien.app</Link>.
            </Text>
          </Section>

        </Stack>
      </Container>
    </Box>
  )
}
