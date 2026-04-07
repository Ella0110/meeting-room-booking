import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from './components/ProtectedRoute'
import NavBar from './components/NavBar'

const LoginPage          = lazy(() => import('./pages/LoginPage'))
const AcceptInvitePage   = lazy(() => import('./pages/AcceptInvitePage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage'))
const CalendarPage       = lazy(() => import('./pages/CalendarPage'))
const MyBookingsPage     = lazy(() => import('./pages/MyBookingsPage'))
const AdminLayout        = lazy(() => import('./pages/admin/AdminLayout'))
const UsersPage          = lazy(() => import('./pages/admin/UsersPage'))
const RoomsPage          = lazy(() => import('./pages/admin/RoomsPage'))
const BlockedSlotsPage   = lazy(() => import('./pages/admin/BlockedSlotsPage'))
const BookingsPage       = lazy(() => import('./pages/admin/BookingsPage'))

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main>{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<div className="p-8 font-mono">Loading...</div>}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected user routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout><CalendarPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/my-bookings" element={
          <ProtectedRoute>
            <AppLayout><MyBookingsPage /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/admin/users" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="blocked-slots" element={<BlockedSlotsPage />} />
          <Route path="bookings" element={<BookingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
