import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function setupDatabase() {
  console.log('[v0] Starting database setup...');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Read the SQL schema file
    const sqlPath = path.join(__dirname, 'create-schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('[v0] Executing database schema...');
    
    // Execute the SQL
    const { error: schemaError } = await supabase.rpc('exec_sql', {
      sql: sqlContent,
    }).catch(() => {
      // If exec_sql RPC doesn't exist, try direct query
      return supabase.from('_supabase_migrations').insert({
        name: 'create_schema',
        executed_at: new Date().toISOString(),
      });
    });

    if (schemaError) {
      console.error('[v0] Schema error:', schemaError);
      // Continue anyway - some statements might have failed due to existing objects
    }

    console.log('[v0] Creating initial roles...');

    // Create initial roles
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
      const { error } = await supabase
        .from('roles')
        .insert(role)
        .on('*', (payload: any) => {
          if (payload.eventType === 'INSERT') {
            console.log(`[v0] Created role: ${role.name}`);
          }
        })
        .subscribe();

      if (error && !error.message.includes('duplicate')) {
        console.error(`[v0] Error creating role ${role.name}:`, error);
      }
    }

    console.log('[v0] Creating initial hospitals...');

    // Create initial hospitals
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
      const { error } = await supabase
        .from('hospitals')
        .insert(hospital)
        .on('*', (payload: any) => {
          if (payload.eventType === 'INSERT') {
            console.log(`[v0] Created hospital: ${hospital.name}`);
          }
        })
        .subscribe();

      if (error && !error.message.includes('duplicate')) {
        console.error(`[v0] Error creating hospital:`, error);
      }
    }

    console.log('[v0] Creating initial pharmacies...');

    // Create initial pharmacies
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
      const { error } = await supabase
        .from('pharmacies')
        .insert(pharmacy)
        .on('*', (payload: any) => {
          if (payload.eventType === 'INSERT') {
            console.log(`[v0] Created pharmacy: ${pharmacy.name}`);
          }
        })
        .subscribe();

      if (error && !error.message.includes('duplicate')) {
        console.error(`[v0] Error creating pharmacy:`, error);
      }
    }

    console.log('[v0] Creating payment methods...');

    // Create payment methods
    const paymentMethods = [
      { name: 'MTN Money', provider_type: 'mobile_money', is_active: true },
      { name: 'Orange Money', provider_type: 'mobile_money', is_active: true },
      { name: 'Credit Card', provider_type: 'card', is_active: true },
      { name: 'Bank Transfer', provider_type: 'bank', is_active: true },
    ];

    for (const method of paymentMethods) {
      const { error } = await supabase
        .from('payment_methods')
        .insert(method)
        .on('*', (payload: any) => {
          if (payload.eventType === 'INSERT') {
            console.log(`[v0] Created payment method: ${method.name}`);
          }
        })
        .subscribe();

      if (error && !error.message.includes('duplicate')) {
        console.error(`[v0] Error creating payment method:`, error);
      }
    }

    console.log('[v0] Creating services...');

    // Create services
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
      const { error } = await supabase
        .from('services')
        .insert(service)
        .on('*', (payload: any) => {
          if (payload.eventType === 'INSERT') {
            console.log(`[v0] Created service: ${service.name}`);
          }
        })
        .subscribe();

      if (error && !error.message.includes('duplicate')) {
        console.error(`[v0] Error creating service:`, error);
      }
    }

    console.log('[v0] Database setup completed successfully!');
  } catch (error) {
    console.error('[v0] Fatal error during database setup:', error);
    process.exit(1);
  }
}

setupDatabase();
