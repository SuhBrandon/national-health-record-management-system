'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { 
  LogOut, 
  Users, 
  FileText, 
  Pill, 
  Calendar, 
  Send, 
  RefreshCw, 
  Plus,
  MessageSquare 
} from 'lucide-react';

interface Patient {
  id: string;
  user_id: string;
  users: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface MedicalRecord {
  id: string;
  diagnosis: string;
  treatment: string;
  record_date: string;
  patient_id: string;
}

interface OnlinePrescription {
  id: string;
  symptoms: string;
  status: string;
  ai_confidence_score: number | null;
  submitted_date: string;
  patient_id: string;
}

interface Referral {
  id: string;
  status: string;
  referral_reason: string;
  created_at: string;
  patients: {
    users: {
      first_name: string;
      last_name: string;
    };
  };
}

export default function DoctorDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [onlinePrescriptions, setOnlinePrescriptions] = useState<OnlinePrescription[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push('/auth/login');
          return;
        }

        setUser(authUser);

        // Load doctor profile
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id, hospital_id')
          .eq('user_id', authUser.id)
          .single();

        // Load assigned patients (through medical records)
        const { data: assignedPatients } = await supabase
          .from('medical_records')
          .select(`
            patient_id,
            patients!inner (
              id,
              user_id,
              users!inner (
                first_name,
                last_name,
                email
              )
            )
          `)
          .eq('doctor_id', doctorData?.id);

        const uniquePatients = Array.from(
          new Map(
            assignedPatients?.map((r: any) => [r.patient_id, r.patients]) || []
          ).values()
        );
        setPatients(uniquePatients as Patient[]);

        // Load medical records
        const { data: records } = await supabase
          .from('medical_records')
          .select('*')
          .eq('doctor_id', doctorData?.id)
          .order('record_date', { ascending: false })
          .limit(10);
        setMedicalRecords(records || []);

        // Load online prescriptions for review
        const { data: prescriptions } = await supabase
          .from('online_prescriptions')
          .select(`
            id,
            symptoms,
            status,
            ai_confidence_score,
            submitted_date,
            patient_id
          `)
          .in('status', ['submitted', 'ai_predicted'])
          .order('submitted_date', { ascending: false });
        setOnlinePrescriptions(prescriptions || []);

        // Load referrals for this doctor
        const { data: referralData } = await supabase
          .from('referrals')
          .select(`
            id,
            status,
            referral_reason,
            created_at,
            patients (
              users (
                first_name,
                last_name
              )
            )
          `)
          .or(`from_doctor_id.eq.${doctorData?.id},to_doctor_id.eq.${doctorData?.id}`)
          .order('created_at', { ascending: false });
        setReferrals(referralData || []);
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
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Doctor Dashboard</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-3xl font-bold text-foreground">{patients.length}</p>
                <p className="text-sm text-muted-foreground">Patients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-3xl font-bold text-foreground">{medicalRecords.length}</p>
                <p className="text-sm text-muted-foreground">Medical Records</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <MessageSquare className="w-8 h-8 text-accent mx-auto mb-2" />
                <p className="text-3xl font-bold text-foreground">{onlinePrescriptions.length}</p>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Send className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-3xl font-bold text-foreground">{referrals.length}</p>
                <p className="text-sm text-muted-foreground">Referrals</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="patients" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="patients">
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Patients</span>
            </TabsTrigger>
            <TabsTrigger value="records">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Records</span>
            </TabsTrigger>
            <TabsTrigger value="prescriptions">
              <Pill className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Prescriptions</span>
            </TabsTrigger>
            <TabsTrigger value="referrals">
              <Send className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Referrals</span>
            </TabsTrigger>
            <TabsTrigger value="appointments">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Appointments</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Patients</CardTitle>
                <CardDescription>Search and manage your assigned patients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search patients by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="space-y-2">
                  {patients.filter(p =>
                    p.users.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.users.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.users.email.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50">
                      <div>
                        <p className="font-medium text-foreground">
                          {patient.users.first_name} {patient.users.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{patient.users.email}</p>
                      </div>
                      <Button size="sm" variant="outline">View Records</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Medical Records</CardTitle>
                  <CardDescription>Recent medical records created</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Record
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {medicalRecords.map((record) => (
                  <div key={record.id} className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-foreground">{record.diagnosis}</p>
                        <p className="text-sm text-muted-foreground">{new Date(record.record_date).toLocaleDateString()}</p>
                      </div>
                      <Button size="sm" variant="ghost">Edit</Button>
                    </div>
                    <p className="text-sm text-foreground">{record.treatment}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Prescriptions</CardTitle>
                <CardDescription>Patient submissions awaiting your review and AI predictions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {onlinePrescriptions.map((prescription) => (
                  <div key={prescription.id} className="p-4 border border-border rounded-lg bg-muted/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">Patient Symptoms</p>
                        <p className="text-sm text-muted-foreground">{prescription.symptoms}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        prescription.status === 'ai_predicted' 
                          ? 'bg-secondary text-secondary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {prescription.status}
                      </span>
                    </div>
                    {prescription.ai_confidence_score && (
                      <p className="text-xs text-muted-foreground mb-3">
                        AI Confidence: {(prescription.ai_confidence_score * 100).toFixed(0)}%
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm">Approve & Prescribe</Button>
                      <Button size="sm" variant="outline">Review Details</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Referrals</CardTitle>
                  <CardDescription>Patient referrals to other hospitals</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Referral
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {referrals.map((referral) => (
                  <div key={referral.id} className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {referral.patients?.users?.first_name} {referral.patients?.users?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{referral.referral_reason}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        referral.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : referral.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {referral.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(referral.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Appointments</CardTitle>
                  <CardDescription>Manage patient appointments</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Appointment
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Appointments feature coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
