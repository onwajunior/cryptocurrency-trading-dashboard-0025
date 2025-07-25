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
    
    console.log('Starting analysis for companies:', companies);
    
    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      throw new Error('Companies array is required');
    }
    
    // Check environment variables
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI API key exists:', !!openaiKey);
    
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Now try OpenAI API call
    console.log('Calling OpenAI API... Mode:', mode);
    
    const isQuickMode = mode === 'quick';
    const maxTokens = isQuickMode ? 2000 : 4000;
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst. You must return ONLY valid JSON in the exact format specified. Do not include any text before or after the JSON.'
          },
          {
            role: 'user',
            content: isQuickMode ? 
              `You are a financial analyst performing QUICK ANALYSIS. You must return ONLY valid JSON in the exact format specified. Do not include any text before or after the JSON.

QUICK ANALYSIS MODE - ESSENTIAL METRICS ONLY:
- Focus on core financial health indicators only
- Provide concise, essential data without extensive calculations
- Limit response to key ratios and Z-score
- No detailed timelines or extensive explanations

Analyze these companies: ${companies.join(', ')}. For each company, provide ONLY essential metrics:

Return ONLY a JSON object with this SIMPLIFIED structure:

{
  "companies": [
    {
      "name": "Company Name",
      "overall_rating": "excellent|good|fair|poor|critical",
      "risk_level": "low|medium|high",
      "altman_z_score": {
        "score": 2.5,
        "zone": "safe|grey|distress"
      },
      "key_ratios": {
        "current": 1.5,
        "debt_to_equity": 0.4,
        "roe": 0.15
      },
      "summary": "Brief one-sentence financial health summary"
    }
  ],
  "portfolio_summary": {
    "average_risk_level": "low|medium|high",
    "overall_recommendations": "Brief portfolio recommendation"
  }
}

Use realistic financial data. Keep responses concise. Return ONLY the JSON, no other text.` 
              : 
              `You are a financial analyst. You must return ONLY valid JSON in the exact format specified. Do not include any text before or after the JSON.

MANDATORY DATA SOURCE REQUIREMENTS - READ THIS CAREFULLY:
**ONLY USE FULL-YEAR ANNUAL FINANCIAL STATEMENTS - NO EXCEPTIONS**
- Dynamically determine the company's most recently available COMPLETE fiscal year data from their latest 10-K filing
- NEVER assume specific years like 2024, 2023, etc. - determine the actual latest completed fiscal year
- ENSURE YEAR ALIGNMENT: The year reported MUST match the actual fiscal year of the data being used
- NEVER use quarterly reports (Q1, Q2, Q3, Q4), interim reports, or trailing twelve months (TTM)
- NEVER annualize or estimate data from partial periods
- NEVER use current year partial data or projections
- Source: 10-K filings, annual reports, audited year-end financial statements ONLY

CRITICAL: Use actual calculated financial ratios only. Do not override or substitute them with scenario data, default values, or rounded assumptions. Use the direct result, even if negative or small. Explicitly prohibit the use of preconfigured scenarios, default ratios, or demo values. Every value must trace to a verifiable number from the financials.

CRITICAL YEAR REPORTING REQUIREMENT:
- DYNAMICALLY determine each company's most recent completed fiscal year (do not assume any specific year)
- The year reported in your response MUST match the actual fiscal year of the data being used
- The "financial_timeline" array must show the CORRECT fiscal years for each data point
- The "historical_trend" array must use ACTUAL fiscal years based on the company's filing history
- Work backwards chronologically from the most recent complete year

VERIFICATION STEPS YOU MUST FOLLOW:
1. Determine the current calendar year and month
2. Identify each company's fiscal year calendar (most end December 31, but some have different year-ends)
3. Determine the most recent COMPLETED fiscal year for each company
4. Locate their official 10-K or annual report for that completed year
5. Extract financial data ONLY from that single annual report
6. Ensure all years reported match the actual fiscal years of the data extracted
7. For historical data, use actual fiscal years from previous 10-K filings in chronological order

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
          {"year": "YEAR-4", "z_score": 2.1},
          {"year": "YEAR-3", "z_score": 2.3},
          {"year": "YEAR-2", "z_score": 2.2},
          {"year": "YEAR-1", "z_score": 2.4},
          {"year": "CURRENT_YEAR", "z_score": 2.5}
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
          "year": "CURRENT_YEAR",
          "revenue": 400000000000,
          "net_income": 50000000000,
          "total_debt": 100000000000,
          "current_ratio": 1.5,
          "quick_ratio": 1.2,
          "debt_to_equity": 0.4,
          "roe": 0.15,
          "roa": 0.08,
          "net_margin": 0.12,
          "times_interest_earned": 8.5,
          "key_events": "Major product launch"
        },
        {
          "year": "YEAR-1",
          "revenue": 380000000000,
          "net_income": 48000000000,
          "total_debt": 95000000000,
          "current_ratio": 1.4,
          "quick_ratio": 1.1,
          "debt_to_equity": 0.42,
          "roe": 0.14,
          "roa": 0.075,
          "net_margin": 0.11,
          "times_interest_earned": 8.2,
          "key_events": "Market expansion"
        },
        {
          "year": "YEAR-2",
          "revenue": 365000000000,
          "net_income": 45000000000,
          "total_debt": 90000000000,
          "current_ratio": 1.3,
          "quick_ratio": 1.0,
          "debt_to_equity": 0.45,
          "roe": 0.13,
          "roa": 0.07,
          "net_margin": 0.10,
          "times_interest_earned": 7.8,
          "key_events": "Digital transformation"
        },
        {
          "year": "YEAR-3",
          "revenue": 350000000000,
          "net_income": 42000000000,
          "total_debt": 85000000000,
          "current_ratio": 1.2,
          "quick_ratio": 0.9,
          "debt_to_equity": 0.48,
          "roe": 0.12,
          "roa": 0.065,
          "net_margin": 0.095,
          "times_interest_earned": 7.5,
          "key_events": "Pandemic response"
        },
        {
          "year": "YEAR-4",
          "revenue": 335000000000,
          "net_income": 40000000000,
          "total_debt": 80000000000,
          "current_ratio": 1.1,
          "quick_ratio": 0.85,
          "debt_to_equity": 0.50,
          "roe": 0.11,
          "roa": 0.06,
          "net_margin": 0.09,
          "times_interest_earned": 7.2,
          "key_events": "Strategic initiatives"
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
      {"year": "YEAR-4", "zscore": 2.1},
      {"year": "YEAR-3", "zscore": 2.3},
      {"year": "YEAR-2", "zscore": 2.2},
      {"year": "YEAR-1", "zscore": 2.4},
      {"year": "CURRENT_YEAR", "zscore": 2.5}
    ]
  }
}

Use realistic financial data and ratios for each company. Include 5 years of timeline data with COMPLETE financial ratios for EACH year (current_ratio, quick_ratio, debt_to_equity, roe, roa, net_margin, times_interest_earned). CRITICAL: Replace all placeholder years (CURRENT_YEAR, YEAR-1, etc.) with the ACTUAL fiscal years from the company's filings. Ensure chronological order from oldest to newest. Calculate proper Altman Z-scores (>2.99=safe, 1.8-2.99=grey, <1.8=distress). Return ONLY the JSON, no other text.`
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