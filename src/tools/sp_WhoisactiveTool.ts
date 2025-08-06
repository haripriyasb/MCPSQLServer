import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class sp_WhoisActiveTool implements Tool {
  [key: string]: any;
  name = "whoisactive";
  description = "Executes sp_whoisactive to show current activity and sessions on the SQL Server instance";

  inputSchema = {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: "Filter for specific sessions (e.g., database name, program name, or session ID)"
      },
      filterType: {
        type: "string",
        description: "Type of filter to apply",
        enum: ["session", "program", "database", "login", "host"]
      },
      showSystemSpids: {
        type: "boolean",
        description: "Include system sessions in results (default: false)"
      },
      showSleepingSpids: {
        type: "boolean", 
        description: "Include sleeping sessions in results (default: false)"
      },
      getFullInnerText: {
        type: "boolean",
        description: "Get full SQL text instead of truncated version (default: false)"
      },
      getPlans: {
        type: "boolean",
        description: "Include execution plans in results (default: false)"
      },
      getLocks: {
        type: "boolean",
        description: "Include lock information in results (default: false)"
      },
      findBlockLeaders: {
        type: "boolean",
        description: "Find and highlight blocking sessions (default: false)"
      },
      sortOrder: {
        type: "string",
        description: "Column to sort results by",
        enum: ["start_time", "session_id", "blocking_session_id", "cpu", "reads", "writes", "duration"]
      }
    },
    required: []
  } as any;

  async run(params: any) {
    const {
      filter,
      filterType = "session",
      showSystemSpids = false,
      showSleepingSpids = false,
      getFullInnerText = false,
      getPlans = false,
      getLocks = false,
      findBlockLeaders = false,
      sortOrder = "start_time"
    } = params;

    try {
      const request = new sql.Request();
      
      // Build the sp_whoisactive command with parameters
      let query = "EXEC sp_whoisactive";
      const queryParams: string[] = [];

      if (filter) {
        queryParams.push(`@filter = '${filter.replace(/'/g, "''")}'`);
        queryParams.push(`@filter_type = '${filterType}'`);
      }

      if (showSystemSpids) {
        queryParams.push("@show_system_spids = 1");
      }

      if (showSleepingSpids) {
        queryParams.push("@show_sleeping_spids = 1");
      }

      if (getFullInnerText) {
        queryParams.push("@get_full_inner_text = 1");
      }

      if (getPlans) {
        queryParams.push("@get_plans = 1");
      }

      if (getLocks) {
        queryParams.push("@get_locks = 1");
      }

      if (findBlockLeaders) {
        queryParams.push("@find_block_leaders = 1");
      }

      if (sortOrder) {
        queryParams.push(`@sort_order = '[${sortOrder}] ASC'`);
      }

      // Add parameters to query if any exist
      if (queryParams.length > 0) {
        query += " " + queryParams.join(", ");
      }

      const result = await request.query(query);

      return {
        success: true,
        message: `sp_whoisactive executed successfully`,
        sessionCount: result.recordset.length,
        activeSessions: result.recordset,
        hasBlockingSessions: result.recordset.some((row: any) => row.blocking_session_id && row.blocking_session_id > 0)
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          message: `Failed to execute sp_whoisactive: ${error.message}`,
        };
      } else {
        return {
          success: false,
          message: `Failed to execute sp_whoisactive: ${String(error)}`,
        };
      }
    }
  }
}