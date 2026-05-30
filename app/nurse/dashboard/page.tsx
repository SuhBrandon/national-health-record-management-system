'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardHeader } from '@/components/dashboard-components';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, ClipboardList, AlertCircle, CheckCircle } from 'lucide-react';

interface Patient {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
}

interface Vital {
  id: string;
  blood_pressure: string;
  heart_rate: number;
  temperature: number;
  weight: number;
  notes: string;
  recorded_at: string;
}

export default function NurseDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [vitalFormData, setVitalFormData] = useState({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    weight: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const searchPatients = async () => {
    if (!searchQuery.trim()) return;
    try {
      const response = await fetch('/api/patients/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await response.json();
      if (data.patients) {
        setPatients(data.patients);
      }
    } catch (err) {
      setError('Failed to search patients');
    }
  };

  const selectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    try {
      const response = await fetch(`/api/vitals?patientId=${patient.id}`);
      const data = await response.json();
      if (data.vitals) {
        setVitals(data.vitals);
      }
    } catch (err) {
      setError('Failed to load vitals');
    }
  };

  const recordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      const response = await fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          bloodPressure: vitalFormData.bloodPressure,
          heartRate: parseInt(vitalFormData.heartRate),
          temperature: parseFloat(vitalFormData.temperature),
          weight: parseFloat(vitalFormData.weight),
          notes: vitalFormData.notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setVitals([data.vital, ...vitals]);
        setVitalFormData({
          bloodPressure: '',
          heartRate: '',
          temperature: '',
          weight: '',
          notes: '',
        });
        setShowVitalsForm(false);
        setSuccess('Vitals recorded successfully');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to record vitals');
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
      <DashboardHeader 
        title="Nurse Dashboard" 
        subtitle="Manage patient vitals and assist with records"
        email={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Patients</TabsTrigger>
            <TabsTrigger value="vitals">Record Vitals</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search for Patients</CardTitle>
                <CardDescription>Find patients by name, ID, or phone number</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchPatients()}
                  />
                  <Button onClick={searchPatients}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

                {patients.length > 0 && (
                  <div className="space-y-2">
                    {patients.map((patient) => (
                      <div
                        key={patient.id}
                        className="p-4 border rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => selectPatient(patient)}
                      >
                        <div className="font-semibold">{patient.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {patient.email} | {patient.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vitals" className="space-y-4">
            {!selectedPatient ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Search and select a patient first to record vitals
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      {selectedPatient.name}
                    </CardTitle>
                    <CardDescription>{selectedPatient.email}</CardDescription>
                  </CardHeader>
                </Card>

                {!showVitalsForm ? (
                  <Button onClick={() => setShowVitalsForm(true)} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Record New Vitals
                  </Button>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Record Patient Vitals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={recordVitals} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Blood Pressure (mmHg)</label>
                            <Input
                              placeholder="e.g., 120/80"
                              value={vitalFormData.bloodPressure}
                              onChange={(e) =>
                                setVitalFormData({
                                  ...vitalFormData,
                                  bloodPressure: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Heart Rate (bpm)</label>
                            <Input
                              type="number"
                              placeholder="e.g., 72"
                              value={vitalFormData.heartRate}
                              onChange={(e) =>
                                setVitalFormData({
                                  ...vitalFormData,
                                  heartRate: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Temperature (°C)</label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="e.g., 37.0"
                              value={vitalFormData.temperature}
                              onChange={(e) =>
                                setVitalFormData({
                                  ...vitalFormData,
                                  temperature: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Weight (kg)</label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="e.g., 70.0"
                              value={vitalFormData.weight}
                              onChange={(e) =>
                                setVitalFormData({
                                  ...vitalFormData,
                                  weight: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Notes</label>
                          <Textarea
                            placeholder="Additional observations..."
                            value={vitalFormData.notes}
                            onChange={(e) =>
                              setVitalFormData({
                                ...vitalFormData,
                                notes: e.target.value,
                              })
                            }
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1">
                            Save Vitals
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowVitalsForm(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {vitals.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Vitals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {vitals.map((vital) => (
                          <div key={vital.id} className="p-3 border rounded-lg">
                            <div className="text-sm text-muted-foreground">
                              {new Date(vital.recorded_at).toLocaleString()}
                            </div>
                            <div className="grid grid-cols-4 gap-2 mt-2">
                              <div>
                                <div className="text-xs text-muted-foreground">BP</div>
                                <div className="font-semibold">{vital.blood_pressure}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">HR</div>
                                <div className="font-semibold">{vital.heart_rate} bpm</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Temp</div>
                                <div className="font-semibold">{vital.temperature}°C</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Weight</div>
                                <div className="font-semibold">{vital.weight} kg</div>
                              </div>
                            </div>
                            {vital.notes && (
                              <div className="text-sm mt-2 p-2 bg-muted rounded">
                                {vital.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
