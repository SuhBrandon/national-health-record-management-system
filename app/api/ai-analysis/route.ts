import { generateText, Output } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Define the diagnosis output schema
const diagnosisSchema = z.object({
  illness: z.string().describe('The predicted illness or condition'),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  alternatives: z.array(
    z.object({
      name: z.string().describe('Alternative diagnosis name'),
      confidence: z.number().min(0).max(1).describe('Confidence for this alternative'),
    })
  ).describe('Alternative diagnoses ranked by likelihood'),
  precautions: z.array(z.string()).describe('Recommended precautions and actions'),
  recommendedTests: z.array(z.string()).describe('Recommended lab tests or procedures'),
  severityLevel: z.enum(['mild', 'moderate', 'severe', 'critical']).describe('Severity assessment'),
});

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
    const { prescriptionId, symptoms, problems } = body;

    if (!prescriptionId || !symptoms) {
      return NextResponse.json(
        { error: 'Prescription ID and symptoms are required' },
        { status: 400 }
      );
    }

    // Build the medical analysis prompt
    const analysisPrompt = `You are a medical AI assistant analyzing patient symptoms to provide diagnostic insights. 

Patient reported symptoms: ${symptoms}
${problems ? `Additional problems: ${problems}` : ''}

Please analyze these symptoms and provide:
1. The most likely illness or condition
2. Your confidence level (0-1) in this diagnosis
3. Alternative diagnoses with confidence scores
4. Recommended precautions and immediate actions
5. Recommended laboratory tests or procedures
6. Severity level assessment

Remember: This is an AI-assisted preliminary analysis ONLY and not a replacement for professional medical diagnosis. Always recommend doctor consultation.

Provide your analysis in JSON format following the specified schema.`;

    // Call the AI model using Vercel AI Gateway
    const result = await generateText({
      model: 'openai/gpt-4o-mini', // Using a capable model available through Vercel AI Gateway
      system: 'You are a medical diagnostic assistant providing preliminary analysis of symptoms. You provide structured, JSON-formatted responses for medical analysis.',
      prompt: analysisPrompt,
      output: Output.object({
        schema: diagnosisSchema,
      }),
    });

    const analysis = result.output;

    // Store the AI prediction in the database
    const { data: prediction, error: predictionError } = await supabase
      .from('ai_predictions')
      .insert({
        online_prescription_id: prescriptionId,
        patient_id: null, // Will be set when we fetch the prescription
        model_version: 'gpt-4o-mini-v1',
        input_symptoms: symptoms,
        predicted_illness: analysis.illness,
        confidence_score: analysis.confidence,
        alternative_diagnoses: {
          alternatives: analysis.alternatives,
          severity: analysis.severityLevel,
        },
        suggested_precautions: analysis.precautions.join('\n'),
        analysis_timestamp: new Date().toISOString(),
        doctor_review_status: 'pending',
      })
      .select();

    if (predictionError) {
      console.error('[v0] Error storing prediction:', predictionError);
    }

    // Update the online prescription status
    if (predictionError === null && prediction) {
      await supabase
        .from('online_prescriptions')
        .update({
          status: 'ai_predicted',
          ai_prediction: {
            illness: analysis.illness,
            confidence: analysis.confidence,
            alternatives: analysis.alternatives,
          },
          ai_confidence_score: analysis.confidence,
          ai_analysis_date: new Date().toISOString(),
        })
        .eq('id', prescriptionId);
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'ai_analysis_performed',
        entity_type: 'ai_predictions',
        entity_id: prediction?.[0]?.id,
        new_values: {
          predicted_illness: analysis.illness,
          confidence: analysis.confidence,
        },
      });

    return NextResponse.json(
      {
        success: true,
        analysis: {
          primaryDiagnosis: analysis.illness,
          confidence: analysis.confidence,
          alternatives: analysis.alternatives,
          precautions: analysis.precautions,
          recommendedTests: analysis.recommendedTests,
          severityLevel: analysis.severityLevel,
        },
        prediction: prediction?.[0],
        message: 'AI analysis completed. Please consult with a doctor for professional diagnosis.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[v0] AI analysis error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to perform AI analysis',
        details: error.cause?.message,
      },
      { status: 500 }
    );
  }
}

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
    const prescriptionId = searchParams.get('prescriptionId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get patient ID
    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let query = supabase
      .from('ai_predictions')
      .select(`
        id,
        online_prescription_id,
        patient_id,
        model_version,
        input_symptoms,
        predicted_illness,
        confidence_score,
        alternative_diagnoses,
        suggested_precautions,
        analysis_timestamp,
        doctor_review_status,
        doctor_id,
        doctor_review_date,
        is_archived
      `);

    if (prescriptionId) {
      query = query.eq('online_prescription_id', prescriptionId);
    } else if (patientData) {
      query = query.eq('patient_id', patientData.id);
    }

    const { data: predictions, error, count } = await query
      .eq('is_archived', false)
      .order('analysis_timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        predictions,
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
    console.error('[v0] AI predictions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch AI predictions' },
      { status: 500 }
    );
  }
}
