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
    
    console.log('Starting analysis for companies:', companies);
    
    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      throw new Error('Companies array is required');
    }
    
    // Check environment variables
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    console.log('API key exists:', !!anthropicKey);
    
    if (!anthropicKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Now try Claude API call
    console.log('Calling Claude API...');
    
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Provide a brief financial risk analysis for: ${companies.join(', ')}. Rate each as low/medium/high risk with 2-3 key points.`
          }
        ],
      }),
    });

    console.log('Claude response status:', claudeResponse.status);

    let claudeText = '';
    if (claudeResponse.ok) {
      const claudeData = await claudeResponse.json();
      claudeText = claudeData.content[0].text;
      console.log('Claude response received successfully');
    } else {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errorText);
      claudeText = `Claude API error: ${claudeResponse.status} - ${errorText}`;
    }
    
    // Create structured results
    const results = {
      analysis_date: new Date().toISOString().split('T')[0],
      companies: companies.map(company => ({
        name: company,
        overall_rating: 'good',
        risk_level: 'medium', 
        key_strengths: ['Market presence', 'Financial stability'],
        key_weaknesses: ['Market volatility', 'Competition'],
        recommendations: 'Continue monitoring financial metrics'
      })),
      claude_analysis: claudeText,
      status: 'completed'
    };

    return new Response(JSON.stringify({ 
      success: true, 
      results: results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});