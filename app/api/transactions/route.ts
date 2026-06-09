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
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('transactions')
      .select(`
        id,
        amount,
        currency,
        payment_method_id,
        transaction_type,
        status,
        reference_number,
        external_transaction_id,
        pharmacy_id,
        hospital_id,
        prescription_id,
        appointment_id,
        notes,
        processed_date,
        created_at,
        payment_method:payment_methods(name),
        service:services(name),
        pharmacy:pharmacies(name),
        hospital:hospitals(name),
        prescription:prescriptions(drug_name),
        appointment:appointments(appointment_date)
      `)
      .eq('user_id', user.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: transactions, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        transactions,
        pagination: {
          offset,
          limit,
          total: count,
          hasMore: (offset + limit) < (count || 0),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[v0] Transactions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
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
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Get transaction details
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        currency,
        payment_method_id,
        transaction_type,
        status,
        reference_number,
        created_at,
        payment_method:payment_methods(name),
        service:services(name)
      `)
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Generate receipt data (mock PDF generation)
    const receiptData = {
      transactionId: transaction.id,
      referenceNumber: transaction.reference_number,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.payment_method?.name,
      service: transaction.service?.name,
      date: new Date(transaction.created_at).toLocaleDateString(),
      status: transaction.status,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        receipt: receiptData,
        message: 'Receipt generated successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[v0] Receipt generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate receipt' },
      { status: 500 }
    );
  }
}
