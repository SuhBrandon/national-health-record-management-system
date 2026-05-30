'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/spinner';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push('/auth/login');
          return;
        }

        // Get user profile with role - improved query
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('role_id')
          .eq('id', user.id)
          .single();

        if (profileError || !userProfile) {
          setError('Could not load user profile');
          return;
        }

        // Get role name separately
        const { data: roleData } = await supabase
          .from('roles')
          .select('name')
          .eq('id', userProfile.role_id)
          .single();

        const roleName = roleData?.name;

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
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    };

    checkUserAndRedirect();
  }, [supabase, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Spinner />
        <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );
}
