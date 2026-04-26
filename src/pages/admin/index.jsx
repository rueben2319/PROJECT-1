import React from 'react'
import { Routes, Route } from 'react-router-dom'
import AdminShell from '../../components/admin/AdminShell.jsx'
import Dashboard from './Dashboard.jsx'
import Payments from './Payments.jsx'
import Students from './Students.jsx'
import Content from './Content.jsx'
import Config from './Config.jsx'
import Security from './Security.jsx'
import Audit from './Audit.jsx'
import Analytics from './Analytics.jsx'

export default function AdminRouter() {
  return (
    <AdminShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/users" element={<Students />} />
        <Route path="/content" element={<Content />} />
        <Route path="/config" element={<Config />} />
        <Route path="/security" element={<Security />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </AdminShell>
  )
}
