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

    console.log('Testing simple Claude API call...');

    // Very simple test call to Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say hello'
          }
        ],
      }),
    });

    console.log('Claude API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Claude API call successful');

    // Return simple results for now
    const analysisResults = {
      analysis_date: new Date().toISOString().split('T')[0],
      companies: companies.map(company => ({
        name: company,
        overall_rating: 'good',
        risk_level: 'medium',
        key_strengths: ['Market presence', 'Financial stability'],
        key_weaknesses: ['Market volatility', 'Competition'],
        recommendations: 'Continue monitoring financial metrics',
        claude_test: data.content[0].text
      }))
    };

    console.log('Analysis completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      results: analysisResults 
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