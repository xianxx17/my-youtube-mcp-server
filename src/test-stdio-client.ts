import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Starting stdio test client...');
  
  // Path to the server script
  const serverPath = path.join(__dirname, '..', 'dist', 'index.js');
  
  // Create a stdio transport connected to our server process
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath]
  });
  
  // Create the MCP client
  const client = new Client(
    {
      name: 'stdio-test-client',
      version: '1.0.0'
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {}
      }
    }
  );

  try {
    // Connect to the server
    await client.connect(transport);
    console.log('Connected to YouTube MCP server');
    
    // Test video ID (Rick Astley - Never Gonna Give You Up)
    const videoId = 'dQw4w9WgXcQ';
    
    // List available resources
    console.log('\nListing resources:');
    const resources = await client.listResources();
    console.log(JSON.stringify(resources, null, 2));
    
    // Read a video resource
    console.log(`\nFetching video details for ${videoId}:`);
    const videoResource = { uri: `youtube://video/${videoId}` };
    const video = await client.readResource(videoResource);
    console.log(JSON.stringify(video, null, 2));
    
    // List available tools
    console.log('\nListing tools:');
    const tools = await client.listTools();
    console.log(JSON.stringify(tools, null, 2));
    
    // Call a tool to search for videos
    console.log('\nSearching for videos:');
    const toolRequest = {
      name: 'search-videos',
      arguments: {
        query: 'cute cats',
        maxResults: 3
      }
    };
    const searchResult = await client.callTool(toolRequest);
    console.log(JSON.stringify(searchResult, null, 2));
    
    // List available prompts
    console.log('\nListing prompts:');
    const prompts = await client.listPrompts();
    console.log(JSON.stringify(prompts, null, 2));
    
    // Get a prompt
    console.log('\nGetting video analysis prompt:');
    const promptRequest = {
      name: 'video-analysis',
      arguments: { videoId }
    };
    const prompt = await client.getPrompt(promptRequest);
    console.log(JSON.stringify(prompt, null, 2));
    
    console.log('\nTests completed successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the client (no need to explicitly disconnect)
    process.exit(0);
  }
}

main().catch(console.error); 