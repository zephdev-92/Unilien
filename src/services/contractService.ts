import { supabase } from '@/lib/supabase/client'
import type { Contract } from '@/types'

export interface ContractWithEmployee extends Contract {
  employee?: {
    firstName: string
    lastName: string
  }
}

export async function getContractById(contractId: string): Promise<Contract | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single()

  if (error) {
    console.error('Erreur récupération contrat:', error)
    return null
  }

  return mapContractFromDb(data)
}

export async function getContractsForEmployer(
  employerId: string
): Promise<ContractWithEmployee[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      employee:profiles!employee_id(
        first_name,
        last_name
      )
    `)
    .eq('employer_id', employerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur récupération contrats:', error)
    return []
  }

  return (data || []).map(mapContractFromDb)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContractFromDb(data: any): ContractWithEmployee {
  return {
    id: data.id,
    employerId: data.employer_id,
    employeeId: data.employee_id,
    contractType: data.contract_type,
    startDate: new Date(data.start_date),
    endDate: data.end_date ? new Date(data.end_date) : undefined,
    weeklyHours: data.weekly_hours,
    hourlyRate: data.hourly_rate,
    status: data.status,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    employee: data.employee
      ? {
          firstName: data.employee.first_name,
          lastName: data.employee.last_name,
        }
      : undefined,
  }
}
