import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let assessmentId = null;
  
  try {
    const requestBody = await req.json();
    const { companies } = requestBody;
    assessmentId = requestBody.assessmentId;
    
    console.log('Debug: Starting analysis with companies:', companies);
    
    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      throw new Error('Companies array is required');
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Use hardcoded Supabase credentials since env vars might not be available
    const supabaseUrl = 'https://hfanttpnvznwnunjmjee.supabase.co';
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW50dHBudnpud251bmptamVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMzU4NjUsImV4cCI6MjA2ODkxMTg2NX0.1YNeXS8DmlF5rStVS4iSykm-7i8aBhiX7kfvEEExE5A'; // Using anon key for now
    
    console.log('Debug: Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update assessment status to processing
    if (assessmentId) {
      await supabase
        .from('assessments')
        .update({ status: 'processing' })
        .eq('id', assessmentId);
    }

    console.log(`Starting financial analysis for companies: ${companies.join(', ')}`);

    // Create detailed prompt for Claude
    const prompt = `Please perform a comprehensive financial risk assessment for the following companies: ${companies.join(', ')}.

For each company, please analyze and provide:

1. **Altman Z-Score Analysis**:
   - Calculate or estimate the Altman Z-Score based on available financial data
   - Interpret the score (Safe zone >2.99, Grey zone 1.8-2.99, Distress zone <1.8)
   - Explain the components and their significance

2. **Financial Ratios Analysis**:
   - **Liquidity Ratios**: Current ratio, Quick ratio, Cash ratio
   - **Solvency Ratios**: Debt-to-equity, Times interest earned, Debt service coverage
   - **Profitability Ratios**: ROE, ROA, Gross margin, Net margin, Operating margin

3. **Financial Health Timeline** (last 5-10 years where data available):
   - Revenue trends
   - Profit margin evolution
   - Debt levels progression
   - Key financial milestones or changes

4. **Risk Assessment**:
   - Credit risk level (Low/Medium/High)
   - Industry-specific risks
   - Market position and competitive advantages
   - Recent financial performance trends

5. **Summary & Recommendations**:
   - Overall financial health rating
   - Key strengths and weaknesses
   - Investment/lending recommendations
   - Future outlook and potential risks

Please structure your response as a detailed JSON object with the following format:
{
  "analysis_date": "current_date",
  "companies": [
    {
      "name": "Company Name",
      "altman_z_score": {
        "score": number_or_null,
        "zone": "safe|grey|distress|unknown",
        "interpretation": "detailed explanation"
      },
      "liquidity_ratios": {
        "current_ratio": number_or_null,
        "quick_ratio": number_or_null,
        "cash_ratio": number_or_null,
        "analysis": "explanation"
      },
      "solvency_ratios": {
        "debt_to_equity": number_or_null,
        "times_interest_earned": number_or_null,
        "debt_service_coverage": number_or_null,
        "analysis": "explanation"
      },
      "profitability_ratios": {
        "roe": number_or_null,
        "roa": number_or_null,
        "gross_margin": number_or_null,
        "net_margin": number_or_null,
        "operating_margin": number_or_null,
        "analysis": "explanation"
      },
      "financial_timeline": [
        {
          "year": number,
          "revenue": number_or_null,
          "net_income": number_or_null,
          "total_debt": number_or_null,
          "key_events": "notable events or changes"
        }
      ],
      "risk_assessment": {
        "credit_risk_level": "low|medium|high",
        "industry_risks": ["list of risks"],
        "market_position": "description",
        "recent_performance": "analysis"
      },
      "overall_rating": "excellent|good|fair|poor|critical",
      "key_strengths": ["list of strengths"],
      "key_weaknesses": ["list of weaknesses"],
      "recommendations": "detailed recommendations",
      "future_outlook": "analysis of future prospects"
    }
  ],
  "portfolio_summary": {
    "average_risk_level": "low|medium|high",
    "diversification_analysis": "analysis",
    "overall_recommendations": "portfolio-level recommendations"
  }
}

Please be as detailed as possible while using actual financial data where available. If specific data is not available, please indicate this clearly and provide estimates based on industry standards or publicly available information.`;

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
        max_tokens: 8000,
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
      console.error('Claude API error response:', errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const analysisText = data.content[0].text;
    
    // Parse the JSON response from Claude
    let analysisResults;
    try {
      // Extract JSON from the response (Claude might wrap it in markdown)
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                       analysisText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        analysisResults = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        // If no JSON found, create a structured response
        analysisResults = {
          analysis_date: new Date().toISOString().split('T')[0],
          companies: companies.map(company => ({
            name: company,
            analysis_text: analysisText,
            overall_rating: 'unknown'
          })),
          raw_response: analysisText
        };
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      analysisResults = {
        analysis_date: new Date().toISOString().split('T')[0],
        companies: companies.map(company => ({
          name: company,
          analysis_text: analysisText,
          overall_rating: 'unknown'
        })),
        raw_response: analysisText,
        parse_error: parseError.message
      };
    }

    // Update assessment with results
    if (assessmentId) {
      await supabase
        .from('assessments')
        .update({ 
          status: 'completed',
          results: analysisResults
        })
        .eq('id', assessmentId);
    }

    console.log('Financial analysis completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      results: analysisResults 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in financial analysis:', error);
    
    // Try to update assessment status to failed
    if (assessmentId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('assessments')
          .update({ status: 'failed' })
          .eq('id', assessmentId);
      } catch (updateError) {
        console.error('Failed to update assessment status:', updateError);
      }
    }

    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});