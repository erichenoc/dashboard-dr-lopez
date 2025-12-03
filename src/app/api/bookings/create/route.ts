import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      lastName,
      email,
      phone,
      dateOfBirth,
      hasInsurance,
      address,
      services,
      notes,
      startTime,
      eventTypeId
    } = body;

    // Validate required fields
    if (!name || !lastName || !email || !phone || !dateOfBirth || !hasInsurance || !address || !startTime) {
      return NextResponse.json(
        { error: 'Todos los campos obligatorios son requeridos' },
        { status: 400 }
      );
    }

    const apiKey = process.env.CALCOM_API_KEY;

    // Get event type ID if not provided
    let eventId = eventTypeId;
    if (!eventId) {
      const eventTypesResponse = await fetch(
        `https://api.cal.com/v1/event-types?apiKey=${apiKey}`
      );

      if (eventTypesResponse.ok) {
        const eventTypesData = await eventTypesResponse.json();
        const eventTypes = eventTypesData.event_types || [];
        const activeEvent = eventTypes.find((et: { hidden: boolean }) => !et.hidden);
        if (activeEvent) {
          eventId = activeEvent.id;
        }
      }
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'No se encontro un tipo de evento activo' },
        { status: 400 }
      );
    }

    // Build responses object matching Cal.com custom fields
    // Format: name field uses "name" (full name = first + last)
    const fullName = `${name} ${lastName}`;

    // Compile notes with all additional info
    const compiledNotes = [
      notes || '',
      `Fecha de Nacimiento: ${dateOfBirth}`,
      `Seguro Médico: ${hasInsurance}`,
      `Dirección: ${address}`,
      services ? `Servicios: ${services}` : '',
    ].filter(Boolean).join('\n');

    // Create the booking
    const response = await fetch(
      `https://api.cal.com/v1/bookings?apiKey=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventTypeId: parseInt(eventId),
          start: startTime,
          responses: {
            name: fullName,
            email,
            phone: phone || '',
            notes: compiledNotes,
            // Cal.com custom fields (if configured in event type)
            lastName: lastName,
            dateOfBirth: dateOfBirth,
            hasInsurance: hasInsurance,
            address: address,
            services: services || '',
          },
          timeZone: 'America/New_York',
          language: 'es',
          metadata: {
            source: 'dashboard',
            lastName,
            dateOfBirth,
            hasInsurance,
            address,
            services: services || '',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cal.com create booking error:', errorText);
      return NextResponse.json(
        { error: 'Error al crear la cita', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Cita creada correctamente',
      booking: data
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Error al crear la cita' },
      { status: 500 }
    );
  }
}
