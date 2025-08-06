import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class QueryPlanTool implements Tool {
  [key: string]: any;
  name = "query_plan";
  description = "Dump poor-performing plans from cache";

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
        qs.total_worker_time / qs.execution_count AS AvgCPUTime,
        qs.execution_count,
        qs.total_elapsed_time / qs.execution_count AS AvgDuration,
        qs.plan_handle,
        SUBSTRING(st.text, (qs.statement_start_offset/2) + 1,
          ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(st.text)
            ELSE qs.statement_end_offset END - qs.statement_start_offset)/2) + 1) AS QueryText,
        qp.query_plan
      FROM sys.dm_exec_query_stats qs
      CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
      CROSS APPLY sys.dm_exec_query_plan(qs.plan_handle) qp
      ORDER BY AvgCPUTime DESC;
    `;
    try {
      const request = new sql.Request();
      const result = await request.query(query);
      return {
        success: true,
        message: "Top poor-performing query plans retrieved",
        plans: result.recordset
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to retrieve query plans: ${err.message}`
      };
    }
  }
}