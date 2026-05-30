import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Known hospital and pharmacy IDs
const CENTRAL_HOSPITAL_ID = '550e8400-e29b-41d4-a716-446655440000';
const CENTRAL_PHARMACY_ID = '660e8400-e29b-41d4-a716-446655440000';

const TEST_ACCOUNTS = [
  { email: 'patient@test.com', role: 'patient' },
  { email: 'doctor@test.com', role: 'doctor' },
  { email: 'nurse@test.com', role: 'nurse' },
  { email: 'labstaff@test.com', role: 'lab_staff' },
  { email: 'pharmacist@test.com', role: 'pharmacist' },
  { email: 'admin@test.com', role: 'admin' },
  { email: 'compliance@test.com', role: 'compliance_officer' },
  { email: 'sysadmin@test.com', role: 'system_admin' },
];

export async function POST() {
  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results = [];

    for (const account of TEST_ACCOUNTS) {
      try {
        // Get user ID
        const { data: userData } = await adminClient
          .from('users')
          .select('id')
          .eq('email', account.email)
          .single();

        if (!userData) {
          results.push({
            email: account.email,
            status: 'error',
            message: 'User not found',
          });
          continue;
        }

        const userId = userData.id;

        // Create role-specific records
        if (account.role === 'patient') {
          await adminClient
            .from('patients')
            .upsert(
              {
                user_id: userId,
                date_of_birth: '1990-05-15',
                gender: 'Other',
                blood_type: 'O+',
                allergies: 'None',
              },
              { onConflict: 'user_id' }
            );
        } else if (account.role === 'doctor') {
          await adminClient
            .from('doctors')
            .upsert(
              {
                user_id: userId,
                license_number: `MD-TEST001`,
                specialization: 'General Practice',
                hospital_id: CENTRAL_HOSPITAL_ID,
              },
              { onConflict: 'user_id' }
            );
        } else if (account.role === 'nurse') {
          await adminClient
            .from('nurses')
            .upsert(
              {
                user_id: userId,
                license_number: `RN-TEST001`,
                hospital_id: CENTRAL_HOSPITAL_ID,
              },
              { onConflict: 'user_id' }
            );
        } else if (account.role === 'lab_staff') {
          await adminClient
            .from('lab_staff')
            .upsert(
              {
                user_id: userId,
                hospital_id: CENTRAL_HOSPITAL_ID,
                certification: 'MLT Certified',
              },
              { onConflict: 'user_id' }
            );
        } else if (account.role === 'pharmacist') {
          await adminClient
            .from('pharmacists')
            .upsert(
              {
                user_id: userId,
                license_number: `RPH-TEST001`,
                pharmacy_id: CENTRAL_PHARMACY_ID,
              },
              { onConflict: 'user_id' }
            );
        }

        results.push({
          email: account.email,
          status: 'success',
          role: account.role,
        });
      } catch (err: any) {
        results.push({
          email: account.email,
          status: 'error',
          message: err.message,
        });
      }
    }

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Finalize setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Finalize setup failed' },
      { status: 500 }
    );
  }
}
