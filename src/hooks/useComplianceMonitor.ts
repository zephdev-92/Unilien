import { useEffect, useRef, useCallback } from 'react'
import { getWeeklyComplianceOverview } from '@/services/complianceService'
import {
  createComplianceWarningNotification,
  createComplianceCriticalNotification,
  COMPLIANCE_THRESHOLDS,
} from '@/services/notificationService'

// ============================================
// TYPES
// ============================================

export interface UseComplianceMonitorOptions {
  /** Employer ID to monitor */
  employerId: string | null
  /** User ID to send notifications to */
  userId: string | null
  /** Whether monitoring is enabled */
  enabled?: boolean
  /** Polling interval in milliseconds (default: 5 minutes) */
  pollingInterval?: number
}

interface TrackedViolation {
  employeeId: string
  type: string
  severity: 'warning' | 'critical'
  timestamp: number
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useComplianceMonitor(options: UseComplianceMonitorOptions): void {
  const {
    employerId,
    userId,
    enabled = true,
    pollingInterval = 5 * 60 * 1000, // 5 minutes default
  } = options

  // Track which violations we've already notified about
  // to avoid duplicate notifications
  const trackedViolationsRef = useRef<Map<string, TrackedViolation>>(new Map())

  // Generate unique key for a violation
  const getViolationKey = useCallback(
    (employeeId: string, type: string, severity: string) => {
      return `${employeeId}:${type}:${severity}`
    },
    []
  )

  // Check if we should create a notification
  const shouldNotify = useCallback(
    (employeeId: string, type: string, severity: 'warning' | 'critical') => {
      const key = getViolationKey(employeeId, type, severity)
      const tracked = trackedViolationsRef.current.get(key)

      // If not tracked, we should notify
      if (!tracked) return true

      // If tracked more than 1 hour ago, notify again
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      return tracked.timestamp < oneHourAgo
    },
    [getViolationKey]
  )

  // Mark violation as notified
  const markNotified = useCallback(
    (employeeId: string, type: string, severity: 'warning' | 'critical') => {
      const key = getViolationKey(employeeId, type, severity)
      trackedViolationsRef.current.set(key, {
        employeeId,
        type,
        severity,
        timestamp: Date.now(),
      })
    },
    [getViolationKey]
  )

  // Check compliance and create notifications
  const checkCompliance = useCallback(async () => {
    if (!employerId || !userId) return

    try {
      const overview = await getWeeklyComplianceOverview(employerId)

      for (const employee of overview.employees) {
        const employeeName = employee.employeeName

        // Check weekly hours
        if (employee.currentWeekHours >= COMPLIANCE_THRESHOLDS.WEEKLY_HOURS_CRITICAL) {
          // Critical: exceeded 48h
          if (shouldNotify(employee.employeeId, 'weekly_hours', 'critical')) {
            await createComplianceCriticalNotification(
              userId,
              employeeName,
              'weekly_hours',
              employee.currentWeekHours,
              COMPLIANCE_THRESHOLDS.WEEKLY_HOURS_CRITICAL,
              new Date()
            )
            markNotified(employee.employeeId, 'weekly_hours', 'critical')
          }
        } else if (employee.currentWeekHours >= COMPLIANCE_THRESHOLDS.WEEKLY_HOURS_WARNING) {
          // Warning: approaching 48h (at 44h)
          if (shouldNotify(employee.employeeId, 'weekly_hours', 'warning')) {
            await createComplianceWarningNotification(
              userId,
              employeeName,
              'weekly_hours',
              employee.currentWeekHours,
              COMPLIANCE_THRESHOLDS.WEEKLY_HOURS_WARNING,
              new Date()
            )
            markNotified(employee.employeeId, 'weekly_hours', 'warning')
          }
        }

        // Check daily hours (remaining <= 0 or <= 2)
        if (employee.remainingDailyHours <= 0) {
          // Critical: exceeded 10h today
          if (shouldNotify(employee.employeeId, 'daily_hours', 'critical')) {
            await createComplianceCriticalNotification(
              userId,
              employeeName,
              'daily_hours',
              COMPLIANCE_THRESHOLDS.DAILY_HOURS_CRITICAL - employee.remainingDailyHours,
              COMPLIANCE_THRESHOLDS.DAILY_HOURS_CRITICAL,
              new Date()
            )
            markNotified(employee.employeeId, 'daily_hours', 'critical')
          }
        } else if (employee.remainingDailyHours <= 2) {
          // Warning: only 2h remaining today
          if (shouldNotify(employee.employeeId, 'daily_hours', 'warning')) {
            await createComplianceWarningNotification(
              userId,
              employeeName,
              'daily_hours',
              COMPLIANCE_THRESHOLDS.DAILY_HOURS_CRITICAL - employee.remainingDailyHours,
              COMPLIANCE_THRESHOLDS.DAILY_HOURS_WARNING,
              new Date()
            )
            markNotified(employee.employeeId, 'daily_hours', 'warning')
          }
        }

        // Check weekly rest
        if (!employee.weeklyRestStatus.isCompliant) {
          const restHours = employee.weeklyRestStatus.longestRest
          if (restHours < COMPLIANCE_THRESHOLDS.WEEKLY_REST_MINIMUM) {
            // Critical: weekly rest violation
            if (shouldNotify(employee.employeeId, 'weekly_rest', 'critical')) {
              await createComplianceCriticalNotification(
                userId,
                employeeName,
                'weekly_rest',
                restHours,
                COMPLIANCE_THRESHOLDS.WEEKLY_REST_MINIMUM,
                new Date()
              )
              markNotified(employee.employeeId, 'weekly_rest', 'critical')
            }
          }
        }

        // Check for alerts from the compliance service
        for (const alert of employee.alerts) {
          if (alert.type === 'daily_rest' && alert.severity === 'critical') {
            if (shouldNotify(employee.employeeId, 'daily_rest', 'critical')) {
              await createComplianceCriticalNotification(
                userId,
                employeeName,
                'daily_rest',
                0, // Will be filled from alert message
                COMPLIANCE_THRESHOLDS.DAILY_REST_MINIMUM,
                new Date()
              )
              markNotified(employee.employeeId, 'daily_rest', 'critical')
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur surveillance conformité:', error)
    }
  }, [employerId, userId, shouldNotify, markNotified])

  // Run initial check and set up polling
  useEffect(() => {
    if (!enabled || !employerId || !userId) return

    // Initial check
    checkCompliance()

    // Set up polling
    const intervalId = setInterval(checkCompliance, pollingInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [enabled, employerId, userId, pollingInterval, checkCompliance])

  // Clean up old tracked violations periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000

      trackedViolationsRef.current.forEach((violation, key) => {
        if (violation.timestamp < oneHourAgo) {
          trackedViolationsRef.current.delete(key)
        }
      })
    }, 10 * 60 * 1000) // Clean up every 10 minutes

    return () => clearInterval(cleanupInterval)
  }, [])
}

export default useComplianceMonitor
