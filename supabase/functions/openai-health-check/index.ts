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
    console.log('🔍 Starting OpenAI API health check...');
    
    // Check if API key exists
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('🔑 OpenAI API key exists:', !!openaiKey);
    
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OpenAI API key not configured',
          details: 'OPENAI_API_KEY environment variable is missing'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Test OpenAI API with a simple request
    console.log('📡 Testing OpenAI API connection...');
    
    const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond with exactly: "API_WORKING"'
          },
          {
            role: 'user',
            content: 'Health check test'
          }
        ],
        max_tokens: 10,
        temperature: 0
      })
    });

    console.log('📊 OpenAI API response status:', testResponse.status);
    console.log('📊 OpenAI API response headers:', Object.fromEntries(testResponse.headers.entries()));

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('❌ OpenAI API error response:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `OpenAI API returned ${testResponse.status}`,
          details: errorText,
          status: testResponse.status,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const responseData = await testResponse.json();
    console.log('✅ OpenAI API response data:', responseData);

    // Check if we got a valid response
    const assistantResponse = responseData.choices?.[0]?.message?.content;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OpenAI API is working correctly',
        details: {
          status: testResponse.status,
          model_used: 'gpt-4.1-2025-04-14',
          response_content: assistantResponse,
          usage: responseData.usage,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Health check failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Health check failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});