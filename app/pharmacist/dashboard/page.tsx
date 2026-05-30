'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardHeader, ComingSoonCard } from '@/components/dashboard-components';
import { Spinner } from '@/components/ui/spinner';

export default function PharmacistDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push('/auth/login');
          return;
        }
        setUser(authUser);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Pharmacist Dashboard" 
        subtitle="Manage inventory and dispense medications"
        email={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-4">
          <ComingSoonCard 
            title="Pharmacist Dashboard"
            description="Pharmacy Inventory & Prescription Dispensing"
          />
        </div>
      </main>
    </div>
  );
}
