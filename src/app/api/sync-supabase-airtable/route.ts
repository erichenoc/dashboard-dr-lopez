import { NextResponse } from 'next/server';

// Service keywords to detect in messages
const SERVICE_KEYWORDS: { [key: string]: string[] } = {
  'Botox': ['botox', 'bótox', 'toxina botulínica'],
  'Rellenos': ['relleno', 'rellenos', 'filler', 'fillers', 'ácido hialurónico'],
  'Morpheus8': ['morpheus', 'morpheus8', 'morpheus 8'],
  'Morpheus8 V': ['morpheus8 v', 'morpheus v', 'rejuvenecimiento vaginal'],
  'Sueroterapia': ['sueroterapia', 'suero', 'terapia intravenosa', 'iv therapy', 'nad+', 'nad'],
  'Tirzepatide': ['tirzepatide', 'mounjaro', 'zepbound', 'bajar de peso', 'perder peso', 'pérdida de peso', 'weight loss'],
  'Control Prenatal': ['prenatal', 'embarazo', 'pregnancy', 'embarazada'],
  'Ginecología': ['ginecología', 'ginecologia', 'gynecology', 'ginecológico'],
  'Tratamiento Facial': ['facial', 'limpieza facial', 'hydrafacial', 'skin care'],
  'Peeling': ['peeling', 'peel', 'exfoliación'],
  'Láser': ['láser', 'laser', 'depilación láser'],
  'Plasma/PRP': ['plasma', 'prp', 'platelet'],
  'Hilos Tensores': ['hilos', 'hilos tensores', 'thread lift', 'lifting'],
  'Implantes Hormonales': ['implantes hormonales', 'biote', 'pellets', 'hormonas'],
  'Consulta General': ['consulta', 'cita', 'información', 'precios', 'appointment'],
};

interface SupabaseMessage {
  id: number;
  session_id: string;
  message: {
    type: 'human' | 'ai';
    content: string;
    additional_kwargs?: Record<string, unknown>;
    response_metadata?: Record<string, unknown>;
  };
}

interface ConversationData {
  sessionId: string;
  userName: string;
  phoneNumber: string;
  servicesConsulted: string[];
  calLinkSent: boolean;
  messageCount: number;
  lastMessageDate: string | null;
}

interface AirtableRecord {
  id: string;
  fields: {
    Nombre?: string;
    Teléfono?: string;
    Servicio_Consultado?: string;
    Enlace_Cita_Enviado?: boolean;
  };
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
  // Format: 14078729969@s.whatsapp.net or similar
  const match = sessionId.match(/^(\d+)@/);
  if (match) {
    return match[1];
  }
  return sessionId;
}

// Extract date from human message content
function extractDate(content: string): string | null {
  const dateMatch = content.match(/Fecha:\s*(.+?)(?:\n|Nombre:|$)/i);
  if (dateMatch) {
    return dateMatch[1].trim();
  }
  // Try alternative format
  const altMatch = content.match(/today:\s*(.+?)(?:\n|nombre|$)/i);
  if (altMatch) {
    return altMatch[1].trim();
  }
  return null;
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
         lowerName.includes('eric') && lowerName.includes('henoc') ||
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
        messageCount: 0,
        lastMessageDate: null,
      });
    }

    const conv = conversationMap.get(sessionId)!;
    conv.messageCount++;

    if (type === 'human') {
      // Extract user info from human messages
      const userName = extractUserName(content);
      if (userName !== 'Desconocido') {
        conv.userName = userName;
      }

      // Extract date
      const date = extractDate(content);
      if (date) {
        conv.lastMessageDate = date;
      }

      // Detect services
      const services = detectServices(content);
      services.forEach(s => {
        if (!conv.servicesConsulted.includes(s)) {
          conv.servicesConsulted.push(s);
        }
      });
    } else if (type === 'ai') {
      // Check for Cal.com link in AI responses
      if (hasCalLink(content)) {
        conv.calLinkSent = true;
      }
    }
  }

  // Filter out Eric Henoc and conversations with no services detected
  const result: ConversationData[] = [];
  conversationMap.forEach(conv => {
    if (!isEricHenoc(conv.userName, conv.sessionId)) {
      result.push(conv);
    }
  });

  return result;
}

// Get existing Airtable records
async function getAirtableRecords(): Promise<Map<string, AirtableRecord>> {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = encodeURIComponent(process.env.AIRTABLE_TABLE_NAME || 'Datos de Clientes');
  const apiKey = process.env.AIRTABLE_API_KEY;

  if (!baseId || !apiKey) {
    throw new Error('Airtable not configured');
  }

  const recordMap = new Map<string, AirtableRecord>();
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableName}`);
    if (offset) {
      url.searchParams.set('offset', offset);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Airtable fetch error:', await response.text());
      break;
    }

    const data = await response.json();

    for (const record of data.records || []) {
      // Normalize phone - handle both "14073199465" and "18093503832@s.whatsapp.net" formats
      let phone = record.fields.Teléfono || '';
      // Remove @s.whatsapp.net if present
      phone = phone.replace(/@s\.whatsapp\.net$/, '').replace(/@lid$/, '');
      // Remove non-digits
      phone = phone.replace(/\D/g, '');
      if (phone) {
        recordMap.set(phone, record);
      }
    }

    offset = data.offset;
  } while (offset);

  return recordMap;
}

// Create or update Airtable record
async function upsertAirtableRecord(
  conv: ConversationData,
  existingRecords: Map<string, AirtableRecord>
): Promise<{ action: string; success: boolean }> {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = encodeURIComponent(process.env.AIRTABLE_TABLE_NAME || 'Datos de Clientes');
  const apiKey = process.env.AIRTABLE_API_KEY;

  if (!baseId || !apiKey) {
    return { action: 'skip', success: false };
  }

  // Check if record exists by phone number
  const existingRecord = existingRecords.get(conv.phoneNumber);

  // Build fields object with all available data
  const fields: Record<string, string | boolean> = {
    Nombre: conv.userName !== 'Desconocido' ? conv.userName : 'Cliente WhatsApp',
    Teléfono: conv.phoneNumber,
    Servicio_Consultado: conv.servicesConsulted.length > 0
      ? conv.servicesConsulted.join(', ')
      : 'Consulta General',
    Enlace_Cita_Enviado: conv.calLinkSent,
  };

  try {
    if (existingRecord) {
      // Update existing record
      const response = await fetch(
        `https://api.airtable.com/v0/${baseId}/${tableName}/${existingRecord.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        }
      );

      return { action: 'updated', success: response.ok };
    } else {
      // Create new record
      const response = await fetch(
        `https://api.airtable.com/v0/${baseId}/${tableName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        }
      );

      return { action: 'created', success: response.ok };
    }
  } catch (error) {
    console.error('Airtable upsert error:', error);
    return { action: 'error', success: false };
  }
}

export async function GET() {
  try {
    // Fetch all Supabase messages
    const messages = await fetchAllSupabaseMessages();

    // Process into conversation data
    const conversations = processMessages(messages);

    // Calculate service statistics
    const serviceStats: { [key: string]: { consultations: number; linksSent: number } } = {};

    for (const conv of conversations) {
      for (const service of conv.servicesConsulted) {
        if (!serviceStats[service]) {
          serviceStats[service] = { consultations: 0, linksSent: 0 };
        }
        serviceStats[service].consultations++;
        if (conv.calLinkSent) {
          serviceStats[service].linksSent++;
        }
      }
    }

    // Sort services by consultations
    const sortedServices = Object.entries(serviceStats)
      .sort((a, b) => b[1].consultations - a[1].consultations)
      .map(([service, stats]) => ({
        service,
        ...stats,
      }));

    return NextResponse.json({
      totalMessages: messages.length,
      totalConversations: conversations.length,
      conversationsWithCalLink: conversations.filter(c => c.calLinkSent).length,
      conversationsWithServices: conversations.filter(c => c.servicesConsulted.length > 0).length,
      serviceStats: sortedServices,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in sync:', error);
    return NextResponse.json(
      { error: 'Error processing data' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Fetch all Supabase messages
    const messages = await fetchAllSupabaseMessages();

    // Process into conversation data
    const conversations = processMessages(messages);

    // Get existing Airtable records
    const existingRecords = await getAirtableRecords();

    // Sync to Airtable (only conversations with services)
    const conversationsWithServices = conversations.filter(c => c.servicesConsulted.length > 0);

    let created = 0;
    let updated = 0;
    let errors = 0;

    // Process in batches to avoid rate limits
    for (let i = 0; i < conversationsWithServices.length; i++) {
      const conv = conversationsWithServices[i];
      const result = await upsertAirtableRecord(conv, existingRecords);

      if (result.success) {
        if (result.action === 'created') created++;
        if (result.action === 'updated') updated++;
      } else {
        errors++;
      }

      // Add small delay to avoid rate limits
      if (i % 5 === 4) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Calculate service statistics
    const serviceStats: { [key: string]: { consultations: number; linksSent: number } } = {};

    for (const conv of conversations) {
      for (const service of conv.servicesConsulted) {
        if (!serviceStats[service]) {
          serviceStats[service] = { consultations: 0, linksSent: 0 };
        }
        serviceStats[service].consultations++;
        if (conv.calLinkSent) {
          serviceStats[service].linksSent++;
        }
      }
    }

    // Sort services by consultations
    const sortedServices = Object.entries(serviceStats)
      .sort((a, b) => b[1].consultations - a[1].consultations)
      .map(([service, stats]) => ({
        service,
        ...stats,
      }));

    return NextResponse.json({
      sync: {
        created,
        updated,
        errors,
        total: conversationsWithServices.length,
      },
      totalMessages: messages.length,
      totalConversations: conversations.length,
      conversationsWithCalLink: conversations.filter(c => c.calLinkSent).length,
      serviceStats: sortedServices,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in sync:', error);
    return NextResponse.json(
      { error: 'Error syncing data' },
      { status: 500 }
    );
  }
}
