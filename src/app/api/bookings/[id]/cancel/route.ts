import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    const apiKey = process.env.CALCOM_API_KEY;

    const response = await fetch(
      `https://api.cal.com/v1/bookings/${id}/cancel?apiKey=${apiKey}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancellationReason: reason || 'Cancelado desde el dashboard',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cal.com cancel error:', errorText);
      return NextResponse.json(
        { error: 'Error al cancelar la cita' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Cita cancelada correctamente' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Error al cancelar la cita' },
      { status: 500 }
    );
  }
}
