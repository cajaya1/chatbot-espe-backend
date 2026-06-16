import { Outlet } from 'react-router-dom'
import PublicNavbar from '../components/PublicNavbar'
import PublicFooter from '../components/PublicFooter'
import FloatingChat from '../components/FloatingChat'

function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicNavbar />
      <main className="pb-14 pt-3 sm:pb-16 sm:pt-4">
        <Outlet />
      </main>
      <FloatingChat />
      <PublicFooter />
    </div>
  )
}

export default PublicLayout