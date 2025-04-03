# YouTube MCP Server

[![smithery badge](https://smithery.ai/badge/@coyaSONG/youtube-mcp-server)](https://smithery.ai/server/@coyaSONG/youtube-mcp-server)

A Model Context Protocol (MCP) server for interacting with YouTube data. This server provides resources and tools to query YouTube videos, channels, comments, and transcripts through a stdio interface.

## Features

- Search for YouTube videos with advanced filtering options
- Get detailed information about specific videos and channels
- Compare statistics across multiple videos
- Discover trending videos by region and category
- Analyze channel performance and video statistics
- Retrieve video comments and transcripts/captions
- Generate video analysis and transcript summaries

## Prerequisites

- Node.js (v16+)
- YouTube Data API key

## Installation

### Installing via Smithery

To install YouTube MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@coyaSONG/youtube-mcp-server):

```bash
npx -y @smithery/cli install @coyaSONG/youtube-mcp-server --client claude
```

### Installing Manually
1. Clone this repository:
   ```bash
   git clone https://github.com/coyaSONG/youtube-mcp-server.git
   cd youtube-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   YOUTUBE_API_KEY=your_youtube_api_key_here
   PORT=3000
   ```

## Usage

### Building and Running

1. Build the project:
   ```bash
   npm run build
   ```

2. Run the server:
   ```bash
   npm start
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. Clean build artifacts:
   ```bash
   npm run clean
   ```

## Docker Deployment

The project includes a Dockerfile for containerized deployment:

```bash
# Build the Docker image
docker build -t youtube-mcp-server .

# Run the container
docker run -p 3000:3000 --env-file .env youtube-mcp-server
```

## API Reference

### Resources

- `youtube://video/{videoId}` - Get detailed information about a specific video
- `youtube://channel/{channelId}` - Get information about a specific channel
- `youtube://transcript/{videoId}` - Get transcript for a specific video
  - Optional query parameter: `?language=LANGUAGE_CODE` (e.g., `en`, `ko`, `ja`)

### Tools

#### Basic Tools
- `search-videos` - Search for YouTube videos with advanced filtering options
- `get-video-comments` - Get comments for a specific video
- `get-video-transcript` - Get transcript for a specific video with optional language

#### Statistical Tools
- `get-video-stats` - Get statistical information for a specific video
- `get-channel-stats` - Get subscriber count, view count, and other channel statistics
- `compare-videos` - Compare statistics across multiple videos

#### Discovery Tools
- `get-trending-videos` - Retrieve trending videos by region and category
- `get-video-categories` - Get available video categories for a specific region

#### Analysis Tools
- `analyze-channel-videos` - Analyze performance trends of videos from a specific channel

### Prompts

- `video-analysis` - Generate an analysis of a YouTube video
- `transcript-summary` - Generate a summary of a video based on its transcript

## Examples

### Accessing a Video Transcript

```
youtube://transcript/dQw4w9WgXcQ
```

### Getting a Transcript in a Specific Language

```
youtube://transcript/dQw4w9WgXcQ?language=en
```

### Using the Statistical Tools

```javascript
// Get video statistics
{
  "type": "tool",
  "name": "get-video-stats",
  "parameters": {
    "videoId": "dQw4w9WgXcQ"
  }
}

// Compare multiple videos
{
  "type": "tool",
  "name": "compare-videos",
  "parameters": {
    "videoIds": ["dQw4w9WgXcQ", "9bZkp7q19f0"]
  }
}
```

### Using the Transcript Summary Prompt

```javascript
{
  "type": "prompt",
  "name": "transcript-summary",
  "parameters": {
    "videoId": "dQw4w9WgXcQ",
    "language": "en"
  }
}
```

## Error Handling

The server handles various error conditions, including:

- Invalid API key
- Video or channel not found
- Transcript not available
- Network issues

## License

MIT

## Acknowledgements

- [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [YouTube Captions Scraper](https://github.com/algolia/youtube-captions-scraper) 