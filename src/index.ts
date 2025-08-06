#!/usr/bin/env node

// External imports
// Removed dotenv import and dotenv.config()
import sql from "mssql";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Internal imports - Explicitly adding .js extensions for Node.js ESM compatibility
import { UpdateDataTool } from "./tools/UpdateDataTool.js";
import { InsertDataTool } from "./tools/InsertDataTool.js";
import { ReadDataTool } from "./tools/ReadDataTool.js";
import { CreateTableTool } from "./tools/CreateTableTool.js";
import { CreateIndexTool } from "./tools/CreateIndexTool.js";
import { ListTableTool } from "./tools/ListTableTool.js";
import { DropTableTool } from "./tools/DropTableTool.js";
// Removed DefaultAzureCredential and InteractiveBrowserCredential imports
import { DescribeTableTool } from "./tools/DescribeTableTool.js";
import { CheckDBTool } from "./tools/CheckDBTool.js";
import { sp_WhoisActiveTool } from "./tools/sp_WhoisactiveTool.js";
import { sp_BlitzTool } from "./tools/sp_BlitzTool.js";
import { sp_PressureDetectorTool } from "./tools/sp_PressureDetectorTool.js";
import { AgentJobHealthTool } from "./tools/AgentJobHealthTool.js";
import { AvailabilityGroupsTool } from "./tools/AvailabilityGroupsTool.js";
import { BackupStatusTool } from "./tools/BackupStatusTool.js";
import { CheckConnectivityTool } from "./tools/CheckConnectivityTool.js";
import { DatabaseStatusTool } from "./tools/DatabaseStatusTool.js";
import { IOHotspotsTool } from "./tools/IOHotspotsTool.js";
import { IndexUsageStatsTool } from "./tools/IndexUsageStatsTool.js";
import { QueryPlanTool } from "./tools/QueryPlanTool.js";
import { StatisticsUpdateTool } from "./tools/StatisticsUpdateTool.js";
import { WaitStatsTool } from "./tools/WaitStatsTool.js";


// Globals for connection reuse (no token-related globals for SQL User/Password)
let globalSqlPool: sql.ConnectionPool | null = null;

/**
 * Creates a SQL configuration object using environment variables for SQL User/Password authentication.
 * These variables are expected to be passed directly by the calling process (e.g., Claude desktop config).
 * @returns A sql.config object for mssql connection.
 */
export async function createSqlConfig(): Promise<sql.config> {
    // These values are now directly from the environment variables set by Claude's config file
    const serverName = process.env.SERVER_NAME || "";
    const databaseName = process.env.DATABASE_NAME || "";
    const userName = process.env.MSSQL_USERNAME || ""; // Using MSSQL_USERNAME as per your config
    const password = process.env.MSSQL_PASSWORD || ""; // Using MSSQL_PASSWORD as per your config

    // Default connection options (adjust as per your SQL Server setup)
    const encrypt = process.env.ENCRYPT_SQL_CONNECTION?.toLowerCase() === 'true' || false;
    const trustServerCertificate = process.env.TRUST_SERVER_CERTIFICATE?.toLowerCase() === 'true' || false;
    const connectionTimeout = process.env.CONNECTION_TIMEOUT ? parseInt(process.env.CONNECTION_TIMEOUT, 10) : 30; // in seconds

    const config: sql.config = {
        server: serverName,
        database: databaseName,
        user: userName,
        password: password,
        options: {
            encrypt: encrypt,
            trustServerCertificate: trustServerCertificate,
            enableArithAbort: true, // Recommended for some SQL Server operations
        },
        connectionTimeout: connectionTimeout * 1000, // Convert to milliseconds
    };

    // Validate essential configuration before attempting to connect
    if (!config.server || !config.database || !config.user || !config.password) {
        throw new Error("Missing required connection details from environment variables (SERVER_NAME, DATABASE_NAME, MSSQL_USERNAME, MSSQL_PASSWORD). Please check your Claude desktop config file.");
    }

    return config;
}

// Initialize all tool instances
const updateDataTool = new UpdateDataTool();
const insertDataTool = new InsertDataTool();
const readDataTool = new ReadDataTool();
const createTableTool = new CreateTableTool();
const createIndexTool = new CreateIndexTool();
const listTableTool = new ListTableTool();
const dropTableTool = new DropTableTool();
const describeTableTool = new DescribeTableTool();
const checkDBTool = new CheckDBTool();
const sp_whoisactiveTool = new sp_WhoisActiveTool();
const sp_blitzTool = new sp_BlitzTool();
const sp_pressureDetectorTool = new sp_PressureDetectorTool();
const agentJobHealthTool = new AgentJobHealthTool();
const availabilityGroupsTool = new AvailabilityGroupsTool();
const backupStatusTool = new BackupStatusTool();
const checkConnectivityTool = new CheckConnectivityTool();
const databaseStatusTool = new DatabaseStatusTool();
const ioHotspotsTool = new IOHotspotsTool();
const indexUsageStatsTool = new IndexUsageStatsTool();
const queryPlanTool = new QueryPlanTool();
const statisticsUpdateTool = new StatisticsUpdateTool();
const waitStatsTool = new WaitStatsTool();

const server = new Server(
    {
        name: "mssql-mcp-server",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {}, // No specific capabilities declared for tools here; they are inferred from ListToolsRequestSchema
        },
    },
);

// Read READONLY env variable
const isReadOnly = process.env.READONLY === "true";

// Request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: isReadOnly
        ? [
            // Read-only tools for monitoring and analysis
            listTableTool,
            readDataTool,
            describeTableTool,
            checkDBTool,
            sp_whoisactiveTool,
            sp_blitzTool,
            sp_pressureDetectorTool,
            agentJobHealthTool,
            availabilityGroupsTool,
            backupStatusTool,
            checkConnectivityTool,
            databaseStatusTool,
            ioHotspotsTool,
            indexUsageStatsTool,
            queryPlanTool,
            waitStatsTool,
        ]
        : [
            // All tools including write operations
            insertDataTool,
            readDataTool,
            describeTableTool,
            updateDataTool,
            createTableTool,
            createIndexTool,
            dropTableTool,
            listTableTool,
            checkDBTool,
            sp_whoisactiveTool,
            sp_blitzTool,
            sp_pressureDetectorTool,
            agentJobHealthTool,
            availabilityGroupsTool,
            backupStatusTool,
            checkConnectivityTool,
            databaseStatusTool,
            ioHotspotsTool,
            indexUsageStatsTool,
            queryPlanTool,
            statisticsUpdateTool,
            waitStatsTool,
        ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        let result;
        switch (name) {
            case insertDataTool.name:
                result = await insertDataTool.run(args);
                break;
            case readDataTool.name:
                result = await readDataTool.run(args);
                break;
            case updateDataTool.name:
                result = await updateDataTool.run(args);
                break;
            case createTableTool.name:
                result = await createTableTool.run(args);
                break;
            case createIndexTool.name:
                result = await createIndexTool.run(args);
                break;
            case listTableTool.name:
                result = await listTableTool.run(args);
                break;
            case dropTableTool.name:
                result = await dropTableTool.run(args);
                break;
            case describeTableTool.name:
                if (!args || typeof args.tableName !== "string") {
                    return {
                        content: [{ type: "text", text: `Missing or invalid 'tableName' argument for describe_table tool.` }],
                        isError: true,
                    };
                }
                result = await describeTableTool.run(args as { tableName: string });
                break;
            case checkDBTool.name:
                result = await checkDBTool.run(args);
                break;
            case sp_whoisactiveTool.name:
                result = await sp_whoisactiveTool.run(args);
                break;
            case sp_blitzTool.name:
                result = await sp_blitzTool.run(args);
                break;
            case sp_pressureDetectorTool.name:
                result = await sp_pressureDetectorTool.run(args);
                break;
            case agentJobHealthTool.name:
                result = await agentJobHealthTool.run(args);
                break;
            case availabilityGroupsTool.name:
                result = await availabilityGroupsTool.run(args);
                break;
            case backupStatusTool.name:
                result = await backupStatusTool.run(args);
                break;
            case checkConnectivityTool.name:
                result = await checkConnectivityTool.run(args);
                break;
            case databaseStatusTool.name:
                result = await databaseStatusTool.run(args);
                break;
            case ioHotspotsTool.name:
                result = await ioHotspotsTool.run(args);
                break;
            case indexUsageStatsTool.name:
                result = await indexUsageStatsTool.run(args);
                break;
            case queryPlanTool.name:
                result = await queryPlanTool.run(args);
                break;
            case statisticsUpdateTool.name:
                result = await statisticsUpdateTool.run(args);
                break;
            case waitStatsTool.name:
                result = await waitStatsTool.run(args);
                break;
            default:
                return {
                    content: [{ type: "text", text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    } catch (error) {
        return {
            content: [{ type: "text", text: `Error occurred: ${error}` }],
            isError: true,
        };
    }
});

// Server startup
async function runServer() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
    } catch (error) {
        console.error("Fatal error running server:", error);
        process.exit(1);
    }
}

runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});

/**
 * Ensures a single, re-used SQL ConnectionPool exists and is connected.
 * If the pool is not connected or doesn't exist, it creates a new one.
 * Uses SQL User/Password authentication based on environment variables.
 * @param serverName This parameter is no longer used, as connection details come from Claude's env config.
 */
async function ensureSqlConnection(serverName?: string) {
    // If we have a pool and it's connected, reuse it
    if (globalSqlPool && globalSqlPool.connected) {
        return;
    }

    // Close old pool if exists but is not connected
    if (globalSqlPool) {
        try {
            await globalSqlPool.close();
            globalSqlPool = null; // Clear the old pool reference
        } catch (e) {
            console.warn("Failed to close old pool:", e);
        }
    }

    // Get a new config and reconnect using the environment variables
    const config = await createSqlConfig(); // No arguments needed here anymore
    globalSqlPool = await sql.connect(config);
}

// Patch all tool handlers to ensure SQL connection before running
function wrapToolRun(tool: any) {
    const originalRun = tool.run.bind(tool);
    tool.run = async function (args: any) {
        // serverName is no longer taken from args, as it's provided via Claude's config directly
        await ensureSqlConnection(); // Call without arguments
        return originalRun(args);
    };
}

// Apply connection wrapper to all tools
[
    insertDataTool,
    readDataTool,
    updateDataTool,
    createTableTool,
    createIndexTool,
    dropTableTool,
    listTableTool,
    describeTableTool,
    checkDBTool,
    sp_whoisactiveTool,
    sp_blitzTool,
    sp_pressureDetectorTool,
    agentJobHealthTool,
    availabilityGroupsTool,
    backupStatusTool,
    checkConnectivityTool,
    databaseStatusTool,
    ioHotspotsTool,
    indexUsageStatsTool,
    queryPlanTool,
    statisticsUpdateTool,
    waitStatsTool
].forEach(wrapToolRun);