'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/spinner';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          router.push('/auth/login');
          return;
        }

        // Get user profile with role
        const { data: profile } = await supabase
          .from('users')
          .select('role_id, roles:role_id (name)')
          .eq('id', user.id)
          .single();

        const roleName = profile?.roles?.name;

        // Route to appropriate dashboard based on role
        switch (roleName) {
          case 'patient':
            router.push('/patient/dashboard');
            break;
          case 'doctor':
            router.push('/doctor/dashboard');
            break;
          case 'nurse':
            router.push('/nurse/dashboard');
            break;
          case 'lab_staff':
            router.push('/lab-staff/dashboard');
            break;
          case 'pharmacist':
            router.push('/pharmacist/dashboard');
            break;
          case 'admin':
            router.push('/admin/dashboard');
            break;
          case 'compliance_officer':
            router.push('/compliance/dashboard');
            break;
          case 'system_admin':
            router.push('/system-admin/dashboard');
            break;
          default:
            router.push('/auth/login');
        }
      } catch (err) {
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    checkUserAndRedirect();
  }, [supabase, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Spinner />
        <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );
}
