import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: any = {
      roles: [],
      hospitals: [],
      pharmacies: [],
      paymentMethods: [],
      services: [],
    };

    console.log('[v0] Setting up database initial data...');

    // 1. Create roles
    const roles = [
      { name: 'patient', description: 'Patient role' },
      { name: 'doctor', description: 'Doctor role' },
      { name: 'nurse', description: 'Nurse role' },
      { name: 'lab_staff', description: 'Lab staff role' },
      { name: 'pharmacist', description: 'Pharmacist role' },
      { name: 'admin', description: 'Administrator role' },
      { name: 'compliance_officer', description: 'Compliance officer role' },
      { name: 'system_admin', description: 'System administrator role' },
    ];

    for (const role of roles) {
      try {
        const { data, error } = await adminClient
          .from('roles')
          .insert(role)
          .select();

        if (error && !error.message.includes('duplicate')) {
          console.error(`[v0] Error creating role ${role.name}:`, error);
          results.roles.push({
            name: role.name,
            status: 'error',
            message: error.message,
          });
        } else if (data) {
          results.roles.push({
            name: role.name,
            status: 'success',
          });
        }
      } catch (err: any) {
        results.roles.push({
          name: role.name,
          status: 'error',
          message: err.message,
        });
      }
    }

    // 2. Create hospitals
    const hospitals = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Central Hospital',
        location: '123 Main Street',
        city: 'Ouagadougou',
        state_province: 'Kadiogo',
        country: 'Burkina Faso',
        phone: '+226 25 30 01 02',
        email: 'info@centralhospital.bf',
        website: 'https://centralhospital.bf',
        established_year: 2005,
        beds_count: 500,
        is_verified: true,
      },
      {
        id: '551e8400-e29b-41d4-a716-446655440001',
        name: 'Regional Hospital',
        location: '456 Oak Avenue',
        city: 'Bobo-Dioulasso',
        state_province: 'Houet',
        country: 'Burkina Faso',
        phone: '+226 20 97 00 00',
        email: 'info@regionalhospital.bf',
        website: 'https://regionalhospital.bf',
        established_year: 2008,
        beds_count: 300,
        is_verified: true,
      },
    ];

    for (const hospital of hospitals) {
      try {
        const { data, error } = await adminClient
          .from('hospitals')
          .insert(hospital)
          .select();

        if (error && !error.message.includes('duplicate')) {
          console.error(`[v0] Error creating hospital ${hospital.name}:`, error);
          results.hospitals.push({
            name: hospital.name,
            status: 'error',
            message: error.message,
          });
        } else if (data) {
          results.hospitals.push({
            name: hospital.name,
            status: 'success',
          });
        }
      } catch (err: any) {
        results.hospitals.push({
          name: hospital.name,
          status: 'error',
          message: err.message,
        });
      }
    }

    // 3. Create pharmacies
    const pharmacies = [
      {
        id: '660e8400-e29b-41d4-a716-446655440000',
        name: 'Central Pharmacy',
        location: '789 Pharmacy Lane',
        city: 'Ouagadougou',
        state_province: 'Kadiogo',
        country: 'Burkina Faso',
        phone: '+226 25 30 05 05',
        email: 'info@centralpharmacy.bf',
        website: 'https://centralpharmacy.bf',
        license_number: 'PHARM-001',
        is_verified: true,
      },
    ];

    for (const pharmacy of pharmacies) {
      try {
        const { data, error } = await adminClient
          .from('pharmacies')
          .insert(pharmacy)
          .select();

        if (error && !error.message.includes('duplicate')) {
          console.error(`[v0] Error creating pharmacy ${pharmacy.name}:`, error);
          results.pharmacies.push({
            name: pharmacy.name,
            status: 'error',
            message: error.message,
          });
        } else if (data) {
          results.pharmacies.push({
            name: pharmacy.name,
            status: 'success',
          });
        }
      } catch (err: any) {
        results.pharmacies.push({
          name: pharmacy.name,
          status: 'error',
          message: err.message,
        });
      }
    }

    // 4. Create payment methods
    const paymentMethods = [
      { name: 'MTN Money', provider_type: 'mobile_money', is_active: true },
      { name: 'Orange Money', provider_type: 'mobile_money', is_active: true },
      { name: 'Credit Card', provider_type: 'card', is_active: true },
      { name: 'Bank Transfer', provider_type: 'bank', is_active: true },
    ];

    for (const method of paymentMethods) {
      try {
        const { data, error } = await adminClient
          .from('payment_methods')
          .insert(method)
          .select();

        if (error && !error.message.includes('duplicate')) {
          console.error(`[v0] Error creating payment method ${method.name}:`, error);
          results.paymentMethods.push({
            name: method.name,
            status: 'error',
            message: error.message,
          });
        } else if (data) {
          results.paymentMethods.push({
            name: method.name,
            status: 'success',
          });
        }
      } catch (err: any) {
        results.paymentMethods.push({
          name: method.name,
          status: 'error',
          message: err.message,
        });
      }
    }

    // 5. Create services
    const services = [
      {
        name: 'Doctor Consultation',
        description: 'Online or in-person doctor consultation',
        service_type: 'consultation',
        base_price: 50000,
        currency: 'XOF',
        is_active: true,
      },
      {
        name: 'Lab Test',
        description: 'Laboratory test analysis',
        service_type: 'lab',
        base_price: 25000,
        currency: 'XOF',
        is_active: true,
      },
      {
        name: 'Medical Report',
        description: 'Medical report generation',
        service_type: 'document',
        base_price: 10000,
        currency: 'XOF',
        is_active: true,
      },
      {
        name: 'Document Verification',
        description: 'Medical document verification by doctor',
        service_type: 'document',
        base_price: 5000,
        currency: 'XOF',
        is_active: true,
      },
    ];

    for (const service of services) {
      try {
        const { data, error } = await adminClient
          .from('services')
          .insert(service)
          .select();

        if (error && !error.message.includes('duplicate')) {
          console.error(`[v0] Error creating service ${service.name}:`, error);
          results.services.push({
            name: service.name,
            status: 'error',
            message: error.message,
          });
        } else if (data) {
          results.services.push({
            name: service.name,
            status: 'success',
          });
        }
      } catch (err: any) {
        results.services.push({
          name: service.name,
          status: 'error',
          message: err.message,
        });
      }
    }

    console.log('[v0] Database setup completed!');
    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Database setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Database setup failed' },
      { status: 500 }
    );
  }
}
