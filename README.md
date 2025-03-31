# YouTube MCP Server

A Model Context Protocol (MCP) server for interacting with YouTube data. This server provides resources and tools to query YouTube videos, channels, and comments through stdio interface.

## Features

- Search for YouTube videos
- Get detailed information about specific videos
- Retrieve channel information
- Fetch video comments
- Uses stdio for communication with clients

## Prerequisites

- Node.js (v16+)
- YouTube Data API key

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/youtube-mcp-server.git
   cd youtube-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   YOUTUBE_API_KEY=your_youtube_api_key_here
   ```

## Usage

### Building and Running

1. 빌드하기:
   ```bash
   npm run build
   ```

2. 서버 실행:
   ```bash
   npm start
   ```

3. 테스트 클라이언트 실행:
   ```bash
   npm run test:stdio
   ```

## API

### Resources

- `youtube://video/{videoId}` - Get detailed information about a specific video
- `youtube://channel/{channelId}` - Get information about a specific channel

### Tools

- `search-videos` - Search for YouTube videos based on a query
- `get-video-comments` - Get comments for a specific video

### Prompts

- `video-analysis` - Prompt for analyzing a YouTube video

## License

MIT

## Acknowledgements

- [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [YouTube Data API](https://developers.google.com/youtube/v3) 