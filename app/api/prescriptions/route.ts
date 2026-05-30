import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const patientId = req.nextUrl.searchParams.get('patientId');

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let query = adminClient
      .from('prescriptions')
      .select('*, medical_records(patient_id)')
      .order('created_at', { ascending: false });

    if (patientId) {
      query = query.eq('medical_records.patient_id', patientId);
    }

    const { data: prescriptions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prescriptions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      medicalRecordId,
      onlinePrescriptionId,
      drugName,
      dosage,
      frequency,
      duration,
      validatedBy,
      aiSuggestedBy,
    } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: prescription, error } = await adminClient
      .from('prescriptions')
      .insert({
        medical_record_id: medicalRecordId,
        online_prescription_id: onlinePrescriptionId,
        drug_name: drugName,
        dosage,
        frequency,
        duration,
        validated_by: validatedBy,
        ai_suggested_by: aiSuggestedBy,
        status: 'doctor_approved',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prescription }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, status } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: prescription, error } = await adminClient
      .from('prescriptions')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prescription });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
