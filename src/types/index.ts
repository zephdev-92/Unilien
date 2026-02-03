// Types de base pour Unilien

// Rôles utilisateur
export type UserRole = 'employer' | 'employee' | 'caregiver'

// Profil utilisateur
export interface Profile {
  id: string
  role: UserRole
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatarUrl?: string
  accessibilitySettings: AccessibilitySettings
  createdAt: Date
  updatedAt: Date
}

// Paramètres d'accessibilité
export interface AccessibilitySettings {
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
  screenReaderOptimized: boolean
  voiceControlEnabled: boolean
}

// Employeur
export interface Employer {
  profileId: string
  address: Address
  handicapType?: string
  handicapName?: string
  specificNeeds?: string
  cesuNumber?: string
  pchBeneficiary: boolean
  pchMonthlyAmount?: number
  emergencyContacts: EmergencyContact[]
}

// Auxiliaire de vie
export interface Employee {
  profileId: string
  qualifications: string[]
  languages: string[]
  maxDistanceKm?: number
  availabilityTemplate: AvailabilityTemplate
}

// Types de relation aidant
export type CaregiverRelationship =
  | 'parent'
  | 'child'
  | 'spouse'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'friend'
  | 'neighbor'
  | 'legal_guardian'
  | 'curator'
  | 'other'

// Statut juridique aidant
export type CaregiverLegalStatus =
  | 'none'
  | 'tutor'
  | 'curator'
  | 'safeguard_justice'
  | 'family_caregiver'

// Aidant familial
export interface Caregiver {
  profileId: string
  employerId: string
  permissions: CaregiverPermissions
  permissionsLocked?: boolean // true si tuteur/curateur - permissions non modifiables
  relationship?: CaregiverRelationship
  relationshipDetails?: string
  legalStatus?: CaregiverLegalStatus
  address?: Address
  emergencyPhone?: string
  availabilityHours?: string
  canReplaceEmployer?: boolean
  createdAt: Date
}

// Permissions aidant
export interface CaregiverPermissions {
  canViewPlanning: boolean
  canEditPlanning: boolean
  canViewLiaison: boolean
  canWriteLiaison: boolean
  canManageTeam: boolean
  canExportData: boolean
}

// Adresse
export interface Address {
  street: string
  city: string
  postalCode: string
  country: string
  coordinates?: {
    lat: number
    lng: number
  }
}

// Contact d'urgence
export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
}

// Modèle de disponibilité
export interface AvailabilityTemplate {
  monday: TimeSlot[]
  tuesday: TimeSlot[]
  wednesday: TimeSlot[]
  thursday: TimeSlot[]
  friday: TimeSlot[]
  saturday: TimeSlot[]
  sunday: TimeSlot[]
}

export interface TimeSlot {
  startTime: string // "09:00"
  endTime: string // "17:00"
}

// Contrat
export interface Contract {
  id: string
  employerId: string
  employeeId: string
  contractType: 'CDI' | 'CDD'
  startDate: Date
  endDate?: Date
  weeklyHours: number
  hourlyRate: number
  status: 'active' | 'terminated' | 'suspended'
  createdAt: Date
  updatedAt: Date
}

// Intervention (Shift)
export interface Shift {
  id: string
  contractId: string
  date: Date
  startTime: string
  endTime: string
  breakDuration: number // minutes
  tasks: string[]
  notes?: string
  status: 'planned' | 'completed' | 'cancelled' | 'absent'
  computedPay: ComputedPay
  validatedByEmployer: boolean
  validatedByEmployee: boolean
  createdAt: Date
  updatedAt: Date
}

// Calcul de paie
export interface ComputedPay {
  basePay: number
  sundayMajoration: number
  holidayMajoration: number
  nightMajoration: number
  overtimeMajoration: number
  totalPay: number
}

// Entrée cahier de liaison
export interface LogEntry {
  id: string
  employerId: string
  authorId: string
  authorRole: UserRole
  type: 'info' | 'alert' | 'incident' | 'instruction'
  importance: 'normal' | 'urgent'
  content: string
  audioUrl?: string
  attachments: Attachment[]
  recipientId?: string
  readBy: string[]
  createdAt: Date
  updatedAt: Date
}

// Pièce jointe
export interface Attachment {
  id: string
  url: string
  type: 'image' | 'document' | 'audio'
  name: string
  size: number
}

// Absence
export interface Absence {
  id: string
  employeeId: string
  absenceType: 'sick' | 'vacation' | 'training' | 'unavailable' | 'emergency'
  startDate: Date
  endDate: Date
  reason?: string
  justificationUrl?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

// Types de notification
export type NotificationType =
  | 'compliance_critical'      // Violation critique de conformité
  | 'compliance_warning'       // Avertissement de conformité (approche seuil)
  | 'compliance_resolved'      // Violation résolue
  | 'shift_created'           // Nouvelle intervention créée
  | 'shift_cancelled'         // Intervention annulée
  | 'shift_reminder'          // Rappel intervention à venir
  | 'message_received'        // Nouveau message liaison
  | 'team_member_added'       // Nouvel aidant ajouté à l'équipe
  | 'team_member_removed'     // Aidant retiré de l'équipe
  | 'contract_created'        // Nouveau contrat créé
  | 'contract_terminated'     // Contrat terminé
  | 'logbook_urgent'          // Entrée urgente au cahier de liaison
  | 'logbook_entry_directed'  // Entrée cahier destinée à un membre spécifique
  | 'permissions_updated'     // Permissions aidant modifiées
  | 'shift_modified'          // Intervention modifiée (horaire/date)
  | 'absence_requested'       // Demande d'absence reçue
  | 'absence_resolved'        // Absence approuvée ou refusée
  | 'system'                  // Notification système

// Priorité de notification
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

// Notification
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  data: NotificationData
  actionUrl?: string
  isRead: boolean
  isDismissed: boolean
  createdAt: Date
  readAt?: Date
  expiresAt?: Date
}

// Données structurées de notification
export interface NotificationData {
  // Compliance-related
  employeeId?: string
  employeeName?: string
  violationType?: string
  currentValue?: number
  threshold?: number
  affectedDate?: string
  shiftId?: string
  // Message-related
  senderId?: string
  senderName?: string
  messagePreview?: string
  // Generic
  [key: string]: unknown
}

// Préférences de notification utilisateur
export interface NotificationPreferences {
  emailEnabled: boolean
  pushEnabled: boolean
  complianceAlerts: boolean
  shiftReminders: boolean
  messageNotifications: boolean
  reminderHoursBefore: number
}

// Résultat validation conformité
export interface ComplianceResult {
  valid: boolean
  errors: ComplianceError[]
  warnings: ComplianceWarning[]
}

export interface ComplianceError {
  code: string
  message: string
  rule: string
  blocking: boolean
}

export interface ComplianceWarning {
  code: string
  message: string
  rule: string
}

// Message de liaison (chat en temps réel)
export interface LiaisonMessage {
  id: string
  employerId: string
  senderId: string
  senderRole: UserRole
  content: string
  audioUrl?: string
  attachments: Attachment[]
  isEdited: boolean
  readBy: string[]
  createdAt: Date
  updatedAt: Date
}

export interface LiaisonMessageWithSender extends LiaisonMessage {
  sender?: {
    firstName: string
    lastName: string
    avatarUrl?: string
  }
}

// État authentification
export interface AuthState {
  user: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}
