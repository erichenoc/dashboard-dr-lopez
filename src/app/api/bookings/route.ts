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

    // Fetch all booking types
    const [upcoming, past, cancelled] = await Promise.all([
      fetch(`https://api.cal.com/v1/bookings?apiKey=${apiKey}&status=upcoming`),
      fetch(`https://api.cal.com/v1/bookings?apiKey=${apiKey}&status=past`),
      fetch(`https://api.cal.com/v1/bookings?apiKey=${apiKey}&status=cancelled`)
    ]);

    const [upcomingData, pastData, cancelledData] = await Promise.all([
      upcoming.json(),
      past.json(),
      cancelled.json()
    ]);

    const allBookings = [
      ...(upcomingData.bookings || []).map((b: CalcomBooking) => ({ ...b, bookingStatus: 'upcoming' })),
      ...(pastData.bookings || []).map((b: CalcomBooking) => ({ ...b, bookingStatus: 'past' })),
      ...(cancelledData.bookings || []).map((b: CalcomBooking) => ({ ...b, bookingStatus: 'cancelled' }))
    ];

    // Sort by date descending
    allBookings.sort((a, b) =>
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
