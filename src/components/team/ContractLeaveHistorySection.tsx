import { Box, Flex, Text, Separator } from '@chakra-ui/react'
import { AccessibleInput } from '@/components/ui'
import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import type { ContractFormData } from '@/lib/validation/contractSchemas'

interface LeavePreview {
  acquired: number
  taken: number
  balance: number
}

interface ContractLeaveHistorySectionProps {
  leaveYearInfo: { startLabel: string; endLabel: string }
  suggestedMonths: number
  leavePreview: LeavePreview
  register: UseFormRegister<ContractFormData>
  errors: FieldErrors<ContractFormData>
}

export function ContractLeaveHistorySection({
  leaveYearInfo,
  suggestedMonths,
  leavePreview,
  register,
  errors,
}: ContractLeaveHistorySectionProps) {
  return (
    <>
      <Separator />
      <Box p={4} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
        <Text fontWeight="semibold" mb={1} color="blue.700">
          Reprise de l'historique congés
        </Text>
        <Text fontSize="sm" color="gray.600" mb={1}>
          La date de début est antérieure à aujourd'hui. Renseignez l'historique pour un solde de
          congés correct.
        </Text>
        <Text fontSize="xs" color="blue.600" mb={4}>
          Année de congés en cours : {leaveYearInfo.startLabel} au {leaveYearInfo.endLabel}
        </Text>

        <Flex gap={4}>
          <Box flex={1}>
            <AccessibleInput
              label="Mois travaillés"
              type="number"
              min={0}
              max={12}
              helperText={`Suggestion : ${suggestedMonths} mois`}
              error={errors.monthsWorked?.message}
              {...register('monthsWorked')}
            />
          </Box>
          <Box flex={1}>
            <AccessibleInput
              label="CP déjà pris (jours)"
              type="number"
              min={0}
              max={30}
              helperText="Jours de congés déjà utilisés"
              error={errors.initialTakenDays?.message}
              {...register('initialTakenDays')}
            />
          </Box>
        </Flex>

        <Box mt={3} p={3} bg="white" borderRadius="md">
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Solde de congés calculé :
          </Text>
          <Flex justify="space-between">
            <Text fontSize="sm" color="gray.600">
              Acquis : <Text as="span" fontWeight="bold">{leavePreview.acquired} j</Text>
            </Text>
            <Text fontSize="sm" color="gray.600">
              Pris : <Text as="span" fontWeight="bold">{leavePreview.taken} j</Text>
            </Text>
            <Text
              fontSize="sm"
              fontWeight="bold"
              color={leavePreview.balance >= 0 ? 'green.600' : 'red.600'}
            >
              Solde : {leavePreview.balance} j
            </Text>
          </Flex>
        </Box>

        <Text fontSize="xs" color="gray.500" mt={3} fontStyle="italic">
          Les informations saisies engagent votre responsabilité en tant qu'employeur. En cas de
          doute, référez-vous aux bulletins de salaire précédents.
        </Text>
      </Box>
    </>
  )
}
