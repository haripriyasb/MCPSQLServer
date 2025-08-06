import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class BackupStatusTool implements Tool {
  [key: string]: any;
  name = "backup_status";
  description = "Check latest full, diff, and log backups for all databases";

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
        d.name AS database_name,
        MAX(CASE WHEN b.type = 'D' THEN b.backup_finish_date END) AS last_full_backup,
        MAX(CASE WHEN b.type = 'I' THEN b.backup_finish_date END) AS last_diff_backup,
        MAX(CASE WHEN b.type = 'L' THEN b.backup_finish_date END) AS last_log_backup
      FROM sys.databases d
      LEFT JOIN msdb.dbo.backupset b ON b.database_name = d.name
      WHERE d.state_desc = 'ONLINE'
      GROUP BY d.name
    `;
    try {
      const request = new sql.Request();
      const result = await request.query(query);
      return {
        success: true,
        message: "Backup status retrieved",
        backups: result.recordset
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error retrieving backup status: ${err.message}`
      };
    }
  }
}