import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class CheckConnectivityTool implements Tool {
  [key: string]: any;
  name = "check_connectivity";
  description = "Test SQL connection and basic metadata query";

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
    try {
      const request = new sql.Request();
      const result = await request.query("SELECT @@SERVERNAME AS ServerName, SYSDATETIME() AS CurrentTime");

      return {
        success: true,
        message: "Connection successful",
        details: result.recordset
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect or query: ${err.message}`
      };
    }
  }
}