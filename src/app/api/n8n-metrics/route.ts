import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

interface N8nExecution {
  id: number;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt: string;
  workflowId: string;
  status: string;
}

function getDateRange(period: string, year?: string, month?: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);

  switch (period) {
    case '7days':
      return {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end
      };
    case '30days':
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end
      };
    case '90days':
      return {
        start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        end
      };
    case 'month':
      if (year && month) {
        const y = parseInt(year);
        const m = parseInt(month) - 1;
        return {
          start: new Date(y, m, 1),
          end: new Date(y, m + 1, 0, 23, 59, 59)
        };
      }
      // Current month
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end
      };
    case 'year':
      if (year) {
        const y = parseInt(year);
        return {
          start: new Date(y, 0, 1),
          end: new Date(y, 11, 31, 23, 59, 59)
        };
      }
      // Current year
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end
      };
    case 'all':
      return {
        start: new Date(2020, 0, 1),
        end
      };
    default:
      return {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end
      };
  }
}

export async function GET(request: NextRequest) {
  try {
    const apiUrl = process.env.N8N_API_URL;
    const apiKey = process.env.N8N_API_KEY;
    const workflowId = process.env.N8N_WORKFLOW_ID;

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { error: 'n8n API not configured' },
        { status: 500 }
      );
    }

    // Get filter parameters
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '7days';
    const year = searchParams.get('year') || undefined;
    const month = searchParams.get('month') || undefined;

    const { start: filterStart, end: filterEnd } = getDateRange(period, year, month);

    // Fetch more executions for longer periods
    const limit = period === 'all' || period === 'year' ? 500 : period === '90days' ? 300 : 100;

    // Fetch executions for the WhatsApp agent workflow
    const response = await fetch(
      `${apiUrl}/api/v1/executions?workflowId=${workflowId}&limit=${limit}`,
      {
        headers: {
          'X-N8N-API-KEY': apiKey,
          'Accept': 'application/json',
        },
        next: { revalidate: 60 }
      }
    );

    if (!response.ok) {
      console.error('n8n API error:', await response.text());
      return NextResponse.json(
        { error: 'Error fetching n8n metrics' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const allExecutions: N8nExecution[] = data.data || [];

    // Filter executions by date range
    const filteredExecutions = allExecutions.filter((e) => {
      const execDate = new Date(e.startedAt);
      return execDate >= filterStart && execDate <= filterEnd;
    });

    const successfulExecutions = filteredExecutions.filter(
      (e) => e.status === 'success'
    );
    const failedExecutions = filteredExecutions.filter(
      (e) => e.status === 'error'
    );

    // Group executions by day for chart data
    const executionsByDay: Record<string, { success: number; error: number; date: string }> = {};
    filteredExecutions.forEach((e) => {
      const date = new Date(e.startedAt).toISOString().split('T')[0];
      if (!executionsByDay[date]) {
        executionsByDay[date] = { success: 0, error: 0, date };
      }
      if (e.status === 'success') {
        executionsByDay[date].success++;
      } else {
        executionsByDay[date].error++;
      }
    });

    // Group by month for year view
    const executionsByMonth: Record<string, { success: number; error: number; month: string }> = {};
    if (period === 'year' || period === 'all') {
      filteredExecutions.forEach((e) => {
        const date = new Date(e.startedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!executionsByMonth[monthKey]) {
          executionsByMonth[monthKey] = { success: 0, error: 0, month: monthKey };
        }
        if (e.status === 'success') {
          executionsByMonth[monthKey].success++;
        } else {
          executionsByMonth[monthKey].error++;
        }
      });
    }

    // Recent executions for display (from filtered)
    const recentExecutions = filteredExecutions.slice(0, 10).map((e) => ({
      id: e.id,
      status: e.status,
      startedAt: e.startedAt,
      duration: e.stoppedAt && e.startedAt
        ? Math.round(
            (new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime()) / 1000
          )
        : null,
    }));

    // Calculate for comparison periods
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const executionsLast7Days = allExecutions.filter(
      (e) => new Date(e.startedAt) >= last7Days
    );
    const executionsLast30Days = allExecutions.filter(
      (e) => new Date(e.startedAt) >= last30Days
    );

    const metrics = {
      // Current filter
      period,
      filterStart: filterStart.toISOString(),
      filterEnd: filterEnd.toISOString(),

      // Filtered metrics
      totalExecutions: filteredExecutions.length,
      successfulExecutions: successfulExecutions.length,
      failedExecutions: failedExecutions.length,
      successRate: filteredExecutions.length > 0
        ? ((successfulExecutions.length / filteredExecutions.length) * 100).toFixed(1)
        : '0',

      // Quick stats (always last 7/30 days for reference)
      totalExecutions7Days: executionsLast7Days.length,
      successRate7Days: executionsLast7Days.length > 0
        ? ((executionsLast7Days.filter(e => e.status === 'success').length / executionsLast7Days.length) * 100).toFixed(1)
        : '0',
      totalExecutions30Days: executionsLast30Days.length,
      successRate30Days: executionsLast30Days.length > 0
        ? ((executionsLast30Days.filter(e => e.status === 'success').length / executionsLast30Days.length) * 100).toFixed(1)
        : '0',

      // Chart data
      executionsByDay: Object.values(executionsByDay)
        .sort((a, b) => a.date.localeCompare(b.date)),
      executionsByMonth: Object.values(executionsByMonth)
        .sort((a, b) => a.month.localeCompare(b.month)),

      // Recent executions
      recentExecutions,

      // Total all time
      totalExecutionsAllTime: allExecutions.length,

      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching n8n metrics:', error);
    return NextResponse.json(
      { error: 'Error fetching n8n metrics' },
      { status: 500 }
    );
  }
}
