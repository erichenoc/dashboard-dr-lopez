import { NextResponse } from 'next/server';

interface SupabaseMessage {
  id: number;
  session_id: string;
  message: {
    type: 'human' | 'ai';
    content: string;
  };
}

interface MessageResponse {
  id: number;
  type: 'human' | 'ai';
  content: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Decode the session ID (it may be URL encoded)
    const decodedSessionId = decodeURIComponent(sessionId);

    // Fetch messages for this session
    const response = await fetch(
      `${supabaseUrl}/rest/v1/n8n_chat_histories?session_id=eq.${encodeURIComponent(decodedSessionId)}&select=*&order=id.asc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    const data: SupabaseMessage[] = await response.json();

    // Transform messages
    const messages: MessageResponse[] = data.map(msg => ({
      id: msg.id,
      type: msg.message?.type || 'human',
      content: msg.message?.content || '',
    }));

    return NextResponse.json({
      sessionId: decodedSessionId,
      messages,
      totalMessages: messages.length,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Error fetching conversation' }, { status: 500 });
  }
}
