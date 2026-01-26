/**
 * Aide contextuelle pour les règles de conformité
 */

import { COMPLIANCE_RULES } from '@/lib/compliance/types'

type ComplianceRuleCode = (typeof COMPLIANCE_RULES)[keyof typeof COMPLIANCE_RULES]

interface RuleHelp {
  title: string
  description: string
  limit: string
  tip: string
}

const RULE_HELP: Record<ComplianceRuleCode, RuleHelp> = {
  [COMPLIANCE_RULES.DAILY_REST]: {
    title: 'Repos quotidien',
    description: 'Temps de repos minimum entre deux interventions',
    limit: '11 heures consécutives',
    tip: 'Décalez l\'heure de début de la prochaine intervention',
  },
  [COMPLIANCE_RULES.WEEKLY_REST]: {
    title: 'Repos hebdomadaire',
    description: 'Repos consécutif obligatoire chaque semaine',
    limit: '35 heures consécutives',
    tip: 'Prévoyez au moins 1,5 jour de repos consécutif',
  },
  [COMPLIANCE_RULES.MANDATORY_BREAK]: {
    title: 'Pause obligatoire',
    description: 'Pause requise pour les longues interventions',
    limit: '20 min si > 6h de travail',
    tip: 'Ajoutez une pause dans les détails de l\'intervention',
  },
  [COMPLIANCE_RULES.WEEKLY_MAX_HOURS]: {
    title: 'Maximum hebdomadaire',
    description: 'Limite du temps de travail par semaine',
    limit: '48 heures maximum',
    tip: 'Reportez des heures à la semaine suivante',
  },
  [COMPLIANCE_RULES.DAILY_MAX_HOURS]: {
    title: 'Maximum quotidien',
    description: 'Limite du temps de travail par jour',
    limit: '10 heures maximum',
    tip: 'Réduisez la durée ou fractionnez en plusieurs jours',
  },
  [COMPLIANCE_RULES.SHIFT_OVERLAP]: {
    title: 'Chevauchement',
    description: 'Deux interventions ne peuvent pas se chevaucher',
    limit: 'Aucun chevauchement autorisé',
    tip: 'Modifiez les horaires pour éviter le conflit',
  },
}

/**
 * Retourne l'aide pour une règle donnée
 */
export function getRuleHelp(ruleCode: ComplianceRuleCode): RuleHelp | null {
  return RULE_HELP[ruleCode] || null
}

/**
 * Retourne le conseil pour résoudre une erreur
 */
export function getRuleTip(ruleCode: ComplianceRuleCode): string {
  return RULE_HELP[ruleCode]?.tip || 'Vérifiez les paramètres de l\'intervention'
}

export type { RuleHelp, ComplianceRuleCode }
