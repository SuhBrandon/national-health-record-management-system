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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const hospitalId = searchParams.get('hospitalId');
    const specialization = searchParams.get('specialization');
    const city = searchParams.get('city');
    const minRating = searchParams.get('minRating');
    const isAvailable = searchParams.get('available') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryBuilder = supabase
      .from('doctors')
      .select(`
        id,
        user_id,
        license_number,
        specialization,
        bio,
        consultation_fee,
        is_available,
        rating,
        total_reviews,
        user:users(first_name, last_name, email, phone_number),
        hospital:hospitals(id, name, city, state_province, location),
        specializations:doctor_specializations(specialization, years_of_experience)
      `);

    // Apply filters
    if (query) {
      queryBuilder = queryBuilder.or(
        `user.first_name.ilike.%${query}%,user.last_name.ilike.%${query}%,specialization.ilike.%${query}%`
      );
    }

    if (hospitalId) {
      queryBuilder = queryBuilder.eq('hospital_id', hospitalId);
    }

    if (specialization) {
      queryBuilder = queryBuilder.ilike('specialization', `%${specialization}%`);
    }

    if (city) {
      queryBuilder = queryBuilder.eq('hospital.city', city);
    }

    if (minRating) {
      queryBuilder = queryBuilder.gte('rating', parseFloat(minRating));
    }

    if (isAvailable) {
      queryBuilder = queryBuilder.eq('is_available', true);
    }

    // Apply pagination
    queryBuilder = queryBuilder
      .range(offset, offset + limit - 1)
      .order('rating', { ascending: false })
      .order('total_reviews', { ascending: false });

    const { data: doctors, error, count } = await queryBuilder;

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        doctors,
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
    console.error('[v0] Doctor search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search doctors' },
      { status: 500 }
    );
  }
}
