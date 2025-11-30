import { NextResponse } from 'next/server';

interface SupabaseMessage {
  id: number;
  session_id: string;
  message: {
    type: 'human' | 'ai';
    content: string;
  };
}

interface Conversation {
  sessionId: string;
  phoneNumber: string;
  userName: string;
  messageCount: number;
  servicesConsulted: string[];
  calLinkSent: boolean;
  lastMessage: string;
  lastMessageTime: string | null;
}

// Service keywords to detect
const SERVICE_KEYWORDS: { [key: string]: string[] } = {
  'Botox': ['botox', 'bótox', 'toxina botulínica'],
  'Rellenos': ['relleno', 'rellenos', 'filler', 'fillers', 'ácido hialurónico'],
  'Morpheus8': ['morpheus', 'morpheus8', 'morpheus 8'],
  'Tirzepatide': ['tirzepatide', 'mounjaro', 'zepbound', 'bajar de peso', 'perder peso', 'pérdida de peso'],
  'Control Prenatal': ['prenatal', 'embarazo', 'pregnancy', 'embarazada'],
  'Ginecología': ['ginecología', 'ginecologia', 'gynecology', 'ginecológico'],
  'Sueroterapia': ['sueroterapia', 'suero', 'terapia intravenosa', 'iv therapy', 'nad+'],
  'Hilos Tensores': ['hilos', 'hilos tensores', 'thread lift', 'lifting'],
};

function extractUserName(content: string): string {
  const nameMatch = content.match(/Nombre:\s*(.+?)(?:\s*\n|\s*Teléfono:|$)/i);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    if (name && !/^\d+@/.test(name) && !/^\d{10,}/.test(name) && name !== '') {
      return name;
    }
  }
  return 'Desconocido';
}

function extractPhoneNumber(sessionId: string): string {
  const match = sessionId.match(/^(\d+)@/);
  return match ? match[1] : sessionId;
}

function detectServices(content: string): string[] {
  const services: Set<string> = new Set();
  const lowerContent = content.toLowerCase();

  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        services.add(service);
        break;
      }
    }
  }
  return Array.from(services);
}

function isEricHenoc(name: string, sessionId: string): boolean {
  const lowerName = name.toLowerCase();
  return lowerName.includes('eric henoc') || sessionId.startsWith('14078729969');
}

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Fetch all messages with pagination
    const allMessages: SupabaseMessage[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/n8n_chat_histories?select=*&order=id.desc&limit=${pageSize}&offset=${offset}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          next: { revalidate: 60 }
        }
      );

      if (!response.ok) break;

      const data: SupabaseMessage[] = await response.json();
      allMessages.push(...data);

      if (data.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    }

    // Group messages by session
    const conversationMap = new Map<string, Conversation>();

    for (const msg of allMessages) {
      const sessionId = msg.session_id;
      const content = msg.message?.content || '';
      const type = msg.message?.type;

      if (!conversationMap.has(sessionId)) {
        conversationMap.set(sessionId, {
          sessionId,
          phoneNumber: extractPhoneNumber(sessionId),
          userName: 'Desconocido',
          messageCount: 0,
          servicesConsulted: [],
          calLinkSent: false,
          lastMessage: '',
          lastMessageTime: null,
        });
      }

      const conv = conversationMap.get(sessionId)!;
      conv.messageCount++;

      if (type === 'human') {
        const userName = extractUserName(content);
        if (userName !== 'Desconocido') {
          conv.userName = userName;
        }

        const services = detectServices(content);
        services.forEach(s => {
          if (!conv.servicesConsulted.includes(s)) {
            conv.servicesConsulted.push(s);
          }
        });

        // Update last message
        if (content.length > 10) {
          conv.lastMessage = content.substring(0, 100) + (content.length > 100 ? '...' : '');
        }
      } else if (type === 'ai') {
        if (content.includes('cal.com/')) {
          conv.calLinkSent = true;
        }
      }
    }

    // Filter out test data and convert to array
    const conversations: Conversation[] = [];
    conversationMap.forEach(conv => {
      if (!isEricHenoc(conv.userName, conv.sessionId)) {
        conversations.push(conv);
      }
    });

    // Sort by message count (most active first)
    conversations.sort((a, b) => b.messageCount - a.messageCount);

    return NextResponse.json({
      conversations: conversations.slice(0, 100),
      total: conversations.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Error fetching conversations' }, { status: 500 });
  }
}
