import { Box, Stack, Flex, Text, Switch } from '@chakra-ui/react'
import { AccessibleSelect } from '@/components/ui'
import type { DriversLicense } from '@/types'

const LICENSE_TYPE_OPTIONS = [
  { value: 'B', label: 'Permis B (voiture)' },
  { value: 'A', label: 'Permis A (moto)' },
  { value: 'C', label: 'Permis C (poids lourd)' },
  { value: 'D', label: 'Permis D (transport en commun)' },
  { value: 'BE', label: 'Permis BE (remorque)' },
  { value: 'other', label: 'Autre' },
]

interface Props {
  driversLicense: DriversLicense
  onChange: (dl: DriversLicense) => void
}

export function DriversLicenseSubSection({ driversLicense, onChange }: Props) {
  return (
    <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" p={6}>
      <Text fontSize="xl" fontWeight="semibold" mb={2}>Permis de conduire</Text>
      <Text fontSize="sm" color="gray.600" mb={4}>
        Indiquez si vous possédez le permis et un véhicule
      </Text>

      <Stack gap={4}>
        <Flex
          justify="space-between"
          align="center"
          p={4}
          bg="gray.50"
          borderRadius="md"
          borderWidth="1px"
          borderColor="gray.200"
        >
          <Text fontWeight="medium">Je possède le permis de conduire</Text>
          <Switch.Root
            checked={driversLicense.hasLicense}
            onCheckedChange={(details) =>
              onChange({
                ...driversLicense,
                hasLicense: details.checked,
                licenseType: details.checked ? driversLicense.licenseType : undefined,
                hasVehicle: details.checked ? driversLicense.hasVehicle : false,
              })
            }
          >
            <Switch.HiddenInput aria-label="J'ai le permis de conduire" />
            <Switch.Control><Switch.Thumb /></Switch.Control>
          </Switch.Root>
        </Flex>

        {driversLicense.hasLicense && (
          <>
            <AccessibleSelect
              label="Type de permis"
              options={LICENSE_TYPE_OPTIONS}
              placeholder="Sélectionnez le type de permis"
              value={driversLicense.licenseType || ''}
              onChange={(e) =>
                onChange({
                  ...driversLicense,
                  licenseType: e.target.value as DriversLicense['licenseType'],
                })
              }
            />

            <Flex
              justify="space-between"
              align="center"
              p={4}
              bg="gray.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="gray.200"
            >
              <Box>
                <Text fontWeight="medium">Je dispose d'un véhicule personnel</Text>
                <Text fontSize="sm" color="gray.600">
                  Vous pouvez vous déplacer de manière autonome
                </Text>
              </Box>
              <Switch.Root
                checked={driversLicense.hasVehicle}
                onCheckedChange={(details) =>
                  onChange({ ...driversLicense, hasVehicle: details.checked })
                }
              >
                <Switch.HiddenInput aria-label="J'ai un véhicule personnel" />
                <Switch.Control><Switch.Thumb /></Switch.Control>
              </Switch.Root>
            </Flex>
          </>
        )}
      </Stack>
    </Box>
  )
}
