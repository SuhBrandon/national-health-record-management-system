import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Mock payment gateway responses
function simulatePaymentGateway(
  paymentMethod: string,
  amount: number
): { success: boolean; transactionId: string; message: string } {
  // Simulate occasional failures (10% failure rate)
  const success = Math.random() > 0.1;

  const transactionId = `${paymentMethod.replace(' ', '_').toUpperCase()}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  if (!success) {
    return {
      success: false,
      transactionId,
      message: 'Payment processing failed. Please try again.',
    };
  }

  return {
    success: true,
    transactionId,
    message: `Payment of ${amount} XOF processed successfully via ${paymentMethod}`,
  };
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
      paymentMethodId,
      amount,
      serviceId,
      prescriptionId,
      appointmentId,
      pharmacyId,
      hospitalId,
      reference,
    } = body;

    if (!paymentMethodId || !amount) {
      return NextResponse.json(
        { error: 'Payment method ID and amount are required' },
        { status: 400 }
      );
    }

    // Get payment method
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('id, name, is_active')
      .eq('id', paymentMethodId)
      .single();

    if (!paymentMethod || !paymentMethod.is_active) {
      return NextResponse.json(
        { error: 'Payment method is not available' },
        { status: 404 }
      );
    }

    // Simulate payment processing
    const gatewayResponse = simulatePaymentGateway(paymentMethod.name, amount);

    const transactionStatus = gatewayResponse.success ? 'completed' : 'failed';

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        service_id: serviceId || null,
        amount,
        currency: 'XOF',
        payment_method_id: paymentMethodId,
        transaction_type: 'payment',
        status: transactionStatus,
        reference_number: reference || `TXN_${Date.now()}`,
        external_transaction_id: gatewayResponse.transactionId,
        pharmacy_id: pharmacyId || null,
        hospital_id: hospitalId || null,
        prescription_id: prescriptionId || null,
        appointment_id: appointmentId || null,
        notes: gatewayResponse.message,
        processed_date: gatewayResponse.success ? new Date().toISOString() : null,
      })
      .select();

    if (transactionError) {
      throw transactionError;
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'payment_processed',
        entity_type: 'transactions',
        entity_id: transaction[0].id,
        new_values: {
          amount,
          payment_method: paymentMethod.name,
          status: transactionStatus,
        },
      });

    if (!gatewayResponse.success) {
      return NextResponse.json(
        {
          success: false,
          transaction: transaction[0],
          message: gatewayResponse.message,
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        transaction: transaction[0],
        message: gatewayResponse.message,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[v0] Payment processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
  }
}
