import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/admin-auth'
import { LoginForm } from '@/components/admin/login-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Connexion — Administration INOCASA',
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminRow) {
      redirect('/admin-r')
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <p className="eyebrow">INOCASA · ADMINISTRATION</p>
        <h1>Connexion</h1>
        <LoginForm />
      </div>
    </div>
  )
}
