import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class CheckDBTool implements Tool {
  [key: string]: any;
  name = "check_db";
  description = "Runs DBCC CHECKDB on a specified database to check for consistency errors";

  inputSchema = {
    type: "object",
    properties: {
      databaseName: {
        type: "string",
        description: "The name of the database to check"
      }
    },
    required: ["databaseName"]
  } as any;

  async run(params: any) {
    const { databaseName } = params;

    try {
      // Safely quote the database name to prevent injection
      const safeDbName = `[${databaseName.replace(/[\[\]]/g, "")}]`;
      const request = new sql.Request();
      const query = `DBCC CHECKDB(${safeDbName}) WITH NO_INFOMSGS, ALL_ERRORMSGS`;

      const result = await request.query(query);

      return {
        success: true,
        message: `DBCC CHECKDB completed for database [${databaseName}]`,
        errorsFound: result.recordset.length > 0,
        details: result.recordset
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          message: `Failed to check database: ${error.message}`,
        };
      } else {
        return {
          success: false,
          message: `Failed to check database: ${String(error)}`,
        };
      }
    }
  }
}
