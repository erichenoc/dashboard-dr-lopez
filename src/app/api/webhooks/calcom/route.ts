import { NextRequest, NextResponse } from 'next/server';

// Cal.com webhook payload types
interface CalcomWebhookPayload {
  triggerEvent: 'BOOKING_CREATED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED' | 'BOOKING_CONFIRMED';
  createdAt: string;
  payload: {
    id: number;
    uid: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    status: string;
    attendees: {
      name: string;
      email: string;
      timeZone: string;
    }[];
    organizer: {
      name: string;
      email: string;
      timeZone: string;
    };
    responses?: {
      name?: string;
      email?: string;
      Apellido?: string;
      Telefono?: string;
      Direccion?: string;
      'Fecha-de-Nacimiento'?: string;
      Seguro_medico?: string[];
    };
    metadata?: Record<string, unknown>;
    rescheduleUid?: string;
    cancelledBy?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: CalcomWebhookPayload = await request.json();

    console.log('Cal.com webhook received:', payload.triggerEvent, payload.payload.uid);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const booking = payload.payload;
    const attendee = booking.attendees?.[0];

    // Prepare booking data for Supabase
    const bookingData = {
      calcom_id: booking.id,
      uid: booking.uid,
      title: booking.title,
      status: mapStatus(payload.triggerEvent, booking.status),
      start_time: booking.startTime,
      end_time: booking.endTime,
      attendee_name: attendee?.name || null,
      attendee_email: attendee?.email || null,
      attendee_phone: booking.responses?.Telefono || null,
      attendee_timezone: attendee?.timeZone || null,
      organizer_name: booking.organizer?.name || null,
      organizer_email: booking.organizer?.email || null,
      responses: booking.responses || null,
      rescheduled: payload.triggerEvent === 'BOOKING_RESCHEDULED',
      cancelled_by: booking.cancelledBy || null,
      webhook_event: payload.triggerEvent,
      updated_at: new Date().toISOString(),
    };

    // Upsert booking to Supabase (insert or update if exists)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/calcom_bookings`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(bookingData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      return NextResponse.json({ error: 'Database error', details: errorText }, { status: 500 });
    }

    console.log('Booking saved successfully:', booking.uid);

    return NextResponse.json({
      success: true,
      event: payload.triggerEvent,
      bookingId: booking.uid
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Map Cal.com events to status
function mapStatus(event: string, currentStatus: string): string {
  switch (event) {
    case 'BOOKING_CREATED':
    case 'BOOKING_CONFIRMED':
      return 'CONFIRMED';
    case 'BOOKING_CANCELLED':
      return 'CANCELLED';
    case 'BOOKING_RESCHEDULED':
      return 'RESCHEDULED';
    default:
      return currentStatus || 'PENDING';
  }
}

// Verify webhook is working
export async function GET() {
  return NextResponse.json({
    status: 'Webhook endpoint active',
    endpoint: '/api/webhooks/calcom',
    events: ['BOOKING_CREATED', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'BOOKING_CONFIRMED']
  });
}
