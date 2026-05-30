import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const patientId = req.nextUrl.searchParams.get('patientId');
    const status = req.nextUrl.searchParams.get('status');

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let query = adminClient
      .from('online_prescriptions')
      .select('*')
      .order('submitted_date', { ascending: false });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    if (status) {
      query = query.eq('status', status);
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
    const { patientId, symptoms, problems } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: prescription, error } = await adminClient
      .from('online_prescriptions')
      .insert({
        patient_id: patientId,
        symptoms,
        problems,
        status: 'submitted',
        submitted_date: new Date().toISOString(),
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
    const {
      id,
      status,
      aiPrediction,
      aiConfidenceScore,
      reviewedByDoctorId,
      notes,
    } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: prescription, error } = await adminClient
      .from('online_prescriptions')
      .update({
        status,
        ai_prediction: aiPrediction,
        ai_confidence_score: aiConfidenceScore,
        reviewed_by_doctor_id: reviewedByDoctorId,
        notes,
      })
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
