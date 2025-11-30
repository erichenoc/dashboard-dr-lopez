import { NextResponse } from 'next/server';

interface ChatHistoryRecord {
  id: number;
  session_id: string;
  message: {
    type: 'human' | 'ai';
    content: string;
    additional_kwargs?: Record<string, unknown>;
  };
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

    // Fetch all chat history records from Supabase
    const response = await fetch(
      `${supabaseUrl}/rest/v1/n8n_chat_histories?select=id,session_id,message`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 }
      }
    );

    if (!response.ok) {
      console.error('Supabase API error:', await response.text());
      return NextResponse.json(
        { error: 'Error fetching Supabase data' },
        { status: response.status }
      );
    }

    const records: ChatHistoryRecord[] = await response.json();

    // Count messages by type
    const humanMessages = records.filter(r => r.message?.type === 'human');
    const aiMessages = records.filter(r => r.message?.type === 'ai');

    // Count unique sessions (conversations)
    const uniqueSessions = new Set(records.map(r => r.session_id));

    // Calculate average messages per conversation
    const avgMessagesPerConversation = uniqueSessions.size > 0
      ? (records.length / uniqueSessions.size).toFixed(1)
      : '0';

    const metrics = {
      totalMessages: records.length,
      humanMessages: humanMessages.length,
      aiMessages: aiMessages.length,
      uniqueConversations: uniqueSessions.size,
      avgMessagesPerConversation,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching Supabase messages:', error);
    return NextResponse.json(
      { error: 'Error fetching Supabase messages' },
      { status: 500 }
    );
  }
}
