import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get patient ID from user
    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!patientData) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    // Get hospital transfers
    const { data: transfers, error } = await supabase
      .from('patient_transfers')
      .select(`
        id,
        from_hospital_id,
        to_hospital_id,
        transfer_date,
        transfer_reason,
        status,
        from_hospital:hospitals!from_hospital_id(id, name, city),
        to_hospital:hospitals!to_hospital_id(id, name, city),
        transferred_by_doctor:doctors(user:users(first_name, last_name))
      `)
      .eq('patient_id', patientData.id)
      .order('transfer_date', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ transfers }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Hospital transfers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch hospital transfers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, toHospitalId, transferReason, notes } = body;

    // Verify user is a doctor
    const { data: doctorData } = await supabase
      .from('doctors')
      .select('id, hospital_id')
      .eq('user_id', user.id)
      .single();

    if (!doctorData) {
      return NextResponse.json(
        { error: 'Only doctors can create transfers' },
        { status: 403 }
      );
    }

    // Get patient's current hospital
    const { data: currentVisit } = await supabase
      .from('hospital_visits')
      .select('hospital_id')
      .eq('patient_id', patientId)
      .eq('is_current', true)
      .single();

    if (!currentVisit) {
      return NextResponse.json(
        { error: 'Patient has no active hospital visit' },
        { status: 404 }
      );
    }

    // Create transfer record
    const { data: transfer, error } = await supabase
      .from('patient_transfers')
      .insert({
        patient_id: patientId,
        from_hospital_id: currentVisit.hospital_id,
        to_hospital_id: toHospitalId,
        transfer_date: new Date().toISOString(),
        transfer_reason: transferReason,
        transferred_by_doctor_id: doctorData.id,
        status: 'completed',
        notes,
      })
      .select();

    if (error) {
      throw error;
    }

    // Update hospital visit to mark as discharged
    await supabase
      .from('hospital_visits')
      .update({
        discharge_date: new Date().toISOString(),
        discharge_reason: 'Transfer to another hospital',
        is_current: false,
      })
      .eq('id', currentVisit.id);

    // Create new hospital visit at the new hospital
    await supabase
      .from('hospital_visits')
      .insert({
        patient_id: patientId,
        hospital_id: toHospitalId,
        admission_date: new Date().toISOString(),
        reason_for_visit: `Transfer from another hospital: ${transferReason}`,
        admission_type: 'transfer',
        is_current: true,
      });

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'patient_transfer_created',
        entity_type: 'patient_transfers',
        entity_id: transfer[0].id,
        new_values: transfer[0],
      });

    return NextResponse.json({ transfer: transfer[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[v0] Transfer creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create transfer' },
      { status: 500 }
    );
  }
}
