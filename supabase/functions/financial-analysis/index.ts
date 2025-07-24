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
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('API key exists:', !!openaiKey);
    
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Now try OpenAI API call
    console.log('Calling OpenAI API...');
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst providing comprehensive risk assessments for companies.'
          },
          {
            role: 'user',
            content: `Provide a comprehensive financial risk analysis for these companies: ${companies.join(', ')}. 

For each company, please provide:
1. Overall risk rating (Low/Medium/High)
2. Key financial strengths (2-3 points)
3. Key risks and weaknesses (2-3 points)
4. Investment recommendations

Format your response clearly for each company.`
          }
        ],
      }),
    });

    console.log('OpenAI response status:', openaiResponse.status);

    let analysisText = '';
    if (openaiResponse.ok) {
      const openaiData = await openaiResponse.json();
      analysisText = openaiData.choices[0].message.content;
      console.log('OpenAI response received successfully');
    } else {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      analysisText = `OpenAI API Error (${openaiResponse.status}): ${errorText}`;
    }
    
    // Create structured results with OpenAI analysis
    const results = {
      analysis_date: new Date().toISOString().split('T')[0],
      ai_status: openaiResponse.ok ? 'success' : 'failed',
      ai_error: openaiResponse.ok ? null : `Status: ${openaiResponse.status}`,
      analysis: analysisText,
      companies: companies.map(company => ({
        name: company,
        overall_rating: openaiResponse.ok ? 'analyzed' : 'error', 
        risk_level: openaiResponse.ok ? 'medium' : 'unknown',
        key_strengths: openaiResponse.ok ? ['Market presence', 'Financial stability'] : ['OpenAI API Error'],
        key_weaknesses: openaiResponse.ok ? ['Market volatility', 'Competition'] : ['Analysis failed'],
        recommendations: openaiResponse.ok ? 'See analysis above' : analysisText.substring(0, 100) + '...',
        ai_working: openaiResponse.ok
      })),
      debug_info: {
        ai_response_status: openaiResponse.status,
        api_key_length: openaiKey?.length || 0,
        timestamp: new Date().toISOString()
      }
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