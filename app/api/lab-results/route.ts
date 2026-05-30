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
      .from('lab_results')
      .select('*')
      .order('upload_date', { ascending: false });

    if (patientId) {
      query = query
        .eq('medical_records.patient_id', patientId)
        .eq('medical_records', '*');
    }

    const { data: results, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      medicalRecordId,
      testName,
      result,
      unit,
      referenceRange,
      labValue,
      uploadedBy,
      fileUrl,
    } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: labResult, error } = await adminClient
      .from('lab_results')
      .insert({
        medical_record_id: medicalRecordId,
        test_name: testName,
        result,
        unit,
        reference_range: referenceRange,
        lab_value: labValue,
        uploaded_by: uploadedBy,
        file_url: fileUrl,
        upload_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ labResult }, { status: 201 });
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

    const { data: result, error } = await adminClient
      .from('lab_results')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
