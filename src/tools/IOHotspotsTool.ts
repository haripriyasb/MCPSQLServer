import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class IOHotspotsTool implements Tool {
  [key: string]: any;
  name = "io_hotspots";
  description = "Identify top I/O-consuming databases and files";

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
        DB_NAME(mf.database_id) AS DatabaseName,
        mf.physical_name,
        mf.type_desc,
        io_stall_read_ms,
        num_of_reads,
        io_stall_write_ms,
        num_of_writes,
        size_on_disk_bytes
      FROM sys.dm_io_virtual_file_stats(NULL, NULL) AS io_stats
      JOIN sys.master_files AS mf
        ON io_stats.database_id = mf.database_id AND io_stats.file_id = mf.file_id
      ORDER BY io_stall_read_ms + io_stall_write_ms DESC;
    `;
    try {
      const request = new sql.Request();
      const result = await request.query(query);
      return {
        success: true,
        message: "Top I/O consuming files retrieved",
        ioHotspots: result.recordset
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to retrieve IO hotspots: ${err.message}`
      };
    }
  }
}