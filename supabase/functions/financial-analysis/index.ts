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
    
    console.log('Basic function test - companies:', companies);
    
    // Check environment variables
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    console.log('API key exists:', !!anthropicKey);
    console.log('API key length:', anthropicKey?.length || 0);
    
    // Simple response without any external API calls
    const results = {
      status: 'success',
      message: 'Function is working',
      companies: companies,
      anthropic_key_available: !!anthropicKey,
      timestamp: new Date().toISOString()
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