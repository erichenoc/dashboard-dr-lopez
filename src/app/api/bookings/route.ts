import { NextResponse } from 'next/server';

interface CalcomBooking {
  id: number;
  uid: string;
  status: string;
  rescheduled: boolean;
  startTime: string;
  endTime: string;
  title: string;
  attendees: { name: string; email: string; timeZone: string }[];
  user: { name: string; email: string };
}

export async function GET() {
  try {
    const apiKey = process.env.CALCOM_API_KEY;

    // Single API call with 10 minute cache to reduce rate limiting
    const response = await fetch(
      `https://api.cal.com/v1/bookings?apiKey=${apiKey}&take=500`,
      { next: { revalidate: 600 } }
    );

    if (!response.ok) {
      console.error('Cal.com API error:', await response.text());
      return NextResponse.json({ bookings: [] });
    }

    const data = await response.json();
    const bookings = data.bookings || [];
    const now = new Date();

    // Categorize bookings by status and time
    const allBookings = bookings.map((b: CalcomBooking) => {
      const startTime = new Date(b.startTime);
      let bookingStatus: string;

      if (b.status === 'CANCELLED') {
        bookingStatus = 'cancelled';
      } else if (startTime > now) {
        bookingStatus = 'upcoming';
      } else {
        bookingStatus = 'past';
      }

      return { ...b, bookingStatus };
    });

    // Sort by date descending
    allBookings.sort((a: CalcomBooking & { bookingStatus: string }, b: CalcomBooking & { bookingStatus: string }) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    return NextResponse.json({ bookings: allBookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Error fetching bookings' },
      { status: 500 }
    );
  }
}
