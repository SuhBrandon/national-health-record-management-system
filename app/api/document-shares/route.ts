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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document and verify access
    const { data: document } = await supabase
      .from('medical_documents')
      .select('patient_id')
      .eq('id', documentId)
      .single();

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify patient owns document
    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!patientData || patientData.id !== document.patient_id) {
      return NextResponse.json(
        { error: 'Not authorized to view shares for this document' },
        { status: 403 }
      );
    }

    // Get all shares for this document
    const { data: shares, error } = await supabase
      .from('document_shares')
      .select(`
        id,
        shared_with_doctor_id,
        shared_date,
        access_expiry_date,
        can_download,
        can_share_further,
        doctor:doctors(user:users(first_name, last_name, email, hospital:hospitals(name)))
      `)
      .eq('document_id', documentId)
      .order('shared_date', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ shares }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Document shares error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch document shares' },
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
    const {
      documentId,
      doctorId,
      canDownload = true,
      canShareFurther = false,
      expiryDate,
    } = body;

    if (!documentId || !doctorId) {
      return NextResponse.json(
        { error: 'Document ID and Doctor ID are required' },
        { status: 400 }
      );
    }

    // Get document and verify patient owns it
    const { data: document } = await supabase
      .from('medical_documents')
      .select('patient_id')
      .eq('id', documentId)
      .single();

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!patientData || patientData.id !== document.patient_id) {
      return NextResponse.json(
        { error: 'Not authorized to share this document' },
        { status: 403 }
      );
    }

    // Verify doctor exists
    const { data: doctorExists } = await supabase
      .from('doctors')
      .select('id')
      .eq('id', doctorId)
      .single();

    if (!doctorExists) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Create share record
    const { data: share, error } = await supabase
      .from('document_shares')
      .insert({
        document_id: documentId,
        shared_with_doctor_id: doctorId,
        shared_by_patient: true,
        shared_date: new Date().toISOString(),
        access_expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
        can_download: canDownload,
        can_share_further: canShareFurther,
      })
      .select();

    if (error) {
      if (error.message.includes('duplicate')) {
        return NextResponse.json(
          { error: 'Document is already shared with this doctor' },
          { status: 409 }
        );
      }
      throw error;
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'document_shared',
        entity_type: 'document_shares',
        entity_id: share[0].id,
        new_values: {
          document_id: documentId,
          doctor_id: doctorId,
          can_download: canDownload,
        },
      });

    return NextResponse.json({ share: share[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[v0] Document share creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to share document' },
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
    const shareId = searchParams.get('id');

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    // Get share and verify patient owns the document
    const { data: share } = await supabase
      .from('document_shares')
      .select(`
        id,
        document:medical_documents(patient_id)
      `)
      .eq('id', shareId)
      .single();

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!patientData || patientData.id !== share.document.patient_id) {
      return NextResponse.json(
        { error: 'Not authorized to revoke this share' },
        { status: 403 }
      );
    }

    // Delete the share
    const { error: deleteError } = await supabase
      .from('document_shares')
      .delete()
      .eq('id', shareId);

    if (deleteError) {
      throw deleteError;
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'document_share_revoked',
        entity_type: 'document_shares',
        entity_id: shareId,
      });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Document share deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to revoke document share' },
      { status: 500 }
    );
  }
}
