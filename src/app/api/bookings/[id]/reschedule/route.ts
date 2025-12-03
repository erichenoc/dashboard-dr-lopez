import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { startTime, reason } = body;

    if (!startTime) {
      return NextResponse.json(
        { error: 'startTime es requerido' },
        { status: 400 }
      );
    }

    const apiKey = process.env.CALCOM_API_KEY;

    // Cal.com API to reschedule a booking
    const response = await fetch(
      `https://api.cal.com/v1/bookings/${id}?apiKey=${apiKey}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime,
          rescheduledReason: reason || 'Reagendado desde el dashboard',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cal.com reschedule error:', errorText);
      return NextResponse.json(
        { error: 'Error al reagendar la cita', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Cita reagendada correctamente',
      booking: data.booking
    });
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    return NextResponse.json(
      { error: 'Error al reagendar la cita' },
      { status: 500 }
    );
  }
}
