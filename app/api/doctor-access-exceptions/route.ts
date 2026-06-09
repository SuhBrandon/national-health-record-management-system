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

    // Get all access exceptions
    const { data: exceptions, error } = await supabase
      .from('doctor_access_exceptions')
      .select(`
        id,
        attribute_name,
        access_date,
        expiry_date,
        notes,
        doctor:doctors(id, user:users(first_name, last_name, email, hospital:hospitals(name)))
      `)
      .eq('patient_id', patientData.id)
      .order('access_date', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ exceptions }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Access exceptions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch access exceptions' },
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
    const { doctorId, attributeName, expiryDate, notes } = body;

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

    // Create access exception
    const { data: exception, error } = await supabase
      .from('doctor_access_exceptions')
      .insert({
        patient_id: patientData.id,
        doctor_id: doctorId,
        attribute_name: attributeName,
        access_granted_by_patient: true,
        access_date: new Date().toISOString(),
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
        notes,
      })
      .select();

    if (error) {
      throw error;
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'doctor_access_exception_created',
        entity_type: 'doctor_access_exceptions',
        entity_id: exception[0].id,
        new_values: exception[0],
      });

    return NextResponse.json({ exception: exception[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[v0] Create access exception error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create access exception' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const exceptionId = searchParams.get('id');

    if (!exceptionId) {
      return NextResponse.json(
        { error: 'Exception ID is required' },
        { status: 400 }
      );
    }

    // Verify patient owns this exception
    const { data: exception } = await supabase
      .from('doctor_access_exceptions')
      .select('patient_id')
      .eq('id', exceptionId)
      .single();

    if (!exception) {
      return NextResponse.json(
        { error: 'Exception not found' },
        { status: 404 }
      );
    }

    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (exception.patient_id !== patientData?.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this exception' },
        { status: 403 }
      );
    }

    // Delete the exception
    const { error: deleteError } = await supabase
      .from('doctor_access_exceptions')
      .delete()
      .eq('id', exceptionId);

    if (deleteError) {
      throw deleteError;
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'doctor_access_exception_deleted',
        entity_type: 'doctor_access_exceptions',
        entity_id: exceptionId,
      });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Delete access exception error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete access exception' },
      { status: 500 }
    );
  }
}
