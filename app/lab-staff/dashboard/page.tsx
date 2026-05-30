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
import { Upload, Check, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface LabResult {
  id: string;
  test_name: string;
  result: string;
  status: string;
  upload_date: string;
}

export default function LabStaffDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [resultFormData, setResultFormData] = useState({
    testName: '',
    result: '',
    unit: '',
    referenceRange: '',
    labValue: '',
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

        // Load test results
        const response = await fetch('/api/lab-results');
        const data = await response.json();
        if (data.results) {
          setLabResults(data.results);
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const uploadTestResult = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/lab-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicalRecordId: 'temp-record-id',
          testName: resultFormData.testName,
          result: resultFormData.result,
          unit: resultFormData.unit,
          referenceRange: resultFormData.referenceRange,
          labValue: resultFormData.labValue,
          uploadedBy: user?.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLabResults([data.labResult, ...labResults]);
        setResultFormData({
          testName: '',
          result: '',
          unit: '',
          referenceRange: '',
          labValue: '',
        });
        setShowUploadForm(false);
        setSuccess('Test result uploaded successfully');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to upload test result');
    }
  };

  const validateResult = async (resultId: string) => {
    try {
      const response = await fetch('/api/lab-results', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resultId,
          status: 'validated',
        }),
      });

      if (response.ok) {
        setLabResults(
          labResults.map((r) =>
            r.id === resultId ? { ...r, status: 'validated' } : r
          )
        );
        setSuccess('Test result validated');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to validate result');
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
        title="Lab Staff Dashboard" 
        subtitle="Upload and manage lab test results"
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

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Results</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            {!showUploadForm ? (
              <Button onClick={() => setShowUploadForm(true)} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload New Test Result
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Upload Test Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={uploadTestResult} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Test Name</label>
                      <Input
                        placeholder="e.g., Blood Glucose, Hemoglobin"
                        value={resultFormData.testName}
                        onChange={(e) =>
                          setResultFormData({
                            ...resultFormData,
                            testName: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Result Value</label>
                        <Input
                          placeholder="e.g., 95"
                          value={resultFormData.labValue}
                          onChange={(e) =>
                            setResultFormData({
                              ...resultFormData,
                              labValue: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Unit</label>
                        <Input
                          placeholder="e.g., mg/dL"
                          value={resultFormData.unit}
                          onChange={(e) =>
                            setResultFormData({
                              ...resultFormData,
                              unit: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Reference Range</label>
                      <Input
                        placeholder="e.g., 70-100 mg/dL"
                        value={resultFormData.referenceRange}
                        onChange={(e) =>
                          setResultFormData({
                            ...resultFormData,
                            referenceRange: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Clinical Notes</label>
                      <Textarea
                        placeholder="Add any observations or findings..."
                        value={resultFormData.result}
                        onChange={(e) =>
                          setResultFormData({
                            ...resultFormData,
                            result: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Upload Result
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowUploadForm(false);
                          setResultFormData({
                            testName: '',
                            result: '',
                            unit: '',
                            referenceRange: '',
                            labValue: '',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Results History</CardTitle>
              </CardHeader>
              <CardContent>
                {labResults.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No test results yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {labResults.map((result) => (
                      <div key={result.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold">{result.test_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(result.upload_date).toLocaleString()}
                            </div>
                            <div className="text-sm mt-2">{result.result}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.status === 'validated' ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-yellow-600" />
                            )}
                            <Button
                              size="sm"
                              onClick={() => validateResult(result.id)}
                              disabled={result.status === 'validated'}
                            >
                              Validate
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
