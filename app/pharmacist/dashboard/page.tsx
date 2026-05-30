'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardHeader } from '@/components/dashboard-components';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, Plus, Trash2, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface InventoryItem {
  id: string;
  drug_name: string;
  stock_level: number;
  expiry_date: string;
  price: number;
  unit: string;
}

export default function PharmacistDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [drugFormData, setDrugFormData] = useState({
    drugName: '',
    stockLevel: '',
    expiryDate: '',
    price: '',
    unit: 'tablets',
  });
  const [searchDrug, setSearchDrug] = useState('');
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

        // Get pharmacist's pharmacy
        const { data: pharmacistData } = await supabase
          .from('pharmacists')
          .select('pharmacy_id')
          .eq('user_id', authUser.id)
          .single();

        if (pharmacistData) {
          setPharmacy(pharmacistData);
          // Load inventory
          loadInventory(pharmacistData.pharmacy_id);
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const loadInventory = async (pharmacyId: string) => {
    try {
      const response = await fetch(`/api/pharmacy-inventory?pharmacyId=${pharmacyId}`);
      const data = await response.json();
      if (data.inventory) {
        setInventory(data.inventory);
      }
    } catch (err) {
      setError('Failed to load inventory');
    }
  };

  const addDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacy) return;

    try {
      const response = await fetch('/api/pharmacy-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId: pharmacy.pharmacy_id,
          drugName: drugFormData.drugName,
          stockLevel: parseInt(drugFormData.stockLevel),
          expiryDate: drugFormData.expiryDate,
          price: parseFloat(drugFormData.price),
          unit: drugFormData.unit,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setInventory([data.item, ...inventory]);
        setDrugFormData({
          drugName: '',
          stockLevel: '',
          expiryDate: '',
          price: '',
          unit: 'tablets',
        });
        setShowAddDrug(false);
        setSuccess('Drug added to inventory');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to add drug');
    }
  };

  const updateStock = async (itemId: string, newStock: number) => {
    try {
      const response = await fetch('/api/pharmacy-inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemId,
          stockLevel: newStock,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setInventory(
          inventory.map((item) =>
            item.id === itemId ? { ...item, stock_level: newStock } : item
          )
        );
        setSuccess('Stock updated');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to update stock');
    }
  };

  const deleteDrug = async (itemId: string) => {
    if (!window.confirm('Remove this drug from inventory?')) return;

    try {
      const response = await fetch('/api/pharmacy-inventory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId }),
      });

      if (response.ok) {
        setInventory(inventory.filter((item) => item.id !== itemId));
        setSuccess('Drug removed from inventory');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete drug');
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { icon: AlertTriangle, color: 'text-red-600', label: 'Out of Stock' };
    if (stock < 10) return { icon: AlertTriangle, color: 'text-yellow-600', label: 'Low Stock' };
    return { icon: Package, color: 'text-green-600', label: 'In Stock' };
  };

  const filteredInventory = inventory.filter((item) =>
    item.drug_name.toLowerCase().includes(searchDrug.toLowerCase())
  );

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

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="add">Add Drug</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pharmacy Inventory</CardTitle>
                <CardDescription>Total items: {inventory.length}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search drugs..."
                  value={searchDrug}
                  onChange={(e) => setSearchDrug(e.target.value)}
                />

                {filteredInventory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {searchDrug ? 'No drugs found' : 'No inventory items yet'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInventory.map((item) => {
                      const status = getStockStatus(item.stock_level);
                      const Icon = status.icon;
                      const isExpired = new Date(item.expiry_date) < new Date();

                      return (
                        <div
                          key={item.id}
                          className={`p-4 border rounded-lg ${
                            isExpired ? 'border-red-300 bg-red-50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 ${status.color}`} />
                                <div className="font-semibold">{item.drug_name}</div>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {item.unit} • Price: ${item.price.toFixed(2)}
                              </div>
                              <div className="text-sm mt-2">
                                <strong>Stock:</strong> {item.stock_level} {item.unit}
                              </div>
                              <div className="text-sm">
                                <strong>Expires:</strong>{' '}
                                <span className={isExpired ? 'text-red-600' : ''}>
                                  {new Date(item.expiry_date).toLocaleDateString()}
                                  {isExpired && ' (EXPIRED)'}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newStock = Math.max(0, item.stock_level - 1);
                                  updateStock(item.id, newStock);
                                }}
                              >
                                -
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStock(item.id, item.stock_level + 1)}
                              >
                                +
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteDrug(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            {!showAddDrug ? (
              <Button onClick={() => setShowAddDrug(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add New Drug
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Add Drug to Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addDrug} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Drug Name</label>
                      <Input
                        placeholder="e.g., Paracetamol"
                        value={drugFormData.drugName}
                        onChange={(e) =>
                          setDrugFormData({
                            ...drugFormData,
                            drugName: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Stock Level</label>
                        <Input
                          type="number"
                          placeholder="e.g., 100"
                          value={drugFormData.stockLevel}
                          onChange={(e) =>
                            setDrugFormData({
                              ...drugFormData,
                              stockLevel: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Unit</label>
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={drugFormData.unit}
                          onChange={(e) =>
                            setDrugFormData({
                              ...drugFormData,
                              unit: e.target.value,
                            })
                          }
                        >
                          <option value="tablets">Tablets</option>
                          <option value="capsules">Capsules</option>
                          <option value="ml">ML (Liquid)</option>
                          <option value="vials">Vials</option>
                          <option value="bottles">Bottles</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Price per Unit</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g., 5.99"
                          value={drugFormData.price}
                          onChange={(e) =>
                            setDrugFormData({
                              ...drugFormData,
                              price: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Expiry Date</label>
                        <Input
                          type="date"
                          value={drugFormData.expiryDate}
                          onChange={(e) =>
                            setDrugFormData({
                              ...drugFormData,
                              expiryDate: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Add to Inventory
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddDrug(false);
                          setDrugFormData({
                            drugName: '',
                            stockLevel: '',
                            expiryDate: '',
                            price: '',
                            unit: 'tablets',
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
        </Tabs>
      </main>
    </div>
  );
}
