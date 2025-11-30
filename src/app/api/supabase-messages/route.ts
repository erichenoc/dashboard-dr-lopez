import { NextResponse } from 'next/server';

interface ChatMetrics {
  totalMessages: number;
  humanMessages: number;
  aiMessages: number;
  aiMessagesWithCalLink: number;
  uniqueConversations: number;
  avgMessagesPerConversation: number;
}

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Call the RPC function to get all metrics efficiently
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_chat_metrics`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
        next: { revalidate: 60 }
      }
    );

    if (!response.ok) {
      console.error('Supabase RPC error:', await response.text());
      return NextResponse.json(
        { error: 'Error fetching Supabase data' },
        { status: response.status }
      );
    }

    const metrics: ChatMetrics = await response.json();

    return NextResponse.json({
      ...metrics,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching Supabase messages:', error);
    return NextResponse.json(
      { error: 'Error fetching Supabase messages' },
      { status: 500 }
    );
  }
}
