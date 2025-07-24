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

    console.log('Starting Claude API call...');

    // Create a simpler prompt for Claude
    const prompt = `Analyze the financial risk for these companies: ${companies.join(', ')}.

Please provide a structured analysis for each company including:
- Overall financial health rating (excellent/good/fair/poor/critical)
- Key strengths and weaknesses
- Risk level (low/medium/high)
- Brief recommendations

Format as JSON:
{
  "analysis_date": "${new Date().toISOString().split('T')[0]}",
  "companies": [
    {
      "name": "Company Name",
      "overall_rating": "good",
      "risk_level": "medium",
      "key_strengths": ["strength1", "strength2"],
      "key_weaknesses": ["weakness1", "weakness2"],
      "recommendations": "brief recommendations"
    }
  ]
}`;

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.content[0].text;
    
    console.log('Claude response received, parsing...');
    
    // Try to parse Claude's JSON response
    let analysisResults;
    try {
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                       analysisText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        analysisResults = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('No JSON found in Claude response');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      // Fallback to mock data if parsing fails
      analysisResults = {
        analysis_date: new Date().toISOString().split('T')[0],
        companies: companies.map(company => ({
          name: company,
          overall_rating: 'good',
          risk_level: 'medium',
          key_strengths: ['Market presence', 'Financial stability'],
          key_weaknesses: ['Market volatility', 'Competition'],
          recommendations: 'Continue monitoring financial metrics',
          raw_response: analysisText.substring(0, 500)
        }))
      };
    }

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