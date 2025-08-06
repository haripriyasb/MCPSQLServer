import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class sp_BlitzTool implements Tool {
  [key: string]: any;
  name = "sp_blitz";
  description = "Executes sp_Blitz to perform SQL Server health checks and identify potential performance issues";

  inputSchema = {
    type: "object",
    properties: {
      CheckUserDatabaseObjects: {
        type: "boolean",
        description: "Check user database objects for common issues (default: true)"
      },
      CheckProcedureCache: {
        type: "boolean", 
        description: "Check procedure cache for performance issues (default: true)"
      },
      OutputType: {
        type: "string",
        description: "Output format for results",
        enum: ["TABLE", "COUNT", "MARKDOWN", "XML"]
      },
      OutputServerName: {
        type: "string",
        description: "Server name to include in output"
      },
      CheckServerInfo: {
        type: "boolean",
        description: "Include server configuration information (default: true)"
      },
      CheckVersionStore: {
        type: "boolean",
        description: "Check version store for issues (default: true)"
      },
      IgnorePrioritiesBelow: {
        type: "integer",
        description: "Ignore findings with priority below this number (1-255)"
      },
      IgnorePrioritiesAbove: {
        type: "integer", 
        description: "Ignore findings with priority above this number (1-255)"
      },
      BringThePain: {
        type: "boolean",
        description: "Run more intensive checks that may impact performance (default: false)"
      },
      OutputDatabaseName: {
        type: "string",
        description: "Database name for output table (if saving results)"
      },
      OutputSchemaName: {
        type: "string",
        description: "Schema name for output table (if saving results)"
      },
      OutputTableName: {
        type: "string",
        description: "Table name for saving results"
      },
      ConfigurationDatabaseName: {
        type: "string",
        description: "Database containing sp_Blitz configuration"
      },
      ConfigurationSchemaName: {
        type: "string",
        description: "Schema containing sp_Blitz configuration"
      },
      ConfigurationTableName: {
        type: "string",
        description: "Table containing sp_Blitz configuration"
      },
      Help: {
        type: "boolean",
        description: "Show help information for sp_Blitz (default: false)"
      },
      Debug: {
        type: "boolean",
        description: "Enable debug mode for troubleshooting (default: false)"
      },
      SummaryMode: {
        type: "boolean",
        description: "Show only summary of findings (default: false)"
      },
      SkipChecksServer: {
        type: "string",
        description: "Server name pattern to skip during checks"
      },
      SkipChecksDatabase: {
        type: "string",
        description: "Database name pattern to skip during checks"
      },
      SkipChecksSchema: {
        type: "string", 
        description: "Schema name pattern to skip during checks"
      },
      SkipChecksTable: {
        type: "string",
        description: "Table name pattern to skip during checks"
      }
    },
    required: []
  } as any;

  async run(params: any) {
    const {
      CheckUserDatabaseObjects = true,
      CheckProcedureCache = true,
      OutputType = "TABLE",
      OutputServerName,
      CheckServerInfo = true,
      CheckVersionStore = true,
      IgnorePrioritiesBelow,
      IgnorePrioritiesAbove,
      BringThePain = false,
      OutputDatabaseName,
      OutputSchemaName,
      OutputTableName,
      ConfigurationDatabaseName,
      ConfigurationSchemaName,
      ConfigurationTableName,
      HelpMe = false,
      Debug = false,
      SummaryMode = false,
      SkipChecksServer,
      SkipChecksDatabase,
      SkipChecksSchema,
      SkipChecksTable
    } = params;

    try {
      const request = new sql.Request();
      
      // Build the sp_Blitz command with parameters
      let query = "EXEC sp_Blitz";
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

      addParam("CheckUserDatabaseObjects", CheckUserDatabaseObjects);
      addParam("CheckProcedureCache", CheckProcedureCache);
      addParam("OutputType", OutputType, true);
      addParam("OutputServerName", OutputServerName, true);
      addParam("CheckServerInfo", CheckServerInfo);
      addParam("CheckVersionStore", CheckVersionStore);
      addParam("IgnorePrioritiesBelow", IgnorePrioritiesBelow);
      addParam("IgnorePrioritiesAbove", IgnorePrioritiesAbove);
      addParam("BringThePain", BringThePain);
      addParam("OutputDatabaseName", OutputDatabaseName, true);
      addParam("OutputSchemaName", OutputSchemaName, true);
      addParam("OutputTableName", OutputTableName, true);
      addParam("ConfigurationDatabaseName", ConfigurationDatabaseName, true);
      addParam("ConfigurationSchemaName", ConfigurationSchemaName, true);
      addParam("ConfigurationTableName", ConfigurationTableName, true);
      addParam("HelpMe", HelpMe);
      addParam("Debug", Debug);
      addParam("SummaryMode", SummaryMode);
      addParam("SkipChecksServer", SkipChecksServer, true);
      addParam("SkipChecksDatabase", SkipChecksDatabase, true);
      addParam("SkipChecksSchema", SkipChecksSchema, true);
      addParam("SkipChecksTable", SkipChecksTable, true);

      // Add parameters to query if any exist
      if (queryParams.length > 0) {
        query += " " + queryParams.join(", ");
      }

      const result = await request.query(query);

      const findings = result.recordset || [];
      const totalFindings = findings.length;
      const criticalFindings = findings.filter((f: any) => f.Priority <= 50).length;
      const warningFindings = findings.filter((f: any) => f.Priority > 50 && f.Priority <= 100).length;
      const infoFindings = findings.filter((f: any) => f.Priority > 100).length;

      // Group findings by CheckID for better organization
      const findingsByCheck: { [key: string]: any } = {};
      findings.forEach((finding: any) => {
        const checkId = finding.CheckID;
        if (!findingsByCheck[checkId]) {
          findingsByCheck[checkId] = {
            CheckID: checkId,
            FindingsGroup: finding.FindingsGroup,
            Finding: finding.Finding,
            Priority: finding.Priority,
            count: 0,
            details: []
          };
        }
        findingsByCheck[checkId].count++;
        findingsByCheck[checkId].details.push(finding);
      });

      const errorsFound = criticalFindings > 0 || warningFindings > 0;

      return {
        success: true,
        message: `sp_Blitz executed successfully. Found ${totalFindings} finding(s)` +
          (criticalFindings ? ` (${criticalFindings} critical, ${warningFindings} warnings, ${infoFindings} informational)` : ""),
        errorsFound,
        details: {
          totalFindings,
          criticalFindings,
          warningFindings,
          infoFindings,
          findingsByCheck: Object.values(findingsByCheck),
          allFindings: findings
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          message: `Failed to execute sp_Blitz: ${error.message}`,
        };
      } else {
        return {
          success: false,
          message: `Failed to execute sp_Blitz: ${String(error)}`,
        };
      }
    }
  }
}