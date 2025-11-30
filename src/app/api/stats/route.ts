import { NextResponse } from 'next/server';

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
  fields: {
    Nombre?: string;
    Teléfono?: string;
    Servicio_Consultado?: string;
    Enlace_Cita_Enviado?: boolean;
    'Fecha primer contacto'?: string;
    'Última actualización'?: string;
  };
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

  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${tableName}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }
    }
  );

  if (!response.ok) {
    console.error('Airtable API error:', await response.text());
    return [];
  }

  const data = await response.json();
  return data.records || [];
}

export async function GET() {
  try {
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

    // Count rescheduled bookings (from cancelled that have rescheduled flag)
    const rescheduledCount = cancelledBookings.filter(
      (b: CalcomBooking) => b.rescheduled === true
    ).length;

    // Count pure cancellations (cancelled without reschedule)
    const pureCancelledCount = cancelledBookings.length - rescheduledCount;

    // Count links sent from Airtable
    const linksSentCount = airtableRecords.filter(
      (r: AirtableRecord) => r.fields.Enlace_Cita_Enviado === true
    ).length;

    // Total chats (total Airtable records)
    const totalChats = airtableRecords.length;

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
