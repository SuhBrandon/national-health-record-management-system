'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LogOut, 
  FileText, 
  Pill, 
  Calendar, 
  Share2, 
  Plus,
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface Patient {
  id: string;
  date_of_birth: string;
  gender: string;
  blood_type: string;
}

interface MedicalRecord {
  id: string;
  diagnosis: string;
  treatment: string;
  record_date: string;
}

interface Prescription {
  id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  status: string;
}

interface OnlinePrescription {
  id: string;
  symptoms: string;
  problems: string;
  status: string;
  submitted_date: string;
  ai_prediction: any;
  ai_confidence_score: number | null;
}

export default function PatientDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [onlinePrescriptions, setOnlinePrescriptions] = useState<OnlinePrescription[]>([]);
  const [symptoms, setSymptoms] = useState('');
  const [problems, setProblems] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push('/auth/login');
          return;
        }

        setUser(authUser);

        // Load patient profile
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        setPatient(patientData);

        // Load medical records
        const { data: records } = await supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', patientData?.id)
          .order('record_date', { ascending: false });
        setMedicalRecords(records || []);

        // Load prescriptions
        const { data: presc } = await supabase
          .from('prescriptions')
          .select('*')
          .order('created_at', { ascending: false });
        setPrescriptions(presc || []);

        // Load online prescriptions
        const { data: onlinePresc } = await supabase
          .from('online_prescriptions')
          .select('*')
          .eq('patient_id', patientData?.id)
          .order('submitted_date', { ascending: false });
        setOnlinePrescriptions(onlinePresc || []);
      } catch (err) {
        console.error('Error loading patient data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const handleSubmitPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!patient) {
        throw new Error('Patient data not found');
      }

      const { error } = await supabase
        .from('online_prescriptions')
        .insert({
          patient_id: patient.id,
          symptoms,
          problems,
          status: 'submitted',
        });

      if (error) {
        throw error;
      }

      setSymptoms('');
      setProblems('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);

      // Reload online prescriptions
      const { data: onlinePresc } = await supabase
        .from('online_prescriptions')
        .select('*')
        .eq('patient_id', patient.id)
        .order('submitted_date', { ascending: false });
      setOnlinePrescriptions(onlinePresc || []);
    } catch (err) {
      console.error('Error submitting prescription:', err);
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-foreground">My Health Records</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Health Summary */}
        <Card className="mb-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Blood Type</p>
                <p className="text-lg font-semibold text-foreground">{patient?.blood_type || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gender</p>
                <p className="text-lg font-semibold text-foreground">{patient?.gender || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Medical Records</p>
                <p className="text-lg font-semibold text-foreground">{medicalRecords.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Prescriptions</p>
                <p className="text-lg font-semibold text-foreground">{prescriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="online-prescription" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="online-prescription">
              <Send className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Online Prescription</span>
            </TabsTrigger>
            <TabsTrigger value="prescriptions">
              <Pill className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Prescriptions</span>
            </TabsTrigger>
            <TabsTrigger value="records">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Records</span>
            </TabsTrigger>
            <TabsTrigger value="appointments">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Appointments</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online-prescription" className="space-y-4 mt-6">
            {/* Prescription Submission Form */}
            <Card className="border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-primary/20">
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Submit Your Symptoms
                </CardTitle>
                <CardDescription>
                  Describe your symptoms and problems for our doctors to review or AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmitPrescription} className="space-y-4">
                  {submitSuccess && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Your symptoms have been submitted successfully. Our doctors will review it soon.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Symptoms <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      placeholder="Describe your symptoms in detail... (e.g., headache, fever, cough, etc.)"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      required
                      disabled={submitting}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">Be as detailed as possible to help doctors better understand your condition.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Additional Problems (Optional)
                    </label>
                    <Textarea
                      placeholder="Any other health concerns or problems you want to mention..."
                      value={problems}
                      onChange={(e) => setProblems(e.target.value)}
                      disabled={submitting}
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting || !symptoms}>
                    {submitting ? 'Submitting...' : 'Submit for Review'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Previous Submissions */}
            <Card>
              <CardHeader>
                <CardTitle>Your Submissions</CardTitle>
                <CardDescription>History of your symptom submissions and status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {onlinePrescriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No submissions yet</p>
                ) : (
                  onlinePrescriptions.map((prescription) => (
                    <div key={prescription.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{prescription.symptoms.substring(0, 50)}...</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(prescription.submitted_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ml-2 font-medium ${
                          prescription.status === 'doctor_approved'
                            ? 'bg-green-100 text-green-800'
                            : prescription.status === 'ai_predicted'
                            ? 'bg-blue-100 text-blue-800'
                            : prescription.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {prescription.status.replace('_', ' ')}
                        </span>
                      </div>
                      {prescription.ai_confidence_score && (
                        <p className="text-xs text-muted-foreground">
                          AI Confidence: {(prescription.ai_confidence_score * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>My Prescriptions</CardTitle>
                <CardDescription>Your active and past prescriptions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {prescriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No prescriptions yet</p>
                ) : (
                  prescriptions.map((prescription) => (
                    <div key={prescription.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">{prescription.drug_name}</p>
                          <p className="text-sm text-muted-foreground mt-1">{prescription.dosage} • {prescription.frequency}</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                          {prescription.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Medical Records</CardTitle>
                <CardDescription>Your complete medical history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {medicalRecords.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No medical records yet</p>
                ) : (
                  medicalRecords.map((record) => (
                    <div key={record.id} className="p-4 border border-border rounded-lg">
                      <div className="mb-2">
                        <p className="font-medium text-foreground">{record.diagnosis}</p>
                        <p className="text-xs text-muted-foreground">{new Date(record.record_date).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm text-foreground">{record.treatment}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>My Appointments</CardTitle>
                <CardDescription>Manage your appointments with doctors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Appointment scheduling coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
