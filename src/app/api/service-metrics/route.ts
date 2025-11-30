import { NextResponse } from 'next/server';

// Service keywords to detect in messages
const SERVICE_KEYWORDS: { [key: string]: string[] } = {
  'Botox': ['botox', 'bótox', 'toxina botulínica'],
  'Rellenos': ['relleno', 'rellenos', 'filler', 'fillers', 'ácido hialurónico'],
  'Morpheus8': ['morpheus', 'morpheus8', 'morpheus 8'],
  'Morpheus8 V': ['morpheus8 v', 'morpheus v', 'rejuvenecimiento vaginal', 'rejuvenecimiento íntimo'],
  'Sueroterapia': ['sueroterapia', 'suero', 'terapia intravenosa', 'iv therapy', 'nad+', 'nad'],
  'Tirzepatide': ['tirzepatide', 'mounjaro', 'zepbound', 'bajar de peso', 'perder peso', 'pérdida de peso', 'weight loss', 'inyecciones para bajar'],
  'Control Prenatal': ['prenatal', 'embarazo', 'pregnancy', 'embarazada', 'seguimiento de embarazo'],
  'Ginecología': ['ginecología', 'ginecologia', 'gynecology', 'ginecológico', 'genecologia'],
  'Tratamiento Facial': ['facial', 'limpieza facial', 'hydrafacial', 'skin care'],
  'Peeling': ['peeling', 'peel', 'exfoliación'],
  'Láser': ['láser', 'laser', 'depilación láser'],
  'Plasma/PRP': ['plasma', 'prp', 'platelet'],
  'Hilos Tensores': ['hilos', 'hilos tensores', 'thread lift', 'lifting', 'hilos sensore'],
  'Implantes Hormonales': ['implantes hormonales', 'biote', 'pellets', 'hormonas'],
  'Consulta General': ['consulta general', 'información general', 'información sobre servicios'],
};

interface SupabaseMessage {
  id: number;
  session_id: string;
  message: {
    type: 'human' | 'ai';
    content: string;
  };
}

interface CalcomBooking {
  id: number;
  status: string;
  startTime: string;
  attendees: { name: string; email: string; phone?: string }[];
}

// Normalize name for fuzzy matching
function normalizeName(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .trim();
}

// Check if names match (fuzzy)
function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  if (!n1 || !n2 || n1 === 'desconocido' || n2 === 'desconocido' ||
      n1 === 'cliente whatsapp' || n2 === 'cliente whatsapp') {
    return false;
  }

  // Exact match
  if (n1 === n2) return true;

  // Contains match (for partial names)
  if (n1.length > 3 && n2.includes(n1)) return true;
  if (n2.length > 3 && n1.includes(n2)) return true;

  // First name match
  const firstName1 = n1.split(' ')[0];
  const firstName2 = n2.split(' ')[0];
  if (firstName1.length > 3 && firstName1 === firstName2) return true;

  return false;
}

interface ServiceMetric {
  service: string;
  consultations: number;
  linksSent: number;
  bookingsConfirmed: number;
  conversionRate: number;
}

interface ConversationData {
  sessionId: string;
  userName: string;
  phoneNumber: string;
  servicesConsulted: string[];
  calLinkSent: boolean;
}

// Extract user name from human message content
function extractUserName(content: string): string {
  // Format 1: "Nombre: Name" (new format with line break or whitespace after)
  const nameMatch = content.match(/Nombre:\s*(.+?)(?:\s*\n|\s*Teléfono:|$)/i);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    // Make sure it's not a phone number
    if (name && !/^\d+@/.test(name) && !/^\d{10,}/.test(name) && name !== '') {
      return name;
    }
  }

  // Format 2: "nombre de usuario: Name" (old format)
  const userNameMatch = content.match(/nombre de usuario:\s*(.+?)(?:\n|$)/i);
  if (userNameMatch) {
    const name = userNameMatch[1].trim();
    if (name && !/^\d+@/.test(name) && !/^\d{10,}/.test(name) && name !== '') {
      return name;
    }
  }

  return 'Desconocido';
}

// Extract phone number from session_id
function extractPhoneNumber(sessionId: string): string {
  const match = sessionId.match(/^(\d+)@/);
  if (match) {
    return match[1];
  }
  return sessionId;
}

// Detect services mentioned in message
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

// Check if message contains Cal.com link
function hasCalLink(content: string): boolean {
  return content.includes('cal.com/arnaldo-lopez') || content.includes('cal.com/');
}

// Check if this is Eric Henoc (test data)
function isEricHenoc(name: string, sessionId: string): boolean {
  const lowerName = name.toLowerCase();
  return lowerName.includes('eric henoc') ||
         (lowerName.includes('eric') && lowerName.includes('henoc')) ||
         sessionId.startsWith('14078729969');
}

// Fetch all messages from Supabase with pagination
async function fetchAllSupabaseMessages(): Promise<SupabaseMessage[]> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }

  const allMessages: SupabaseMessage[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/n8n_chat_histories?select=*&order=id.asc&limit=${pageSize}&offset=${offset}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 60 }
      }
    );

    if (!response.ok) {
      console.error('Supabase fetch error:', await response.text());
      break;
    }

    const data: SupabaseMessage[] = await response.json();
    allMessages.push(...data);

    if (data.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return allMessages;
}

// Process messages into conversation data
function processMessages(messages: SupabaseMessage[]): ConversationData[] {
  const conversationMap = new Map<string, ConversationData>();

  for (const msg of messages) {
    const sessionId = msg.session_id;
    const content = msg.message?.content || '';
    const type = msg.message?.type;

    if (!conversationMap.has(sessionId)) {
      conversationMap.set(sessionId, {
        sessionId,
        userName: 'Desconocido',
        phoneNumber: extractPhoneNumber(sessionId),
        servicesConsulted: [],
        calLinkSent: false,
      });
    }

    const conv = conversationMap.get(sessionId)!;

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
    } else if (type === 'ai') {
      if (hasCalLink(content)) {
        conv.calLinkSent = true;
      }
    }
  }

  // Filter out Eric Henoc
  const result: ConversationData[] = [];
  conversationMap.forEach(conv => {
    if (!isEricHenoc(conv.userName, conv.sessionId)) {
      result.push(conv);
    }
  });

  return result;
}

async function getCalcomBookings(): Promise<CalcomBooking[]> {
  const allBookings: CalcomBooking[] = [];

  for (const status of ['upcoming', 'past']) {
    const response = await fetch(
      `https://api.cal.com/v1/bookings?apiKey=${process.env.CALCOM_API_KEY}&status=${status}`,
      { next: { revalidate: 60 } }
    );

    if (response.ok) {
      const data = await response.json();
      allBookings.push(...(data.bookings || []));
    }
  }

  return allBookings;
}

export async function GET() {
  try {
    // Fetch data from Supabase and Cal.com
    const [messages, calcomBookings] = await Promise.all([
      fetchAllSupabaseMessages(),
      getCalcomBookings()
    ]);

    // Process messages into conversation data
    const conversations = processMessages(messages);

    // Store all booking names for fuzzy matching
    const bookingNames = calcomBookings.map(b => b.attendees?.[0]?.name || '').filter(n => n);

    // Function to check if a client name has a booking
    const hasBooking = (clientName: string): boolean => {
      return bookingNames.some(bookingName => namesMatch(clientName, bookingName));
    };

    // Aggregate by service
    const serviceMap = new Map<string, {
      consultations: number;
      linksSent: number;
      clientNames: string[];
    }>();

    for (const conv of conversations) {
      for (const service of conv.servicesConsulted) {
        const current = serviceMap.get(service) || {
          consultations: 0,
          linksSent: 0,
          clientNames: []
        };

        current.consultations++;
        if (conv.calLinkSent) {
          current.linksSent++;
        }
        current.clientNames.push(conv.userName.toLowerCase());

        serviceMap.set(service, current);
      }
    }

    // Convert to array with booking confirmations
    const services: ServiceMetric[] = [];

    serviceMap.forEach((data, service) => {
      let bookingsConfirmed = 0;
      const checkedNames = new Set<string>();

      data.clientNames.forEach(name => {
        // Avoid counting the same client twice
        const normalizedName = normalizeName(name);
        if (!checkedNames.has(normalizedName) && hasBooking(name)) {
          bookingsConfirmed++;
          checkedNames.add(normalizedName);
        }
      });

      const conversionRate = data.linksSent > 0
        ? Math.round((bookingsConfirmed / data.linksSent) * 100)
        : 0;

      services.push({
        service,
        consultations: data.consultations,
        linksSent: data.linksSent,
        bookingsConfirmed,
        conversionRate
      });
    });

    // Sort by consultations (descending)
    services.sort((a, b) => b.consultations - a.consultations);

    // Calculate totals
    const totals = {
      totalConsultations: services.reduce((sum, s) => sum + s.consultations, 0),
      totalLinksSent: services.reduce((sum, s) => sum + s.linksSent, 0),
      totalBookings: services.reduce((sum, s) => sum + s.bookingsConfirmed, 0),
      uniqueServices: services.length,
      totalConversations: conversations.length,
      conversationsWithCalLink: conversations.filter(c => c.calLinkSent).length,
      totalCalcomBookings: calcomBookings.length,
    };

    // Overall conversion rate
    const overallConversionRate = totals.conversationsWithCalLink > 0
      ? Math.round((totals.totalCalcomBookings / totals.conversationsWithCalLink) * 100)
      : 0;

    return NextResponse.json({
      services: services.slice(0, 15), // Top 15 services
      totals,
      calcomStats: {
        totalBookings: calcomBookings.length,
        matchedBookings: totals.totalBookings,
        overallConversionRate,
      },
      source: 'supabase',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching service metrics:', error);
    return NextResponse.json(
      { error: 'Error fetching service metrics' },
      { status: 500 }
    );
  }
}
