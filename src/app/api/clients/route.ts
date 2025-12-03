import { NextResponse } from 'next/server';

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: {
    Nombre?: string;
    'Teléfono'?: string;
    Servicio_Consultado?: string;
    'Fecha primer contacto\t'?: string;
    'Última actualización'?: string;
    Enlace_Cita_Enviado?: boolean;
  };
}

interface Client {
  id: string;
  name: string;
  phone: string;
  services: string[];
  firstContact: string | null;
  lastUpdate: string | null;
  linkSent: boolean;
}

// Fetch all clients from Airtable with pagination
async function fetchAllClients(): Promise<Client[]> {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = encodeURIComponent(process.env.AIRTABLE_TABLE_NAME || 'Datos de Clientes');
  const apiKey = process.env.AIRTABLE_API_KEY;

  if (!baseId || !apiKey) {
    throw new Error('Airtable not configured');
  }

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableName}`);
    url.searchParams.set('pageSize', '100');
    if (offset) {
      url.searchParams.set('offset', offset);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable fetch error:', errorText);
      throw new Error(`Airtable error: ${response.status}`);
    }

    const data = await response.json();
    allRecords.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  // Transform Airtable records to Client objects
  return allRecords.map((record): Client => {
    const fields = record.fields;
    const servicesStr = fields.Servicio_Consultado || '';
    const services = servicesStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return {
      id: record.id,
      name: fields.Nombre || 'Desconocido',
      phone: fields['Teléfono'] || '',
      services,
      firstContact: fields['Fecha primer contacto\t'] || null,
      lastUpdate: fields['Última actualización'] || null,
      linkSent: fields.Enlace_Cita_Enviado || false,
    };
  });
}

export async function GET() {
  try {
    const clients = await fetchAllClients();

    // Calculate statistics
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count new clients this week
    const newThisWeek = clients.filter(c => {
      if (!c.firstContact) return false;
      const contactDate = new Date(c.firstContact);
      return contactDate >= oneWeekAgo;
    }).length;

    // Count new clients today
    const newToday = clients.filter(c => {
      if (!c.firstContact) return false;
      const contactDate = new Date(c.firstContact);
      return contactDate >= oneDayAgo;
    }).length;

    // Count clients with link sent
    const withLinkSent = clients.filter(c => c.linkSent).length;

    // Service statistics
    const serviceCount: Record<string, number> = {};
    clients.forEach(client => {
      client.services.forEach(service => {
        serviceCount[service] = (serviceCount[service] || 0) + 1;
      });
    });

    // Top services
    const topServices = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([service, count]) => ({ service, count }));

    // Sort clients by most recent first
    const sortedClients = [...clients].sort((a, b) => {
      const dateA = a.lastUpdate || a.firstContact || '';
      const dateB = b.lastUpdate || b.firstContact || '';
      return dateB.localeCompare(dateA);
    });

    return NextResponse.json({
      clients: sortedClients,
      stats: {
        total: clients.length,
        newThisWeek,
        newToday,
        withLinkSent,
        linkSentPercentage: clients.length > 0
          ? Math.round((withLinkSent / clients.length) * 100)
          : 0,
        topServices,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Error fetching clients from Airtable' },
      { status: 500 }
    );
  }
}
