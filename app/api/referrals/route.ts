import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const patientId = req.nextUrl.searchParams.get('patientId');
    const doctorId = req.nextUrl.searchParams.get('doctorId');

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let query = adminClient
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    if (doctorId) {
      query = query.or(
        `from_doctor_id.eq.${doctorId},to_doctor_id.eq.${doctorId}`
      );
    }

    const { data: referrals, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ referrals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      patientId,
      fromHospitalId,
      toHospitalId,
      fromDoctorId,
      toDoctorId,
      referralReason,
      medicalRecordId,
    } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: referral, error } = await adminClient
      .from('referrals')
      .insert({
        patient_id: patientId,
        from_hospital_id: fromHospitalId,
        to_hospital_id: toHospitalId,
        from_doctor_id: fromDoctorId,
        to_doctor_id: toDoctorId,
        referral_reason: referralReason,
        medical_record_id: medicalRecordId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ referral }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, status, acceptanceNotes } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: referral, error } = await adminClient
      .from('referrals')
      .update({
        status,
        acceptance_notes: acceptanceNotes,
        responded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ referral });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
