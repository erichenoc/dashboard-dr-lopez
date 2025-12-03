import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.CALCOM_API_KEY;

    const response = await fetch(
      `https://api.cal.com/v1/event-types?apiKey=${apiKey}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cal.com event types error:', errorText);
      return NextResponse.json(
        { error: 'Error al obtener tipos de eventos' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const eventTypes = data.event_types || [];

    // Filter to only active event types and return relevant info
    const activeEventTypes = eventTypes
      .filter((et: { hidden: boolean }) => !et.hidden)
      .map((et: { id: number; title: string; slug: string; length: number; description: string }) => ({
        id: et.id,
        title: et.title,
        slug: et.slug,
        length: et.length,
        description: et.description,
      }));

    return NextResponse.json({ eventTypes: activeEventTypes });
  } catch (error) {
    console.error('Error fetching event types:', error);
    return NextResponse.json(
      { error: 'Error al obtener tipos de eventos' },
      { status: 500 }
    );
  }
}
