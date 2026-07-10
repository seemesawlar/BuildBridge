import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import NewProject from './pages/NewProject'
import ProjectDetail from './pages/ProjectDetail'
import SharedSummary from './pages/SharedSummary'
import Profile from './pages/Profile'
import ContractorProfile from './pages/ContractorProfile'
import Marketplace from './pages/Marketplace'
import Inquiries from './pages/Inquiries'
import AdminDashboard from './pages/admin/AdminDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/share/:token" element={<SharedSummary />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects/new" element={<NewProject />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/contractors/:id" element={<ContractorProfile />} />
          <Route path="/contractors" element={<Marketplace />} />
          <Route path="/inquiries" element={<Inquiries />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
