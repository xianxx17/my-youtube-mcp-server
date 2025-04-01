# YouTube MCP Server

A Model Context Protocol (MCP) server for interacting with YouTube data. This server provides resources and tools to query YouTube videos, channels, comments, and transcripts through stdio interface.

## Features

- Search for YouTube videos
- Get detailed information about specific videos
- Retrieve channel information
- Fetch video comments
- **Get video transcripts/captions**
- Uses stdio for communication with clients

## Prerequisites

- Node.js (v16+)
- YouTube Data API key

## Installation

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

3. 개발 모드로 실행:
   ```bash
   npm run dev
   ```

4. 빌드 산출물 정리:
   ```bash
   npm run clean
   ```

## API

### Resources

- `youtube://video/{videoId}` - Get detailed information about a specific video
- `youtube://channel/{channelId}` - Get information about a specific channel
- `youtube://transcript/{videoId}` - Get transcript for a specific video
  - Optional query parameter: `?language=LANGUAGE_CODE` (e.g., `en`, `ko`, `ja`)

### Tools

- `search-videos` - Search for YouTube videos based on a query
- `get-video-comments` - Get comments for a specific video
- `get-video-transcript` - Get transcript for a specific video with optional language parameter

### Prompts

- `video-analysis` - Prompt for analyzing a YouTube video
- `transcript-summary` - Prompt for summarizing a video's transcript

## Examples

### Accessing a video transcript

```
youtube://transcript/dQw4w9WgXcQ
```

### Getting a transcript in a specific language

```
youtube://transcript/dQw4w9WgXcQ?language=en
```

### Using the transcript summary prompt

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
- Video not found
- Transcript not available
- Network issues

## License

MIT

## Acknowledgements

- [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [YouTube Captions Scraper](https://github.com/algolia/youtube-captions-scraper) 