import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const pharmacyId = req.nextUrl.searchParams.get('pharmacyId');
    const drugName = req.nextUrl.searchParams.get('drugName');

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let query = adminClient
      .from('pharmacy_inventory')
      .select('*')
      .order('drug_name', { ascending: true });

    if (pharmacyId) {
      query = query.eq('pharmacy_id', pharmacyId);
    }
    if (drugName) {
      query = query.ilike('drug_name', `%${drugName}%`);
    }

    const { data: inventory, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ inventory });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      pharmacyId,
      drugName,
      stockLevel,
      expiryDate,
      price,
      unit,
    } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: item, error } = await adminClient
      .from('pharmacy_inventory')
      .insert({
        pharmacy_id: pharmacyId,
        drug_name: drugName,
        stock_level: stockLevel,
        expiry_date: expiryDate,
        price,
        unit,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, stockLevel, expiryDate, price } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const updateData: any = {};
    if (stockLevel !== undefined) updateData.stock_level = stockLevel;
    if (expiryDate) updateData.expiry_date = expiryDate;
    if (price !== undefined) updateData.price = price;

    const { data: item, error } = await adminClient
      .from('pharmacy_inventory')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await adminClient
      .from('pharmacy_inventory')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
