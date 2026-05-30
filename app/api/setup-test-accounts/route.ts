import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Test account credentials with hospital/pharmacy assignments
const TEST_ACCOUNTS = [
  { email: 'patient@test.com', name: 'John Patient', role: 'patient' },
  { email: 'doctor@test.com', name: 'Sarah Doctor', role: 'doctor' },
  { email: 'nurse@test.com', name: 'Emily Nurse', role: 'nurse' },
  { email: 'labstaff@test.com', name: 'Michael LabTech', role: 'lab_staff' },
  { email: 'pharmacist@test.com', name: 'Jennifer Pharmacist', role: 'pharmacist' },
  { email: 'admin@test.com', name: 'David Admin', role: 'admin' },
  { email: 'compliance@test.com', name: 'Lisa CompOfficer', role: 'compliance_officer' },
  { email: 'sysadmin@test.com', name: 'Robert SysAdmin', role: 'system_admin' },
];

// Known hospital and pharmacy IDs
const CENTRAL_HOSPITAL_ID = '550e8400-e29b-41d4-a716-446655440000';
const CENTRAL_PHARMACY_ID = '660e8400-e29b-41d4-a716-446655440000';

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
        // Create auth user with service role
        const { data, error } = await adminClient.auth.admin.createUser({
          email: account.email,
          password: 'password123',
          email_confirm: true,
          user_metadata: {
            first_name: account.name.split(' ')[0],
            last_name: account.name.split(' ')[1],
          },
        });

        if (error) {
          results.push({
            email: account.email,
            status: 'error',
            message: error.message,
          });
          continue;
        }

        if (!data.user) {
          results.push({
            email: account.email,
            status: 'error',
            message: 'User creation returned no user data',
          });
          continue;
        }

        // Get the role ID
        const { data: roleData } = await adminClient
          .from('roles')
          .select('id')
          .eq('name', account.role)
          .single();

        if (!roleData) {
          results.push({
            email: account.email,
            status: 'error',
            message: `Role '${account.role}' not found`,
          });
          continue;
        }

        // Insert or update user profile
        const { error: userError } = await adminClient
          .from('users')
          .upsert({
            id: data.user.id,
            email: account.email,
            first_name: account.name.split(' ')[0],
            last_name: account.name.split(' ')[1],
            role_id: roleData.id,
            hospital_id: ['doctor', 'nurse', 'lab_staff'].includes(account.role) ? CENTRAL_HOSPITAL_ID : null,
            pharmacy_id: account.role === 'pharmacist' ? CENTRAL_PHARMACY_ID : null,
          }, { onConflict: 'id' });

        if (userError) {
          console.error('User upsert error:', userError);
        }

        // Create role-specific records
        if (account.role === 'patient') {
          await adminClient
            .from('patients')
            .insert({
              user_id: data.user.id,
              date_of_birth: '1990-05-15',
              gender: 'Other',
              blood_type: 'O+',
              allergies: 'None',
            });
        } else if (account.role === 'doctor') {
          await adminClient
            .from('doctors')
            .insert({
              user_id: data.user.id,
              license_number: `MD-${Math.random().toString(36).substring(7).toUpperCase()}`,
              specialization: 'General Practice',
              hospital_id: CENTRAL_HOSPITAL_ID,
            });
        } else if (account.role === 'nurse') {
          await adminClient
            .from('nurses')
            .insert({
              user_id: data.user.id,
              license_number: `RN-${Math.random().toString(36).substring(7).toUpperCase()}`,
              hospital_id: CENTRAL_HOSPITAL_ID,
            });
        } else if (account.role === 'lab_staff') {
          await adminClient
            .from('lab_staff')
            .insert({
              user_id: data.user.id,
              hospital_id: CENTRAL_HOSPITAL_ID,
              certification: 'MLT Certified',
            });
        } else if (account.role === 'pharmacist') {
          await adminClient
            .from('pharmacists')
            .insert({
              user_id: data.user.id,
              license_number: `RPH-${Math.random().toString(36).substring(7).toUpperCase()}`,
              pharmacy_id: CENTRAL_PHARMACY_ID,
            });
        }

        results.push({
          email: account.email,
          status: 'success',
          userId: data.user.id,
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
    console.error('[v0] Setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Setup failed' },
      { status: 500 }
    );
  }
}
