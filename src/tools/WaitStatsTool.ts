import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class WaitStatsTool implements Tool {
  [key: string]: any;
  name = "wait_stats";
  description = "Show top wait types per instance";

  inputSchema: {
    type: "object";
    properties: {};
    required: string[];
  } = {
    type: "object",
    properties: {},
    required: []
  };

  async run(_: any) {
    const query = `
      SELECT TOP 20
        wait_type,
        wait_time_ms,
        max_wait_time_ms,
        waiting_tasks_count
      FROM sys.dm_os_wait_stats
      WHERE wait_type NOT IN (
        'CLR_SEMAPHORE', 'LAZYWRITER_SLEEP', 'RESOURCE_QUEUE',
        'SLEEP_TASK', 'SLEEP_SYSTEMTASK', 'SQLTRACE_BUFFER_FLUSH',
        'WAITFOR', 'LOGMGR_QUEUE', 'CHECKPOINT_QUEUE',
        'REQUEST_FOR_DEADLOCK_SEARCH', 'XE_TIMER_EVENT',
        'XE_DISPATCHER_JOIN', 'BROKER_TO_FLUSH', 'BROKER_TASK_STOP',
        'CLR_MANUAL_EVENT', 'CLR_AUTO_EVENT', 'DISPATCHER_QUEUE_SEMAPHORE',
        'FT_IFTS_SCHEDULER_IDLE_WAIT', 'XE_DISPATCHER_WAIT',
        'FT_IFTSHC_MUTEX', 'BROKER_EVENTHANDLER', 'TRACEWRITE',
        'XE_BUFFERMGR_ALLPROCESSED', 'SQLTRACE_INCREMENTAL_FLUSH_SLEEP'
      )
      ORDER BY wait_time_ms DESC;
    `;
    try {
      const request = new sql.Request();
      const result = await request.query(query);
      return {
        success: true,
        message: "Top wait stats retrieved",
        waits: result.recordset
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to retrieve wait stats: ${err.message}`
      };
    }
  }
}