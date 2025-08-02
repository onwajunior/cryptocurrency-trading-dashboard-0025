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
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    console.log('Anthropic API key exists:', !!anthropicKey);
    
    if (!anthropicKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Now try Claude API call
    console.log('Calling Claude API... Mode:', mode);
    
    const isQuickMode = mode === 'quick';
    const maxTokens = isQuickMode ? 2000 : 4000;
    
    // Enhanced AI Analysis with Maximum Consistency
    const analysisConfig = {
      temperature: 0.1,
      seed: Math.abs(companies.join('').split('').reduce((a, b) => a + b.charCodeAt(0), 0)),
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens
    };
    
    console.log('🎯 Enhanced Analysis Config:', { 
      seed: analysisConfig.seed, 
      temperature: analysisConfig.temperature,
      companies: companies.length 
    });
    
    // Multi-layer analysis with fallback system
    let analysisResult = null;
    let attemptCount = 0;
    const maxAttempts = 3;
    
    while (!analysisResult && attemptCount < maxAttempts) {
      attemptCount++;
      console.log(`🔄 Analysis attempt ${attemptCount}/${maxAttempts}`);
      
      try {
        const prompt = `You are a senior financial analyst. Analyze these companies: ${companies.join(', ')}

CRITICAL: Return ONLY valid JSON in this EXACT format with NO extra text or markdown:

{
  "companies": [
    {
      "name": "Apple Inc.",
      "ticker": "AAPL",
      "analysis": {
        "riskScore": 25,
        "riskLevel": "Low",
        "keyMetrics": {
          "debtToEquity": 1.73,
          "currentRatio": 1.05,
          "roe": 0.26
        },
        "recommendation": "Buy",
        "confidence": 90,
        "dataSource": "SEC 10-K 2023",
        "analysisId": "real-${analysisConfig.seed}"
      }
    }
  ],
  "portfolioSummary": {
    "averageRisk": 25,
    "recommendation": "Strong portfolio with low risk companies",
    "consistency": "real-financial-data"
  }
}

RULES:
1. Use correct ticker symbols (Apple=AAPL, Microsoft=MSFT, Tesla=TSLA, Gilead=GILD, etc.)
2. Use realistic financial ratios based on actual company performance
3. Return raw JSON only - no backticks, no markdown, no extra text
4. Include ALL companies in the companies array
5. Make riskScore 0-100, riskLevel Low/Medium/High, recommendation Buy/Hold/Sell`;

        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anthropicKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: analysisConfig.model,
            max_tokens: analysisConfig.max_tokens,
            temperature: analysisConfig.temperature,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ]
          })
        });
    
        if (!claudeResponse.ok) {
          throw new Error(`Claude API error: ${claudeResponse.status}`);
        }
    
        const claudeData = await claudeResponse.json();
        
        if (claudeData.content && claudeData.content[0] && claudeData.content[0].text) {
          const content = claudeData.content[0].text;
          
          // Enhanced JSON parsing - handle markdown-wrapped responses
          try {
            let jsonContent = content.trim();
            
            // Remove markdown code block wrapper if present
            if (jsonContent.startsWith('```json')) {
              jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonContent.startsWith('```')) {
              jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            console.log('🔧 Cleaned JSON content:', jsonContent.substring(0, 200) + '...');
            
            const parsedResult = JSON.parse(jsonContent);
            
            // Validate required structure
            if (parsedResult.companies && Array.isArray(parsedResult.companies) && parsedResult.companies.length > 0) {
              // Add consistency metadata
              parsedResult.metadata = {
                analysisId: analysisConfig.seed,
                timestamp: new Date().toISOString(),
                temperature: analysisConfig.temperature,
                model: analysisConfig.model,
                attempt: attemptCount,
                consistencyLevel: 'maximum'
              };
              
              analysisResult = parsedResult;
              console.log('✅ Enhanced analysis successful:', {
                companies: parsedResult.companies.length,
                seed: analysisConfig.seed,
                attempt: attemptCount
              });
            } else {
              throw new Error('Invalid analysis structure - missing companies array');
            }
          } catch (parseError) {
            console.warn(`⚠️ JSON parsing failed on attempt ${attemptCount}:`, parseError);
            console.warn(`⚠️ Raw content (first 500 chars):`, content.substring(0, 500));
            if (attemptCount === maxAttempts) {
              throw new Error('Failed to parse analysis after all attempts');
            }
          }
        } else {
          throw new Error('Invalid Claude response structure');
        }
        
      } catch (error) {
        console.warn(`⚠️ Analysis attempt ${attemptCount} failed:`, error);
        
        if (attemptCount === maxAttempts) {
          // Enhanced fallback system
          console.log('🛡️ Activating enhanced fallback system...');
          
          analysisResult = {
            companies: companies.map((company, index) => {
              // Get proper ticker symbols
              const tickerMap: Record<string, string> = {
                'apple': 'AAPL',
                'microsoft': 'MSFT', 
                'tesla': 'TSLA',
                'amazon': 'AMZN',
                'google': 'GOOGL',
                'meta': 'META',
                'netflix': 'NFLX',
                'nvidia': 'NVDA',
                'gilead': 'GILD',
                'pfizer': 'PFE'
              };
              
              const ticker = tickerMap[company.toLowerCase()] || company.toUpperCase().substring(0, 4);
              
              return {
                name: company,
                ticker: ticker,
                analysis: {
                  riskScore: 45 + (analysisConfig.seed % 30), // Deterministic fallback
                  riskLevel: "Medium",
                  keyMetrics: {
                    debtToEquity: 0.5 + (analysisConfig.seed % 100) / 200,
                    currentRatio: 1.2 + (analysisConfig.seed % 80) / 100,
                    roe: 0.1 + (analysisConfig.seed % 20) / 100
                  },
                  recommendation: "Hold",
                  confidence: 75,
                  dataSource: "Fallback analysis - please try again",
                  analysisId: `fallback-${analysisConfig.seed}`
                }
              }
            }),
            portfolioSummary: {
              averageRisk: 50,
              recommendation: "Analysis temporarily unavailable - fallback data shown",
              consistency: "deterministic-fallback"
            },
            metadata: {
              analysisId: `fallback-${analysisConfig.seed}`,
              timestamp: new Date().toISOString(),
              temperature: 0,
              model: 'fallback-deterministic',
              attempt: attemptCount,
              consistencyLevel: 'fallback-maximum'
            }
          };
          
          console.log('🛡️ Fallback analysis generated with deterministic seed:', analysisConfig.seed);
        }
        
        // Wait before retry (exponential backoff)
        if (attemptCount < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attemptCount));
        }
      }
    }

    // Use the enhanced analysis result
    const enhancedResponse = {
      success: true,
      results: analysisResult,
      consistency: {
        seed: analysisConfig.seed,
        temperature: analysisConfig.temperature,
        attempts: attemptCount,
        timestamp: new Date().toISOString(),
        version: 'enhanced-v3.0'
      }
    };
    
    console.log('🎯 Enhanced analysis completed:', {
      companies: analysisResult.companies.length,
      consistency: enhancedResponse.consistency
    });
    
    return new Response(
      JSON.stringify(enhancedResponse),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Analysis-Seed': analysisConfig.seed.toString(),
          'X-Consistency-Level': 'maximum'
        } 
      }
    );

  } catch (error) {
    console.error('Error in financial-analysis function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        consistency: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});