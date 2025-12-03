import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.CALCOM_API_KEY;
    const searchParams = request.nextUrl.searchParams;
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const eventTypeId = searchParams.get('eventTypeId');

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'startTime y endTime son requeridos' },
        { status: 400 }
      );
    }

    // First get the event types if not provided
    let eventId = eventTypeId;
    if (!eventId) {
      const eventTypesResponse = await fetch(
        `https://api.cal.com/v1/event-types?apiKey=${apiKey}`
      );

      if (eventTypesResponse.ok) {
        const eventTypesData = await eventTypesResponse.json();
        const eventTypes = eventTypesData.event_types || [];
        // Get the first active event type
        const activeEvent = eventTypes.find((et: { hidden: boolean }) => !et.hidden);
        if (activeEvent) {
          eventId = activeEvent.id.toString();
        }
      }
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'No se encontro un tipo de evento activo' },
        { status: 400 }
      );
    }

    // Get available slots
    const slotsResponse = await fetch(
      `https://api.cal.com/v1/slots/available?apiKey=${apiKey}&eventTypeId=${eventId}&startTime=${startTime}&endTime=${endTime}`
    );

    if (!slotsResponse.ok) {
      const errorText = await slotsResponse.text();
      console.error('Cal.com slots error:', errorText);
      return NextResponse.json(
        { error: 'Error al obtener horarios disponibles' },
        { status: slotsResponse.status }
      );
    }

    const slotsData = await slotsResponse.json();

    return NextResponse.json({
      slots: slotsData.slots || {},
      eventTypeId: eventId
    });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json(
      { error: 'Error al obtener horarios disponibles' },
      { status: 500 }
    );
  }
}
