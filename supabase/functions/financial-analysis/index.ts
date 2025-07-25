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
    console.log('Anthropic API key exists:', !!anthropicKey);
    
    if (!anthropicKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Now try Anthropic API call
    console.log('Calling Anthropic API...');
    
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `You are a financial analyst. You must return ONLY valid JSON in the exact format specified. Do not include any text before or after the JSON.

MANDATORY DATA SOURCE REQUIREMENTS - READ THIS CAREFULLY:
**ONLY USE FULL-YEAR ANNUAL FINANCIAL STATEMENTS - NO EXCEPTIONS**
- For companies reporting in 2025: Use ONLY their 2024 year-end (December 31, 2024) annual financial statements
- For companies reporting in 2024: Use ONLY their 2023 year-end annual financial statements  
- NEVER use quarterly reports (Q1, Q2, Q3, Q4), interim reports, or trailing twelve months (TTM)
- NEVER annualize or estimate data from partial periods
- NEVER use current year partial data or projections
- Source: 10-K filings, annual reports, audited year-end financial statements ONLY

VERIFICATION STEPS YOU MUST FOLLOW:
1. Identify the company's most recent completed fiscal year (usually December 31)
2. Locate their official 10-K or annual report for that completed year
3. Extract financial data ONLY from that single annual report
4. Double-check that you are NOT using any quarterly or interim data
5. Calculate all ratios using these verified annual figures

Analyze these companies: ${companies.join(', ')}. For each company, determine the appropriate Altman Z-score formula based on company type:
CALCULATION BREAKDOWN REQUIREMENTS:
- For "calculation_steps", show EVERY component calculation with actual financial statement numbers
- Example: Show "Current Assets: $45,000M, Current Liabilities: $35,000M, Working Capital = $45,000M - $35,000M = $10,000M"
- Break down each ratio calculation showing the numerator, denominator, and actual dollar amounts from financial statements
- Show the step-by-step arithmetic for the final Z-score calculation with all intermediate values

ALTMAN Z-SCORE FORMULAS BY COMPANY TYPE:
1. Public Manufacturing Companies: Z = 1.2X₁ + 1.4X₂ + 3.3X₃ + 0.6X₄ + 1.0X₅ (Safe if > 2.99, Grey zone 1.8-2.99, Distress < 1.8)
2. Private Companies: Z = 0.717X₁ + 0.847X₂ + 3.107X₃ + 0.420X₄ + 0.998X₅ (Safe if > 2.6, Grey zone 1.1-2.6, Distress < 1.1)
3. Public Non-Manufacturing (Service/Tech): Z = 6.56X₁ + 3.26X₂ + 6.72X₃ + 1.05X₄ (Safe if > 2.6, Grey zone 1.1-2.6, Distress < 1.1)

Where: X₁ = Working Capital/Total Assets, X₂ = Retained Earnings/Total Assets, X₃ = EBIT/Total Assets, X₄ = Market Value Equity/Total Debt, X₅ = Sales/Total Assets

Return ONLY a JSON object with this exact structure:

{
  "companies": [
    {
      "name": "Company Name",
      "overall_rating": "excellent|good|fair|poor|critical",
      "risk_level": "low|medium|high",
      "company_type": "public_manufacturing|private|public_non_manufacturing",
      "altman_z_score": {
        "score": 2.5,
        "zone": "safe|grey|distress",
        "formula_used": "public_manufacturing|private|public_non_manufacturing",
        "safe_threshold": 2.99,
        "calculation_details": {
          "working_capital_total_assets": 0.2,
          "retained_earnings_total_assets": 0.15,
          "ebit_total_assets": 0.12,
          "market_value_equity_total_debt": 0.8,
          "sales_total_assets": 1.1,
          "formula_components": {
            "X1": "Working Capital / Total Assets",
            "X2": "Retained Earnings / Total Assets", 
            "X3": "EBIT / Total Assets",
            "X4": "Market Value of Equity / Total Debt",
            "X5": "Sales / Total Assets (only for manufacturing and private companies)"
          },
          "formula_coefficients": {
            "X1_coefficient": 1.2,
            "X2_coefficient": 1.4,
            "X3_coefficient": 3.3,
            "X4_coefficient": 0.6,
            "X5_coefficient": 1.0
          },
          "calculation_steps": [
            "Step 1: Identify company type: Public Manufacturing",
            "Step 2: Calculate X₁ (Working Capital / Total Assets) = 0.2",
            "Step 3: Calculate X₂ (Retained Earnings / Total Assets) = 0.15",
            "Step 4: Calculate X₃ (EBIT / Total Assets) = 0.12",
            "Step 5: Calculate X₄ (Market Value of Equity / Total Debt) = 0.8",
            "Step 6: Calculate X₅ (Sales / Total Assets) = 1.1",
            "Step 7: Apply formula: Z = 1.2(0.2) + 1.4(0.15) + 3.3(0.12) + 0.6(0.8) + 1.0(1.1) = 2.5",
            "Step 8: Compare to threshold: 2.5 < 2.99 = Grey Zone"
          ],
          "assumptions": [
            "Company classified as public manufacturing based on business model and listing status",
            "Market value of equity based on current market capitalization",
            "Working capital calculated as current assets minus current liabilities",
            "EBIT represents earnings before interest and taxes",
            "Total debt includes both short-term and long-term debt",
            "Formula selection based on company type and industry classification"
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

    console.log('Anthropic response status:', anthropicResponse.status);

    let structuredResults = null;
    let analysisText = '';
    
    if (anthropicResponse.ok) {
      const anthropicData = await anthropicResponse.json();
      analysisText = anthropicData.content[0].text;
      console.log('Anthropic response received successfully');
      
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
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorText);
      analysisText = `Anthropic API Error (${anthropicResponse.status}): ${errorText}`;
    }
    
    // Create results object - use structured data if available, fallback otherwise
    const results = {
      analysis_date: new Date().toISOString().split('T')[0],
      ai_status: anthropicResponse.ok ? 'success' : 'failed',
      ai_error: anthropicResponse.ok ? null : `Status: ${anthropicResponse.status}`,
      analysis: !structuredResults ? analysisText : 'Structured analysis completed successfully',
      companies: structuredResults?.companies || companies.map(company => ({
        name: company,
        overall_rating: anthropicResponse.ok ? 'analyzed' : 'error', 
        risk_level: anthropicResponse.ok ? 'medium' : 'unknown',
        key_strengths: anthropicResponse.ok ? ['Market presence', 'Financial stability'] : ['Anthropic API Error'],
        key_weaknesses: anthropicResponse.ok ? ['Market volatility', 'Competition'] : ['Analysis failed'],
        recommendations: anthropicResponse.ok ? 'See analysis above' : analysisText.substring(0, 100) + '...',
        ai_working: anthropicResponse.ok
      })),
      portfolio_summary: structuredResults?.portfolio_summary || null,
      debug_info: {
        ai_response_status: anthropicResponse.status,
        api_key_length: anthropicKey?.length || 0,
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