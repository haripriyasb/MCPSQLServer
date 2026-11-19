# SQL Server MCP Server for DBAs

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that lets AI assistants, such as Claude Desktop and VS Code agent mode, work with SQL Server. You can ask questions in plain English ("Are any Agent jobs failing?", "What's causing waits right now?") and the assistant calls the right diagnostic tool.

This project builds on Microsoft's [MSSQL MCP server sample](https://github.com/Azure-Samples/SQL-AI-samples/tree/main/MssqlMcp) and on DBA tools from [oflindall/MSSQLMCP_DBA](https://github.com/oflindall/MSSQLMCP_DBA). I adapted it to use SQL login authentication through environment variables, so it works with on-premises and VM-hosted SQL Server, and combined the data tools and DBA health checks into one server.

## Tools

**Health and diagnostics**

| Tool | What it does |
|---|---|
| `check_connectivity` | Tests the connection and runs a basic metadata query |
| `database_status` | Finds databases that are offline, suspect, read-only, etc. |
| `backup_status` | Shows the latest full, differential and log backups |
| `agent_job_health` | Finds failing SQL Agent jobs |
| `availability_groups` | Shows availability group and replica sync status |
| `wait_stats` | Shows top wait types for the instance |
| `io_hotspots` | Finds the databases and files using the most I/O |
| `query_plan` | Pulls poor-performing plans from cache |
| `index_usage_stats` | Finds unused, missing and duplicate indexes |
| `statistics_update` | Finds out-of-date statistics and can update them |
| `check_db` | Runs `DBCC CHECKDB` on a database |
| `whoisactive` | Runs [sp_WhoIsActive](https://github.com/amachanic/sp_whoisactive) |
| `sp_blitz` | Runs [sp_Blitz](https://github.com/BrentOzarULTD/SQL-Server-First-Responder-Kit) health checks |
| `sp_pressure_detector` | Runs [sp_PressureDetector](https://github.com/erikdarlingdata/DarlingData) to find CPU and memory pressure |

**Data and schema**

`list_table`, `describe_table`, `read_data` (SELECT only), `insert_data`, `update_data` (requires a WHERE clause), `create_table`, `create_index`, `drop_table`

## Requirements

- Node.js 18 or later
- SQL Server with a SQL login
- To use `whoisactive`, `sp_blitz` and `sp_pressure_detector`, install those stored procedures on the target instance first

## Setup

1. Copy `src` into a Node/TypeScript project based on the [MSSQL MCP sample](https://github.com/Azure-Samples/SQL-AI-samples/tree/main/MssqlMcp/Node), install dependencies, and build:
   ```bash
   npm install
   npm run build
   ```
2. Add the server to your MCP client config. For Claude Desktop, edit `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "mssql": {
         "command": "node",
         "args": ["C:/path/to/dist/index.js"],
         "env": {
           "SERVER_NAME": "your-server",
           "DATABASE_NAME": "your-database",
           "MSSQL_USERNAME": "your-login",
           "MSSQL_PASSWORD": "your-password",
           "TRUST_SERVER_CERTIFICATE": "true",
           "READONLY": "true"
         }
       }
     }
   }
   ```
   A sample config for VS Code agent mode is in `src/samples/vscode_agent_config.json`.
3. Restart the client and ask a question such as "Check backup status on this server."

## Safety

- Use a login with the least privileges it needs, and set `READONLY` to `true` unless you need write tools.
- Don't commit real passwords. Keep credentials in your local client config only.
- Try it on a test instance before pointing it at anything important.
