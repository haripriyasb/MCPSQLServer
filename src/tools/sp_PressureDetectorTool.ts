import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class sp_PressureDetectorTool implements Tool {
  [key: string]: any;
  name = "sp_pressure_detector";
  description = "Executes sp_PressureDetector to detect CPU and memory pressure on SQL Server";

  inputSchema = {
    type: "object",
    properties: {
      what_to_check: {
        type: "string",
        description: "Areas to check for pressure: 'all', 'cpu', or 'memory' (default: 'all')",
        enum: ["all", "cpu", "memory"]
      },
      skip_queries: {
        type: "boolean",
        description: "Skip looking at running queries (default: false)"
      },
      skip_plan_xml: {
        type: "boolean",
        description: "Skip getting plan XML (default: false)"
      },
      minimum_disk_latency_ms: {
        type: "integer",
        description: "Low bound for reporting disk latency in milliseconds (default: 100)",
        minimum: 0
      },
      cpu_utilization_threshold: {
        type: "integer",
        description: "Low bound for reporting high CPU utilization percentage (default: 50)",
        minimum: 0,
        maximum: 100
      },
      skip_waits: {
        type: "boolean",
        description: "Skip waits when you do not need them on every run (default: false)"
      },
      skip_perfmon: {
        type: "boolean",
        description: "Skip perfmon counters when you do not need them on every run (default: false)"
      },
      sample_seconds: {
        type: "integer",
        description: "Take a sample of your server's metrics for specified seconds (default: 0)",
        minimum: 0,
        maximum: 255
      },
      log_to_table: {
        type: "boolean",
        description: "Enable logging to permanent tables (default: false)"
      },
      log_database_name: {
        type: "string",
        description: "Database to store logging tables (default: current database)"
      },
      log_schema_name: {
        type: "string",
        description: "Schema to store logging tables (default: dbo)"
      },
      log_table_name_prefix: {
        type: "string",
        description: "Prefix for logging table names"
      },
      log_retention_days: {
        type: "integer",
        description: "Number of days to retain logged data",
        minimum: 1
      },
      help: {
        type: "boolean",
        description: "Show help information (default: false)"
      },
      debug: {
        type: "boolean",
        description: "Enable debug mode (default: false)"
      }
    },
    required: []
  } as any;

  async run(params: any) {
    const {
      what_to_check = 'all',
      skip_queries = false,
      skip_plan_xml = false,
      minimum_disk_latency_ms = 100,
      cpu_utilization_threshold = 50,
      skip_waits = false,
      skip_perfmon = false,
      sample_seconds = 0,
      log_to_table = false,
      log_database_name,
      log_schema_name,
      log_table_name_prefix,
      log_retention_days,
      help = false,
      debug = false
    } = params;

    try {
      const request = new sql.Request();
      
      // Build the sp_PressureDetector command with parameters
      let query = "EXEC sp_PressureDetector";
      const queryParams: string[] = [];

      const addParam = (paramName: string, value: any, isString = false) => {
        if (value !== undefined && value !== null) {
          if (isString) {
            queryParams.push(`@${paramName} = '${value.toString().replace(/'/g, "''")}'`);
          } else if (typeof value === 'boolean') {
            queryParams.push(`@${paramName} = ${value ? 1 : 0}`);
          } else {
            queryParams.push(`@${paramName} = ${value}`);
          }
        }
      };

      addParam("what_to_check", what_to_check, true);
      addParam("skip_queries", skip_queries);
      addParam("skip_plan_xml", skip_plan_xml);
      addParam("minimum_disk_latency_ms", minimum_disk_latency_ms);
      addParam("cpu_utilization_threshold", cpu_utilization_threshold);
      addParam("skip_waits", skip_waits);
      addParam("skip_perfmon", skip_perfmon);
      addParam("sample_seconds", sample_seconds);
      addParam("log_to_table", log_to_table);
      addParam("log_database_name", log_database_name, true);
      addParam("log_schema_name", log_schema_name, true);
      addParam("log_table_name_prefix", log_table_name_prefix, true);
      addParam("log_retention_days", log_retention_days);
      addParam("help", help);
      addParam("debug", debug);

      // Add parameters to query if any exist
      if (queryParams.length > 0) {
        query += " " + queryParams.join(", ");
      }

      const result = await request.query(query);

      // sp_PressureDetector returns multiple result sets
      // Handle the various types that result.recordsets can be
      let resultSets: any[] = [];
      if (result.recordsets) {
        if (Array.isArray(result.recordsets)) {
          resultSets = result.recordsets;
        } else {
          // If it's not an array, convert it to an array
          resultSets = [result.recordsets];
        }
      } else if (result.recordset) {
        // Fallback to single recordset
        resultSets = [result.recordset];
      }
      
      let pressureDetected = false;
      let summary = "";

      // Analyze the results to determine if pressure was detected
      if (resultSets.length > 0) {
        // First result set typically contains server metrics
        const serverMetrics = resultSets[0] || [];
        
        // Look for signs of pressure in the metrics
        if (what_to_check === 'all' || what_to_check === 'cpu') {
          const cpuPressure = serverMetrics.some((metric: any) => 
            (metric.metric_name && metric.metric_name.toLowerCase().includes('cpu')) ||
            (metric.current_value && metric.current_value > cpu_utilization_threshold)
          );
          if (cpuPressure) {
            pressureDetected = true;
            summary += "CPU pressure detected. ";
          }
        }

        if (what_to_check === 'all' || what_to_check === 'memory') {
          const memoryPressure = serverMetrics.some((metric: any) => 
            metric.metric_name && (
              metric.metric_name.toLowerCase().includes('memory') ||
              metric.metric_name.toLowerCase().includes('grant') ||
              metric.metric_name.toLowerCase().includes('semaphore')
            )
          );
          if (memoryPressure) {
            pressureDetected = true;
            summary += "Memory pressure detected. ";
          }
        }
      }

      if (!pressureDetected && resultSets.length > 0) {
        summary = "No significant pressure detected. ";
      }

      summary += `Returned ${resultSets.length} result set(s).`;

      return {
        success: true,
        message: `sp_PressureDetector executed successfully. ${summary}`,
        pressureDetected,
        details: {
          totalResultSets: resultSets.length,
          what_checked: what_to_check,
          sample_duration_seconds: sample_seconds,
          resultSets: resultSets.map((rs: any, index: number) => ({
            resultSetIndex: index,
            rowCount: rs?.length || 0,
            columns: rs?.length > 0 ? Object.keys(rs[0]) : [],
            data: rs || []
          }))
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          message: `Failed to execute sp_PressureDetector: ${error.message}`,
        };
      } else {
        return {
          success: false,
          message: `Failed to execute sp_PressureDetector: ${String(error)}`,
        };
      }
    }
  }
}