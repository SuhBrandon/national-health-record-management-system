import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface VitalSign {
  patientId: string;
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  weight: number;
  notes: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      patientId,
      bloodPressure,
      heartRate,
      temperature,
      weight,
      notes,
    }: VitalSign = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Store vitals in medical records or create a vitals table
    // For now, store as JSON in a vitals_log table (we'll create this)
    const { data: vital, error } = await adminClient
      .from('vitals_log')
      .insert({
        patient_id: patientId,
        blood_pressure: bloodPressure,
        heart_rate: heartRate,
        temperature,
        weight,
        notes,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ vital }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const patientId = req.nextUrl.searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId required' },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: vitals, error } = await adminClient
      .from('vitals_log')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ vitals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
