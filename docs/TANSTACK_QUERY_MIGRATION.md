# Migration vers TanStack Query (useQuery)

> **Statut** : En attente — TanStack Query a été supprimé du projet le 24/02/2026 (chore/remove-tanstack-query).
> Ce document décrit comment effectuer la migration si elle est décidée à l'avenir.

---

## Pourquoi migrer ?

Tous les hooks data-fetching du projet utilisent le pattern manuel `useEffect + useState` :

```ts
const [data, setData] = useState(null)
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  setIsLoading(true)
  monService.getData(id)
    .then(setData)
    .catch(setError)
    .finally(() => setIsLoading(false))
}, [id])
```

TanStack Query remplace ce boilerplate par :

```ts
const { data, isLoading, error } = useQuery({
  queryKey: ['contracts', employerId],
  queryFn: () => contractService.getContracts(employerId),
})
```

**Bénéfices** :
- Cache automatique par `queryKey` — pas de double fetch si le même composant est monté deux fois
- Deduplication — deux composants qui demandent les mêmes données en même temps font une seule requête
- `staleTime` configurable — évite les refetch inutiles
- `refetchOnWindowFocus` — les données se rafraîchissent quand l'utilisateur revient sur l'onglet (configurable)
- Invalidation manuelle — `queryClient.invalidateQueries(['contracts'])` après un write force un refetch
- États plus fins : `isFetching`, `isRefetching`, `isStale`

---

## Pré-requis

Réinstaller la dépendance :

```bash
npm install @tanstack/react-query
```

Restaurer la configuration dans `src/main.tsx` :

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Wrapper autour de <App /> :
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

---

## Hooks à migrer (8 hooks)

| Hook | Fichier | Service appelé | queryKey suggéré |
|------|---------|----------------|------------------|
| `useShiftValidationData` | `hooks/useShiftValidationData.ts` | `getContractsForEmployer`, `getShifts`, `getAbsencesForEmployer` | `['contracts', employerId]`, `['shifts', employerId, start, end]`, `['absences', employerId]` |
| `useComplianceCheck` | `hooks/useComplianceCheck.ts` | `getContractsForEmployer` | `['contracts', employerId]` |
| `useComplianceMonitor` | `hooks/useComplianceMonitor.ts` | `getShifts`, `getContractsForEmployer` | `['shifts', employerId]`, `['contracts', employerId]` |
| `useShiftReminders` | `hooks/useShiftReminders.ts` | `getShifts` | `['shifts', employerId, date]` |
| `useEmployerResolution` | `hooks/useEmployerResolution.ts` | `contractService` | `['employer-id', userId, role]` |
| `useNotifications` | `hooks/useNotifications.ts` | `getNotifications`, `getUnreadNotificationCount` | `['notifications', userId]` |
| `usePushNotifications` | `hooks/usePushNotifications.ts` | `pushService` | `['push-subscription', userId]` |
| `useAuth` | `hooks/useAuth.ts` | `profileService` | `['profile', userId]` |

---

## Exemple concret — `useShiftValidationData`

### Avant (pattern actuel)

```ts
export function useShiftValidationData({ isOpen, employerId, defaultDate }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!isOpen || !employerId) return

    dispatch({ type: 'LOAD_START' })

    getContractsForEmployer(employerId)
      .then((contracts) => dispatch({ type: 'CONTRACTS_LOADED', contracts }))
      .catch(() => dispatch({ type: 'CONTRACTS_LOADED', contracts: [] }))

    // ... idem pour shifts et absences
  }, [isOpen, employerId, defaultDate])

  return { contracts, existingShifts, approvedAbsences, isLoadingContracts }
}
```

### Après (avec useQuery)

```ts
import { useQuery } from '@tanstack/react-query'

export function useShiftValidationData({ isOpen, employerId, defaultDate }) {
  const centerDate = defaultDate ?? new Date()
  const startDate = new Date(centerDate)
  startDate.setDate(startDate.getDate() - 28)
  const endDate = new Date(centerDate)
  endDate.setDate(endDate.getDate() + 28)

  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery({
    queryKey: ['contracts', employerId],
    queryFn: () => getContractsForEmployer(employerId),
    enabled: isOpen && !!employerId,
  })

  const { data: shiftsRaw = [] } = useQuery({
    queryKey: ['shifts', employerId, startDate.toISOString(), endDate.toISOString()],
    queryFn: () => getShifts(employerId, 'employer', startDate, endDate),
    enabled: isOpen && !!employerId,
  })

  const { data: absences = [] } = useQuery({
    queryKey: ['absences', employerId],
    queryFn: () => getAbsencesForEmployer(employerId),
    enabled: isOpen && !!employerId,
    select: (data) => data
      .filter((a) => a.status === 'approved')
      .map((a) => ({ ...a, startDate: new Date(a.startDate), endDate: new Date(a.endDate) })),
  })

  const existingShifts: ShiftForValidation[] = shiftsRaw.map((s) => ({
    id: s.id,
    contractId: s.contractId,
    employeeId: '',
    date: new Date(s.date),
    startTime: s.startTime,
    endTime: s.endTime,
    breakDuration: s.breakDuration,
    shiftType: s.shiftType,
  }))

  return { contracts, existingShifts, approvedAbsences: absences, isLoadingContracts }
}
```

**Avantage principal** : si `NewShiftModal` et `ShiftDetailModal` s'ouvrent en même temps pour le même `employerId`, les contrats ne sont fetchés **qu'une seule fois** (cache partagé par `queryKey`).

---

## Stratégie de migration recommandée

Migrer hook par hook, en commençant par les plus simples :

1. `useEmployerResolution` — 1 seul fetch, pas de realtime
2. `useShiftReminders` — 1 fetch simple
3. `useShiftValidationData` — 3 fetches indépendants, `enabled` conditionnel
4. `useComplianceCheck` — dépend de #3
5. `useComplianceMonitor` — polling, attention à `refetchInterval`
6. `useNotifications` — garder le realtime Supabase, utiliser `useQuery` seulement pour le fetch initial
7. `usePushNotifications` — peu critique
8. `useAuth` — en dernier, le plus risqué

**Important** : ne pas migrer `useNotifications` en entier vers `useQuery` — les updates realtime Supabase (`subscribeToNotifications`) doivent rester dans un `useEffect` séparé. `useQuery` gère le fetch initial, le realtime mutate le cache via `queryClient.setQueryData()`.

---

## Effort estimé

| Phase | Scope | Effort |
|-------|-------|--------|
| Setup | Réinstaller + restaurer `main.tsx` | 10 min |
| Hooks simples (#1-3) | useEmployerResolution, useShiftReminders, useShiftValidationData | 2-3h |
| Hooks complexes (#4-6) | useComplianceCheck, useComplianceMonitor, useNotifications | 3-4h |
| Tests | Adapter les mocks (`vi.mock` → `QueryClient` wrapper) | 2-3h |
| **Total** | | **~8-10h** |

---

_Document créé le 24/02/2026._
