import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class AgentJobHealthTool implements Tool {
  [key: string]: any;
  name = "agent_job_health";
  description = "Check SQL Agent jobs for failures or issues";

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
      SELECT 
        j.name AS job_name,
        j.enabled,
        h.run_status,
        h.run_date,
        h.run_time,
        h.message
      FROM msdb.dbo.sysjobs j
      LEFT JOIN (
        SELECT job_id, MAX(instance_id) AS last_run_id
        FROM msdb.dbo.sysjobhistory
        GROUP BY job_id
      ) latest ON j.job_id = latest.job_id
      LEFT JOIN msdb.dbo.sysjobhistory h ON latest.last_run_id = h.instance_id
      WHERE j.enabled = 1
    `;
    try {
      const request = new sql.Request();
      const result = await request.query(query);
      return {
        success: true,
        message: "SQL Agent job statuses retrieved",
        jobs: result.recordset
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to get Agent job health: ${err.message}`
      };
    }
  }
}