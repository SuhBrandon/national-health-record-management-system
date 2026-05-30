import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const patientId = req.nextUrl.searchParams.get('patientId');
    const doctorId = req.nextUrl.searchParams.get('doctorId');
    const status = req.nextUrl.searchParams.get('status');

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let query = adminClient
      .from('appointments')
      .select(`
        *,
        medical_center:medical_center_id (id, name, address, city, phone),
        patient:patient_id (id, user_id),
        doctor:doctor_id (id, user_id)
      `)
      .order('appointment_date', { ascending: false });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: appointments, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      patientId,
      doctorId,
      medicalCenterId,
      appointmentDate,
      reasonForVisit,
      consultationType,
      durationMinutes,
      notes,
    } = await req.json();

    if (!patientId || !doctorId || !medicalCenterId || !appointmentDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: appointment, error } = await adminClient
      .from('appointments')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        medical_center_id: medicalCenterId,
        appointment_date: appointmentDate,
        reason_for_visit: reasonForVisit,
        consultation_type: consultationType || 'in-person',
        duration_minutes: durationMinutes || 30,
        notes,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { appointmentId, ...updateData } = await req.json();

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID required' },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: appointment, error } = await adminClient
      .from('appointments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { appointmentId } = await req.json();

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID required' },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await adminClient
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

