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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
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

    console.log('Claude response status:', claudeResponse.status);

    let claudeText = '';
    if (claudeResponse.ok) {
      const claudeData = await claudeResponse.json();
      claudeText = claudeData.content[0].text;
      console.log('Claude response received successfully');
    } else {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errorText);
      claudeText = `Claude API Error (${claudeResponse.status}): ${errorText}`;
    }
    
    // Create structured results with Claude analysis
    const results = {
      analysis_date: new Date().toISOString().split('T')[0],
      claude_status: claudeResponse.ok ? 'success' : 'failed',
      claude_error: claudeResponse.ok ? null : `Status: ${claudeResponse.status}`,
      claude_analysis: claudeText,
      companies: companies.map(company => ({
        name: company,
        overall_rating: claudeResponse.ok ? 'analyzed' : 'error', 
        risk_level: claudeResponse.ok ? 'medium' : 'unknown',
        key_strengths: claudeResponse.ok ? ['Market presence', 'Financial stability'] : ['Claude API Error'],
        key_weaknesses: claudeResponse.ok ? ['Market volatility', 'Competition'] : ['Analysis failed'],
        recommendations: claudeResponse.ok ? 'See Claude analysis above' : claudeText.substring(0, 100) + '...',
        claude_working: claudeResponse.ok
      })),
      debug_info: {
        claude_response_status: claudeResponse.status,
        api_key_length: anthropicKey?.length || 0,
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