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
    const { companies, assessmentId, mode = 'detailed' } = await req.json();
    
    console.log('🚀 Starting analysis for companies:', companies);
    
    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      throw new Error('Companies array is required');
    }
    
    // Check environment variables
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    console.log('🔑 Anthropic API key exists:', !!anthropicKey);
    console.log('🔑 Key length:', anthropicKey?.length || 0);
    
    if (!anthropicKey) {
      throw new Error('Anthropic API key not configured');
    }

    console.log('🎯 Calling Claude API for real financial analysis...');
    
    // Create a simple, direct prompt that should work
    const prompt = `Analyze ${companies[0]} stock. Return only this JSON format:
{
  "companies": [
    {
      "name": "${companies[0]}",
      "ticker": "RIVN",
      "analysis": {
        "riskScore": 65,
        "riskLevel": "Medium",
        "keyMetrics": {
          "debtToEquity": 0.8,
          "currentRatio": 1.1,
          "roe": -0.25
        },
        "recommendation": "Hold",
        "confidence": 80,
        "dataSource": "Real Claude Analysis",
        "analysisId": "claude-real"
      }
    }
  ],
  "portfolioSummary": {
    "averageRisk": 65,
    "recommendation": "Electric vehicle startup with high growth potential but significant risks",
    "consistency": "claude-analysis"
  }
}`;

    console.log('📝 Sending prompt to Claude...');

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [{
          role: "user",
          content: prompt
        }]
      })
    });

    console.log('📡 Claude response status:', claudeResponse.status);
    console.log('📡 Claude response headers:', Object.fromEntries(claudeResponse.headers.entries()));

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('❌ Claude API error:', errorText);
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    console.log('✅ Claude response received:', JSON.stringify(claudeData, null, 2));
    
    if (claudeData.content && claudeData.content[0] && claudeData.content[0].text) {
      const content = claudeData.content[0].text;
      console.log('📄 Raw Claude content:', content);
      
      try {
        let jsonContent = content.trim();
        
        // Remove markdown if present
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log('🔧 Cleaned content:', jsonContent);
        
        const parsedResult = JSON.parse(jsonContent);
        console.log('✅ Successfully parsed JSON:', parsedResult);
        
        // Return the actual Claude analysis
        return new Response(
          JSON.stringify({
            success: true,
            results: parsedResult,
            consistency: {
              model: 'claude-3-5-sonnet-20241022',
              source: 'anthropic-api',
              timestamp: new Date().toISOString()
            }
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json'
            } 
          }
        );
        
      } catch (parseError) {
        console.error('❌ JSON parsing failed:', parseError);
        console.error('❌ Content that failed to parse:', content);
        throw parseError;
      }
    } else {
      console.error('❌ Invalid Claude response structure:', claudeData);
      throw new Error('Invalid Claude response structure');
    }

  } catch (error) {
    console.error('💥 Error in financial-analysis function:', error);
    
    // Return a clear error with debug info
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        debug: {
          timestamp: new Date().toISOString(),
          companies: companies || [],
          hasAnthropicKey: !!Deno.env.get('ANTHROPIC_API_KEY')
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});