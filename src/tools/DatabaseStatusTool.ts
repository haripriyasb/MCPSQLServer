import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class DatabaseStatusTool implements Tool {
  [key: string]: any;
  name = "database_status";
  description = "Check database states: offline, suspect, read-only, etc.";

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
        name,
        state_desc,
        user_access_desc,
        is_read_only,
        recovery_model_desc
      FROM sys.databases
      WHERE state_desc != 'ONLINE' OR is_read_only = 1
    `;
    try {
      const request = new sql.Request();
      const result = await request.query(query);
      return {
        success: true,
        message: "Non-online or read-only databases listed",
        databases: result.recordset
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to retrieve database statuses: ${err.message}`
      };
    }
  }
}