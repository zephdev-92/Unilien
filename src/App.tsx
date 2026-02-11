import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, Container, Spinner, Center, Text } from '@chakra-ui/react'
import { LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm } from '@/components/auth'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

// Pages chargées dynamiquement (code splitting)
const HomePage = lazy(() => import('@/pages/HomePage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const Dashboard = lazy(() => import('@/components/dashboard/Dashboard'))
const ProfilePage = lazy(() => import('@/components/profile/ProfilePage'))
const PlanningPage = lazy(() => import('@/components/planning/PlanningPage'))
const LogbookPage = lazy(() => import('@/components/logbook/LogbookPage'))
const LiaisonPage = lazy(() => import('@/components/liaison/LiaisonPage'))
const TeamPage = lazy(() => import('@/components/team/TeamPage'))
const ClockInPage = lazy(() => import('@/components/clock-in/ClockInPage'))
const CompliancePage = lazy(() => import('@/pages/CompliancePage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))

// Page de chargement
function LoadingPage() {
  return (
    <Center minH="100vh">
      <Box textAlign="center">
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
    return <Navigate to="/dashboard" replace />
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
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        {/* Page d'accueil publique */}
        <Route path="/" element={<HomePage />} />

        {/* Page de contact */}
        <Route path="/contact" element={<ContactPage />} />

        {/* Routes publiques */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Box minH="100vh" bg="gray.50">
                <Container maxW="container.sm" py={8}>
                  <LoginForm />
                </Container>
              </Box>
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Box minH="100vh" bg="gray.50">
                <Container maxW="container.sm" py={8}>
                  <SignupForm />
                </Container>
              </Box>
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <Box minH="100vh" bg="gray.50">
                <Container maxW="container.sm" py={8}>
                  <ForgotPasswordForm />
                </Container>
              </Box>
            </PublicRoute>
          }
        />
        {/* Reset password - pas de PublicRoute car le token vient de l'email */}
        <Route
          path="/reset-password"
          element={
            <Box minH="100vh" bg="gray.50">
              <Container maxW="container.sm" py={8}>
                <ResetPasswordForm />
              </Container>
            </Box>
          }
        />

        {/* Routes protégées - authentification requise */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/planning" element={<ProtectedRoute><PlanningPage /></ProtectedRoute>} />
        <Route path="/logbook" element={<ProtectedRoute><LogbookPage /></ProtectedRoute>} />
        <Route path="/liaison" element={<ProtectedRoute><LiaisonPage /></ProtectedRoute>} />

        {/* Routes protégées avec restriction de rôle */}
        <Route path="/clock-in" element={<ProtectedRoute allowedRoles={['employee']}><ClockInPage /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute allowedRoles={['employer', 'caregiver']}><TeamPage /></ProtectedRoute>} />
        <Route path="/compliance" element={<ProtectedRoute allowedRoles={['employer', 'caregiver']}><CompliancePage /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute allowedRoles={['employer', 'caregiver']}><DocumentsPage /></ProtectedRoute>} />

        {/* Redirection par défaut pour les routes inconnues */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
