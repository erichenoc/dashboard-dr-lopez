import { NextResponse } from 'next/server';

interface N8nExecution {
  id: number;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt: string;
  workflowId: string;
  status: string;
}

export async function GET() {
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

    // Fetch executions for the WhatsApp agent workflow
    const response = await fetch(
      `${apiUrl}/api/v1/executions?workflowId=${workflowId}&limit=100`,
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
    const executions: N8nExecution[] = data.data || [];

    // Calculate metrics
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const executionsLast7Days = executions.filter(
      (e) => new Date(e.startedAt) >= last7Days
    );
    const executionsLast30Days = executions.filter(
      (e) => new Date(e.startedAt) >= last30Days
    );

    const successfulLast7Days = executionsLast7Days.filter(
      (e) => e.status === 'success'
    );
    const failedLast7Days = executionsLast7Days.filter(
      (e) => e.status === 'error'
    );

    const successfulLast30Days = executionsLast30Days.filter(
      (e) => e.status === 'success'
    );
    const failedLast30Days = executionsLast30Days.filter(
      (e) => e.status === 'error'
    );

    // Group executions by day for chart data
    const executionsByDay: Record<string, { success: number; error: number }> = {};
    executionsLast7Days.forEach((e) => {
      const date = new Date(e.startedAt).toISOString().split('T')[0];
      if (!executionsByDay[date]) {
        executionsByDay[date] = { success: 0, error: 0 };
      }
      if (e.status === 'success') {
        executionsByDay[date].success++;
      } else {
        executionsByDay[date].error++;
      }
    });

    // Recent executions for display
    const recentExecutions = executions.slice(0, 10).map((e) => ({
      id: e.id,
      status: e.status,
      startedAt: e.startedAt,
      duration: e.stoppedAt && e.startedAt
        ? Math.round(
            (new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime()) / 1000
          )
        : null,
    }));

    const metrics = {
      // Last 7 days
      totalExecutions7Days: executionsLast7Days.length,
      successfulExecutions7Days: successfulLast7Days.length,
      failedExecutions7Days: failedLast7Days.length,
      successRate7Days: executionsLast7Days.length > 0
        ? ((successfulLast7Days.length / executionsLast7Days.length) * 100).toFixed(1)
        : '0',

      // Last 30 days
      totalExecutions30Days: executionsLast30Days.length,
      successfulExecutions30Days: successfulLast30Days.length,
      failedExecutions30Days: failedLast30Days.length,
      successRate30Days: executionsLast30Days.length > 0
        ? ((successfulLast30Days.length / executionsLast30Days.length) * 100).toFixed(1)
        : '0',

      // Chart data
      executionsByDay: Object.entries(executionsByDay)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date)),

      // Recent executions
      recentExecutions,

      // Total all time (from returned data)
      totalExecutionsAllTime: executions.length,

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
