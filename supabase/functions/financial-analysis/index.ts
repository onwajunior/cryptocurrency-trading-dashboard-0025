import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companies, assessmentId } = await req.json();
    
    console.log('Received request with companies:', companies);
    console.log('Assessment ID:', assessmentId);
    
    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      throw new Error('Companies array is required');
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    console.log('Anthropic API key available:', !!anthropicApiKey);
    
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Simple mock response for now to test the basic flow
    const mockResults = {
      analysis_date: new Date().toISOString().split('T')[0],
      companies: companies.map(company => ({
        name: company,
        overall_rating: 'good',
        analysis_text: `Mock analysis for ${company}: This is a test response to verify the system is working.`,
        altman_z_score: { score: 2.5, zone: 'grey', interpretation: 'Moderate risk' },
        key_strengths: ['Strong market position', 'Good financial performance'],
        key_weaknesses: ['Market volatility', 'Competition'],
        recommendations: 'Continue monitoring financial metrics'
      })),
      portfolio_summary: {
        average_risk_level: 'medium',
        overall_recommendations: 'Diversified portfolio with moderate risk levels'
      }
    };

    console.log('Returning mock results for testing');

    return new Response(JSON.stringify({ 
      success: true, 
      results: mockResults 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in financial analysis:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});