import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class StatisticsUpdateTool implements Tool {
  [key: string]: any;
  name = "statistics_update";
  description = "Detects and optionally updates out-of-date statistics on tables";

  inputSchema: {
    type: "object";
    properties: {
      update: {
        type: "boolean";
        description: string;
      };
      tableName: {
        type: "string";
        description: string;
      };
      samplePercent: {
        type: "integer";
        description: string;
        minimum: number;
        maximum: number;
      };
      debug: {
        type: "boolean";
        description: string;
      };
    };
    required: string[];
  } = {
    type: "object",
    properties: {
      update: {
        type: "boolean",
        description: "If true, update statistics. If false, only report (default: false)"
      },
      tableName: {
        type: "string",
        description: "Optional: Only check statistics for a specific table"
      },
      samplePercent: {
        type: "integer",
        description: "Optional: Percent of rows to sample when updating (default: full scan)",
        minimum: 1,
        maximum: 100
      },
      debug: {
        type: "boolean",
        description: "Enable debug logging"
      }
    },
    required: []
  };

  async run(params: any) {
    const {
      update = false,
      tableName,
      samplePercent,
      debug = false
    } = params;

    try {
      const request = new sql.Request();

      let query = `
        SELECT 
          s.name AS schema_name,
          t.name AS table_name,
          st.name AS stat_name,
          st.stats_id,
          sp.last_updated,
          sp.rows,
          sp.rows_sampled,
          sp.modification_counter
        FROM sys.stats st
        JOIN sys.objects t ON st.object_id = t.object_id
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        OUTER APPLY sys.dm_db_stats_properties(t.object_id, st.stats_id) sp
        WHERE t.type = 'U'
      `;

      if (tableName) {
        query += ` AND t.name = @tableName`;
        request.input("tableName", sql.NVarChar, tableName);
      }

      const result = await request.query(query);

      const outOfDateStats = result.recordset.filter((row: any) => {
        // Heuristic: consider out-of-date if >500 modifications since last update
        return row.modification_counter !== null && row.modification_counter > 500;
      });

      let updateResults: any[] = [];

      if (update && outOfDateStats.length > 0) {
        for (const stat of outOfDateStats) {
          const fullTableName = `[${stat.schema_name}].[${stat.table_name}]`;
          const updateQuery = samplePercent
            ? `UPDATE STATISTICS ${fullTableName} ([${stat.stat_name}]) WITH SAMPLE ${samplePercent} PERCENT`
            : `UPDATE STATISTICS ${fullTableName} ([${stat.stat_name}])`;

          if (debug) console.log("Executing:", updateQuery);
          try {
            await new sql.Request().query(updateQuery);
            updateResults.push({
              table: fullTableName,
              stat_name: stat.stat_name,
              updated: true
            });
          } catch (e) {
            updateResults.push({
              table: fullTableName,
              stat_name: stat.stat_name,
              updated: false,
              error: (e as Error).message
            });
          }
        }
      }

      return {
        success: true,
        message: `Found ${outOfDateStats.length} out-of-date statistics`,
        updated: update ? updateResults.length : 0,
        details: update ? updateResults : outOfDateStats
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error running StatisticsUpdateTool: ${error.message}`
      };
    }
  }
}