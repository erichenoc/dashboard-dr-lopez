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

async function getCalcomBookings(status: string) {
  const response = await fetch(
    `https://api.cal.com/v1/bookings?apiKey=${process.env.CALCOM_API_KEY}&status=${status}`,
    { next: { revalidate: 60 } }
  );

  if (!response.ok) {
    console.error(`Cal.com API error for ${status}:`, await response.text());
    return [];
  }

  const data = await response.json();
  return data.bookings || [];
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
      upcomingBookings,
      pastBookings,
      cancelledBookings,
      airtableRecords
    ] = await Promise.all([
      getCalcomBookings('upcoming'),
      getCalcomBookings('past'),
      getCalcomBookings('cancelled'),
      getAirtableRecords()
    ]);

    // Filter Airtable records by date
    const filteredAirtableRecords = airtableRecords.filter((r: AirtableRecord) => {
      const recordDate = new Date(r.createdTime);
      return recordDate >= filterStart && recordDate <= filterEnd;
    });

    // Count rescheduled bookings (from cancelled that have rescheduled flag)
    const rescheduledCount = cancelledBookings.filter(
      (b: CalcomBooking) => b.rescheduled === true
    ).length;

    // Count pure cancellations (cancelled without reschedule)
    const pureCancelledCount = cancelledBookings.length - rescheduledCount;

    // Count links sent from Airtable (filtered by date)
    const linksSentCount = filteredAirtableRecords.filter(
      (r: AirtableRecord) => r.fields.Enlace_Cita_Enviado === true
    ).length;

    // Total chats (filtered Airtable records)
    const totalChats = filteredAirtableRecords.length;

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
          day: 'numeric'
        }),
        time: new Date(b.startTime).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
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
