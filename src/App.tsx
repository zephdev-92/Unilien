import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Box, Container, Spinner, Center, Text } from '@chakra-ui/react'
import { LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm } from '@/components/auth'
import { ErrorBoundary } from '@/components/ui'
import { RouteAnnouncer } from '@/components/accessibility/RouteAnnouncer'
import { useAuth } from '@/hooks/useAuth'
import { useAccessibilityStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

// Pages chargées dynamiquement (code splitting)
const HomePage = lazy(() => import('@/pages/HomePage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const Dashboard = lazy(() => import('@/components/dashboard/Dashboard'))
const ProfilePage = lazy(() => import('@/components/profile/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const PlanningPage = lazy(() => import('@/components/planning/PlanningPage'))
const LogbookPage = lazy(() => import('@/components/logbook/LogbookPage'))
const LiaisonPage = lazy(() => import('@/components/liaison/LiaisonPage'))
const TeamPage = lazy(() => import('@/components/team/TeamPage'))
const ClockInPage = lazy(() => import('@/components/clock-in/ClockInPage'))
const CompliancePage = lazy(() => import('@/pages/CompliancePage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))

// Applique les attributs data-* sur <html> selon les préférences d'accessibilité
function AccessibilityApplier() {
  const { settings } = useAccessibilityStore()

  useEffect(() => {
    const html = document.documentElement
    html.toggleAttribute('data-high-contrast', settings.highContrast)
    html.toggleAttribute('data-reduced-motion', settings.reducedMotion)
    html.toggleAttribute('data-screen-reader', settings.screenReaderOptimized)
    html.style.fontSize = settings.largeText ? `${settings.textScale}%` : ''
  }, [settings])

  return null
}

// Page de chargement
function LoadingPage() {
  return (
    <Center minH="100vh">
      <Box textAlign="center" role="status" aria-live="polite">
        <Spinner size="xl" color="brand.500" borderWidth="4px" mb={4} />
        <Text fontSize="lg" color="gray.600">
          Chargement...
        </Text>
      </Box>
    </Center>
  )
}

// Composant de route publique (redirige si connecté)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isInitialized } = useAuth()

  if (!isInitialized || isLoading) {
    return <LoadingPage />
  }

  if (isAuthenticated) {
    return <Navigate to="/tableau-de-bord" replace />
  }

  return <>{children}</>
}

// Composant de route protégée (redirige si non connecté)
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const { isAuthenticated, isLoading, isInitialized, userRole } = useAuth()

  if (!isInitialized || isLoading) {
    return <LoadingPage />
  }

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/tableau-de-bord" replace />
  }

  return <>{children}</>
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  // Rediriger vers /reinitialisation si le flux recovery arrive sur une autre page
  // (ex. Supabase redirige vers / car redirect_to n'est pas dans la whitelist)
  useEffect(() => {
    // Cas 1: hash contient type=recovery au chargement (Supabase a redirigé vers /)
    if (location.pathname !== '/reinitialisation' && location.hash.includes('type=recovery')) {
      navigate(`/reinitialisation${location.hash}`, { replace: true })
      return
    }

    // Cas 2: écouter PASSWORD_RECOVERY (au cas où le hash est traité après mount)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && location.pathname !== '/reinitialisation') {
        navigate(`/reinitialisation${location.hash}`, { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate, location.pathname, location.hash])

  return (
    <>
      <AccessibilityApplier />
      <RouteAnnouncer />
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          {/* Page d'accueil publique */}
          <Route path="/" element={<HomePage />} />

          {/* Page de contact */}
          <Route path="/contact" element={<ContactPage />} />

          {/* Routes publiques */}
          <Route
            path="/connexion"
            element={
              <PublicRoute>
                <Box minH="100vh" bg="bg.page" display="flex" alignItems="center" justifyContent="center" p={6}>
                  <LoginForm />
                </Box>
              </PublicRoute>
            }
          />
          <Route
            path="/inscription"
            element={
              <PublicRoute>
                <Box minH="100vh" bg="bg.page" display="flex" alignItems="center" justifyContent="center" p={6}>
                  <SignupForm />
                </Box>
              </PublicRoute>
            }
          />
          <Route
            path="/mot-de-passe-oublie"
            element={
              <PublicRoute>
                <Box minH="100vh" bg="bg.page" display="flex" alignItems="center" justifyContent="center" p={6}>
                  <ForgotPasswordForm />
                </Box>
              </PublicRoute>
            }
          />
          {/* Reset password - pas de PublicRoute car le token vient de l'email */}
          <Route
            path="/reinitialisation"
            element={
              <Box minH="100vh" bg="gray.50">
                <Container maxW="container.sm" py={8}>
                  <ResetPasswordForm />
                </Container>
              </Box>
            }
          />

          {/* Routes protégées - authentification requise */}
          <Route path="/tableau-de-bord" element={<ProtectedRoute><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/parametres" element={<ProtectedRoute><ErrorBoundary><SettingsPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/profil" element={<ProtectedRoute><ErrorBoundary><ProfilePage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/planning" element={<ProtectedRoute><ErrorBoundary><PlanningPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/cahier-de-liaison" element={<ProtectedRoute><ErrorBoundary><LogbookPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/messagerie" element={<ProtectedRoute><ErrorBoundary><LiaisonPage /></ErrorBoundary></ProtectedRoute>} />

          {/* Routes protégées avec restriction de rôle */}
          <Route path="/suivi-des-heures" element={<ProtectedRoute allowedRoles={['employer', 'employee', 'caregiver']}><ErrorBoundary><ClockInPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/equipe" element={<ProtectedRoute allowedRoles={['employer', 'caregiver']}><ErrorBoundary><TeamPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/conformite" element={<ProtectedRoute allowedRoles={['employer', 'caregiver']}><ErrorBoundary><CompliancePage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute allowedRoles={['employer', 'caregiver']}><ErrorBoundary><DocumentsPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/analytique" element={<ProtectedRoute><ErrorBoundary><AnalyticsPage /></ErrorBoundary></ProtectedRoute>} />

          {/* Redirection par défaut pour les routes inconnues */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
