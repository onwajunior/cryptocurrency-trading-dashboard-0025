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
        max_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst. You must return ONLY valid JSON in the exact format specified. Do not include any text before or after the JSON.'
          },
          {
            role: 'user',
            content: `Analyze these companies: ${companies.join(', ')}. Return ONLY a JSON object with this exact structure:

{
  "companies": [
    {
      "name": "Company Name",
      "overall_rating": "excellent|good|fair|poor|critical",
      "risk_level": "low|medium|high",
      "altman_z_score": {
        "score": 2.5,
        "zone": "safe|grey|distress",
        "calculation_details": {
          "working_capital_total_assets": 0.2,
          "retained_earnings_total_assets": 0.15,
          "ebit_total_assets": 0.12,
          "market_value_equity_total_debt": 0.8,
          "sales_total_assets": 1.1,
          "formula_components": {
            "A": "Working Capital / Total Assets",
            "B": "Retained Earnings / Total Assets", 
            "C": "EBIT / Total Assets",
            "D": "Market Value of Equity / Total Debt",
            "E": "Sales / Total Assets"
          },
          "calculation_steps": [
            "Step 1: Calculate Working Capital / Total Assets = 0.2",
            "Step 2: Calculate Retained Earnings / Total Assets = 0.15",
            "Step 3: Calculate EBIT / Total Assets = 0.12",
            "Step 4: Calculate Market Value of Equity / Total Debt = 0.8",
            "Step 5: Calculate Sales / Total Assets = 1.1",
            "Step 6: Apply formula: Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E"
          ],
          "assumptions": [
            "Market value of equity based on current market capitalization",
            "Working capital calculated as current assets minus current liabilities",
            "EBIT represents earnings before interest and taxes",
            "Total debt includes both short-term and long-term debt"
          ]
        },
        "historical_trend": [
          {"year": 2020, "z_score": 2.1},
          {"year": 2021, "z_score": 2.3},
          {"year": 2022, "z_score": 2.2},
          {"year": 2023, "z_score": 2.4},
          {"year": 2024, "z_score": 2.5}
        ]
      },
      "liquidity_ratios": {
        "current_ratio": 1.5,
        "quick_ratio": 1.2,
        "cash_ratio": 0.3
      },
      "solvency_ratios": {
        "debt_to_equity": 0.4,
        "times_interest_earned": 8.5
      },
      "profitability_ratios": {
        "roe": 0.15,
        "roa": 0.08,
        "net_margin": 0.12
      },
      "financial_timeline": [
        {
          "year": 2024,
          "revenue": 400000000000,
          "net_income": 50000000000,
          "total_debt": 100000000000,
          "key_events": "Major product launch"
        }
      ],
      "risk_assessment": {
        "credit_risk_level": "low|medium|high",
        "market_position": "Description",
        "industry_risks": ["Risk 1", "Risk 2"],
        "recent_performance": "Description"
      },
      "key_strengths": ["Strength 1", "Strength 2", "Strength 3"],
      "key_weaknesses": ["Weakness 1", "Weakness 2"],
      "recommendations": "Investment recommendation",
      "future_outlook": "Future outlook description"
    }
  ],
  "portfolio_summary": {
    "average_risk_level": "low|medium|high",
    "diversification_analysis": "Analysis of portfolio diversification",
    "overall_recommendations": "Portfolio recommendations",
    "zscore_trend": [
      {"year": 2020, "zscore": 2.1},
      {"year": 2021, "zscore": 2.3},
      {"year": 2022, "zscore": 2.2},
      {"year": 2023, "zscore": 2.4},
      {"year": 2024, "zscore": 2.5}
    ]
  }
}

Use realistic financial data and ratios for each company. Include 5-10 years of timeline data (no more than 10 years back). Calculate proper Altman Z-scores (>2.99=safe, 1.8-2.99=grey, <1.8=distress). Return ONLY the JSON, no other text.`
          }
        ],
      }),
    });

    console.log('OpenAI response status:', openaiResponse.status);

    let structuredResults = null;
    let analysisText = '';
    
    if (openaiResponse.ok) {
      const openaiData = await openaiResponse.json();
      analysisText = openaiData.choices[0].message.content;
      console.log('OpenAI response received successfully');
      
      // Try to parse the JSON response
      try {
        structuredResults = JSON.parse(analysisText);
        console.log('Successfully parsed structured data');
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        console.log('Raw response:', analysisText);
        structuredResults = null;
      }
    } else {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      analysisText = `OpenAI API Error (${openaiResponse.status}): ${errorText}`;
    }
    
    // Create results object - use structured data if available, fallback otherwise
    const results = {
      analysis_date: new Date().toISOString().split('T')[0],
      ai_status: openaiResponse.ok ? 'success' : 'failed',
      ai_error: openaiResponse.ok ? null : `Status: ${openaiResponse.status}`,
      analysis: !structuredResults ? analysisText : 'Structured analysis completed successfully',
      companies: structuredResults?.companies || companies.map(company => ({
        name: company,
        overall_rating: openaiResponse.ok ? 'analyzed' : 'error', 
        risk_level: openaiResponse.ok ? 'medium' : 'unknown',
        key_strengths: openaiResponse.ok ? ['Market presence', 'Financial stability'] : ['OpenAI API Error'],
        key_weaknesses: openaiResponse.ok ? ['Market volatility', 'Competition'] : ['Analysis failed'],
        recommendations: openaiResponse.ok ? 'See analysis above' : analysisText.substring(0, 100) + '...',
        ai_working: openaiResponse.ok
      })),
      portfolio_summary: structuredResults?.portfolio_summary || null,
      debug_info: {
        ai_response_status: openaiResponse.status,
        api_key_length: openaiKey?.length || 0,
        timestamp: new Date().toISOString(),
        structured_data_parsed: !!structuredResults
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