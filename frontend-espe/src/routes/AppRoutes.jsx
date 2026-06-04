import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import AdminLayout from '../layouts/AdminLayout'
import Home from '../pages/Home'
import Chatbot from '../pages/Chatbot'
import Processes from '../pages/Processes'
import Formats from '../pages/Formats'
import Information from '../pages/Information'
import AdminDocuments from '../pages/AdminDocuments'
import AdminDashboard from '../pages/AdminDashboard'
import AdminUsers from '../pages/AdminUsers'
import Login from '../pages/Login'
import Profile from '../pages/Profile'
import useAuth from '../hooks/useAuth'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }
  return children
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/procesos-academicos" element={<Processes />} />
          <Route path="/formatos-anexos" element={<Formats />} />
          <Route path="/asistente-virtual" element={<Chatbot />} />
          <Route path="/informacion" element={<Information />} />
        </Route>

        <Route path="/admin/login" element={<Login />} />

        <Route element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/documents" element={<AdminDocuments />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
