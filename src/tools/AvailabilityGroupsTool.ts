import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class AvailabilityGroupsTool implements Tool {
  [key: string]: any;
  name = "availability_groups";
  description = "Check status of availability groups and replica sync";

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
        ag.name AS availability_group,
        ar.replica_server_name,
        ars.role_desc,
        ars.synchronization_health_desc,
        drs.database_name,
        drs.synchronization_state_desc
      FROM sys.availability_groups ag
      JOIN sys.availability_replicas ar ON ag.group_id = ar.group_id
      JOIN sys.dm_hadr_availability_replica_states ars ON ar.replica_id = ars.replica_id
      JOIN sys.dm_hadr_database_replica_states drs ON ars.replica_id = drs.replica_id
    `;
    try {
      const request = new sql.Request();
      const result = await request.query(query);
      return {
        success: true,
        message: "Availability group status retrieved",
        availabilityGroups: result.recordset
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to get availability group status: ${err.message}`
      };
    }
  }
}