import { requireAdmin } from '@/lib/admin/guard'
import { AdminShell } from '@/components/admin/admin-shell'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdmin()

  return <AdminShell email={admin.email}>{children}</AdminShell>
}
