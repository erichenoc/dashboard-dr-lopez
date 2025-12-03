import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

interface CalcomBooking {
  id: number;
  status: string;
  rescheduled: boolean;
  startTime: string;
  endTime: string;
  attendees: { name: string; email: string }[];
}

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: {
    Nombre?: string;
    Teléfono?: string;
    Servicio_Consultado?: string;
    Enlace_Cita_Enviado?: boolean;
    'Fecha primer contacto\t'?: string;
    'Última actualización'?: string;
  };
}

interface SupabaseMessage {
  id: number;
  session_id: string;
  message: {
    type: 'human' | 'ai';
    content: string;
  };
}

function getDateRange(period: string, year?: string, month?: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);

  switch (period) {
    case '7days':
      return {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end
      };
    case '30days':
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end
      };
    case '90days':
      return {
        start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        end
      };
    case 'month':
      if (year && month) {
        const y = parseInt(year);
        const m = parseInt(month) - 1;
        return {
          start: new Date(y, m, 1),
          end: new Date(y, m + 1, 0, 23, 59, 59)
        };
      }
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end
      };
    case 'year':
      if (year) {
        const y = parseInt(year);
        return {
          start: new Date(y, 0, 1),
          end: new Date(y, 11, 31, 23, 59, 59)
        };
      }
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end
      };
    case 'all':
      return {
        start: new Date(2020, 0, 1),
        end
      };
    default:
      return {
        start: new Date(2020, 0, 1),
        end
      };
  }
}

async function getCalcomBookings() {
  // Fetch all bookings without status filter (Cal.com API v1 no longer supports status=past)
  // Cache for 10 minutes to reduce API calls and prevent rate limiting
  const response = await fetch(
    `https://api.cal.com/v1/bookings?apiKey=${process.env.CALCOM_API_KEY}&take=500`,
    { next: { revalidate: 600 } }
  );

  if (!response.ok) {
    console.error(`Cal.com API error:`, await response.text());
    return { upcoming: [], past: [], cancelled: [] };
  }

  const data = await response.json();
  const bookings = data.bookings || [];
  const now = new Date();

  // Separate bookings by status and time
  const upcoming: CalcomBooking[] = [];
  const past: CalcomBooking[] = [];
  const cancelled: CalcomBooking[] = [];

  for (const booking of bookings) {
    const startTime = new Date(booking.startTime);

    if (booking.status === 'CANCELLED') {
      cancelled.push(booking);
    } else if (startTime > now) {
      upcoming.push(booking);
    } else {
      past.push(booking);
    }
  }

  return { upcoming, past, cancelled };
}

// Fetch unique conversations from Supabase
async function getSupabaseConversations(): Promise<{ totalConversations: number; conversationsWithCalLink: number }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { totalConversations: 0, conversationsWithCalLink: 0 };
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

    if (!response.ok) break;

    const data: SupabaseMessage[] = await response.json();
    allMessages.push(...data);

    if (data.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  // Count unique sessions
  const sessions = new Map<string, { hasCalLink: boolean }>();

  for (const msg of allMessages) {
    const sessionId = msg.session_id;

    // Skip Eric Henoc test data
    if (sessionId.startsWith('14078729969')) continue;

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { hasCalLink: false });
    }

    // Check for Cal.com link in AI messages
    if (msg.message?.type === 'ai' && msg.message?.content) {
      if (msg.message.content.includes('cal.com/')) {
        sessions.get(sessionId)!.hasCalLink = true;
      }
    }
  }

  const conversationsWithCalLink = Array.from(sessions.values()).filter(s => s.hasCalLink).length;

  return {
    totalConversations: sessions.size,
    conversationsWithCalLink
  };
}

async function getAirtableRecords() {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = encodeURIComponent(process.env.AIRTABLE_TABLE_NAME || 'Datos de Clientes');

  let allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableName}`);
    if (offset) {
      url.searchParams.set('offset', offset);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      console.error('Airtable API error:', await response.text());
      break;
    }

    const data = await response.json();
    allRecords = allRecords.concat(data.records || []);
    offset = data.offset;
  } while (offset);

  return allRecords;
}

export async function GET(request: NextRequest) {
  try {
    // Get filter parameters
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'all';
    const year = searchParams.get('year') || undefined;
    const month = searchParams.get('month') || undefined;

    const { start: filterStart, end: filterEnd } = getDateRange(period, year, month);

    // Fetch all data in parallel
    const [
      calcomData,
      airtableRecords,
      supabaseData
    ] = await Promise.all([
      getCalcomBookings(),
      getAirtableRecords(),
      getSupabaseConversations()
    ]);

    const upcomingBookings = calcomData.upcoming;
    const pastBookings = calcomData.past;
    const cancelledBookings = calcomData.cancelled;

    // Note: airtableRecords is fetched but no longer used for chat count (using Supabase instead)
    void airtableRecords; // Suppress unused variable warning

    // Count rescheduled bookings (from cancelled that have rescheduled flag)
    const rescheduledCount = cancelledBookings.filter(
      (b: CalcomBooking) => b.rescheduled === true
    ).length;

    // Count pure cancellations (cancelled without reschedule)
    const pureCancelledCount = cancelledBookings.length - rescheduledCount;

    // Use Supabase as the source of truth for conversations and links sent
    const totalChats = supabaseData.totalConversations;
    const linksSentCount = supabaseData.conversationsWithCalLink;

    // Calculate conversion rates
    const totalConfirmed = upcomingBookings.length + pastBookings.length;
    const bookingRate = linksSentCount > 0
      ? ((totalConfirmed / linksSentCount) * 100).toFixed(1)
      : '0';

    const cancelRate = (totalConfirmed + cancelledBookings.length) > 0
      ? ((pureCancelledCount / (totalConfirmed + cancelledBookings.length)) * 100).toFixed(1)
      : '0';

    const stats = {
      // Main metrics
      totalChats,
      linksSent: linksSentCount,
      confirmedBookings: totalConfirmed,
      upcomingBookings: upcomingBookings.length,
      pastBookings: pastBookings.length,
      cancelledBookings: pureCancelledCount,
      rescheduledBookings: rescheduledCount,

      // Rates
      bookingRate: `${bookingRate}%`,
      cancelRate: `${cancelRate}%`,

      // Recent bookings for display
      recentUpcoming: upcomingBookings.slice(0, 5).map((b: CalcomBooking) => ({
        date: new Date(b.startTime).toLocaleDateString('es-ES', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'America/New_York',
        }),
        time: new Date(b.startTime).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/New_York',
        }),
        attendee: b.attendees?.[0]?.name || 'Sin nombre',
        status: b.rescheduled ? 'Reagendado' : 'Confirmado'
      })),

      // Last update
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Error fetching statistics' },
      { status: 500 }
    );
  }
}
