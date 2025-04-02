import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { YouTubeService } from './youtube-service.js';

// Load environment variables
dotenv.config();

// Initialize the YouTube service
const youtubeService = new YouTubeService();

// Create the MCP server
const server = new McpServer({
  name: 'YouTube MCP Server',
  version: '1.0.0'
});

// Define resources
server.resource(
  'video',
  new ResourceTemplate('youtube://video/{videoId}', { list: undefined }),
  {
    description: 'Get detailed information about a specific YouTube video by ID'
  },
  async (uri, { videoId }) => {
    try {
      // Ensure videoId is a string, not an array
      const videoIdStr = Array.isArray(videoId) ? videoId[0] : videoId;
      const videoData = await youtubeService.getVideoDetails(videoIdStr);
      const video = videoData.items?.[0];

      if (!video) {
        return {
          contents: [{
            uri: uri.href,
            text: `Video with ID ${videoIdStr} not found.`
          }]
        };
      }

      const details = {
        id: video.id,
        title: video.snippet?.title,
        description: video.snippet?.description,
        publishedAt: video.snippet?.publishedAt,
        channelId: video.snippet?.channelId,
        channelTitle: video.snippet?.channelTitle,
        viewCount: video.statistics?.viewCount,
        likeCount: video.statistics?.likeCount,
        commentCount: video.statistics?.commentCount,
        duration: video.contentDetails?.duration
      };

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(details, null, 2)
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: `Error fetching video details: ${error}`
        }]
      };
    }
  }
);

server.resource(
  'channel',
  new ResourceTemplate('youtube://channel/{channelId}', { list: undefined }),
  {
    description: 'Get information about a specific YouTube channel by ID'
  },
  async (uri, { channelId }) => {
    try {
      // Ensure channelId is a string, not an array
      const channelIdStr = Array.isArray(channelId) ? channelId[0] : channelId;
      const channelData = await youtubeService.getChannelDetails(channelIdStr);
      const channel = channelData.items?.[0];

      if (!channel) {
        return {
          contents: [{
            uri: uri.href,
            text: `Channel with ID ${channelIdStr} not found.`
          }]
        };
      }

      const details = {
        id: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        publishedAt: channel.snippet?.publishedAt,
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount,
        viewCount: channel.statistics?.viewCount
      };

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(details, null, 2)
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: `Error fetching channel details: ${error}`
        }]
      };
    }
  }
);

server.resource(
  'transcript',
  new ResourceTemplate('youtube://transcript/{videoId}', { list: undefined }),
  {
    description: 'Get the transcript/captions for a specific YouTube video with optional language parameter'
  },
  async (uri, { videoId }) => {
    try {
      // Parse parameters from the URL
      const url = new URL(uri.href);
      const language = url.searchParams.get('language');
      
      // Ensure videoId is a string, not an array
      const videoIdStr = Array.isArray(videoId) ? videoId[0] : videoId;
      
      // Get video details for metadata
      const videoData = await youtubeService.getVideoDetails(videoIdStr);
      const video = videoData.items?.[0];
      
      if (!video) {
        return {
          contents: [{
            uri: uri.href,
            text: `Video with ID ${videoIdStr} not found.`
          }]
        };
      }
      
      try {
        // Get transcript
        const transcriptData = await youtubeService.getTranscript(videoIdStr, language || undefined);
        
        // Format the transcript with timestamps
        const formattedTranscript = transcriptData.map(caption => 
          `[${formatTime(caption.offset)}] ${caption.text}`
        ).join('\n');
        
        // Create metadata
        const metadata = {
          videoId: video.id,
          title: video.snippet?.title,
          channelTitle: video.snippet?.channelTitle,
          language: language || 'default',
          captionCount: transcriptData.length
        };
        
        return {
          contents: [{
            uri: uri.href,
            text: `# Transcript for: ${metadata.title}\n\n${formattedTranscript}`
          }],
          metadata
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: `Transcript not available for video ID ${videoIdStr}. Error: ${error}`
          }]
        };
      }
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: `Error fetching transcript: ${error}`
        }]
      };
    }
  }
);

// Define tools
server.tool(
  'search-videos',
  'Search for YouTube videos with advanced filtering options. Supports parameters: \
- query: Search term (required) \
- maxResults: Number of results to return (1-50) \
- channelId: Filter by specific channel \
- order: Sort by date, rating, viewCount, relevance, title \
- type: Filter by resource type (video, channel, playlist) \
- videoDuration: Filter by length (short: <4min, medium: 4-20min, long: >20min) \
- publishedAfter/publishedBefore: Filter by publish date (ISO format) \
- videoCaption: Filter by caption availability \
- videoDefinition: Filter by quality (standard/high) \
- regionCode: Filter by country (ISO country code)',
  {
    query: z.string().min(1),
    maxResults: z.number().min(1).max(50).optional(),
    channelId: z.string().optional(),
    order: z.enum(['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount']).optional(),
    type: z.enum(['video', 'channel', 'playlist']).optional(),
    videoDuration: z.enum(['any', 'short', 'medium', 'long']).optional(),
    publishedAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/).optional(),
    publishedBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/).optional(),
    videoCaption: z.enum(['any', 'closedCaption', 'none']).optional(),
    videoDefinition: z.enum(['any', 'high', 'standard']).optional(),
    regionCode: z.string().length(2).optional()
  },
  async ({ query, maxResults = 10, channelId, order, type, videoDuration, publishedAfter, publishedBefore, videoCaption, videoDefinition, regionCode }) => {
    try {
      const searchResults = await youtubeService.searchVideos(query, maxResults, {
        channelId,
        order,
        type,
        videoDuration,
        publishedAfter,
        publishedBefore,
        videoCaption,
        videoDefinition,
        regionCode
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(searchResults, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error searching videos: ${error}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  'get-video-comments',
  'Retrieve comments for a specific YouTube video',
  {
    videoId: z.string().min(1),
    maxResults: z.number().min(1).max(100).optional()
  },
  async ({ videoId, maxResults = 20 }) => {
    try {
      const commentsData = await youtubeService.getComments(videoId, maxResults);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(commentsData, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching comments: ${error}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  'get-video-transcript',
  'Get the transcript/captions for a YouTube video with optional language selection',
  {
    videoId: z.string().min(1),
    language: z.string().optional()
  },
  async ({ videoId, language }) => {
    try {
      const transcriptData = await youtubeService.getTranscript(videoId, language);
      
      // Optionally format the transcript for better readability
      const formattedTranscript = transcriptData.map(caption => 
        `[${formatTime(caption.offset)}] ${caption.text}`
      ).join('\n');
      
      return {
        content: [{
          type: 'text',
          text: formattedTranscript
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching transcript: ${error}`
        }],
        isError: true
      };
    }
  }
);

// Helper function to format time in MM:SS format
function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Define prompts
server.prompt(
  'video-analysis',
  'Generate an analysis of a YouTube video based on its content and statistics',
  {
    videoId: z.string().min(1)
  },
  ({ videoId }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Please analyze this YouTube video (ID: ${videoId}). Include information about the video's content, key points, and audience reception.`
      }
    }]
  })
);

server.prompt(
  'transcript-summary',
  'Generate a summary of a YouTube video based on its transcript content',
  {
    videoId: z.string().min(1),
    language: z.string().optional()
  },
  async ({ videoId, language }) => {
    try {
      // Get video details and transcript
      const videoData = await youtubeService.getVideoDetails(videoId);
      const video = videoData.items?.[0];
      const transcriptData = await youtubeService.getTranscript(videoId, language);
      
      // Format transcript text
      const transcriptText = transcriptData.map(caption => caption.text).join(' ');
      
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Please provide a comprehensive summary of the following YouTube video transcript.
            
Video Title: ${video?.snippet?.title || 'Unknown'}
Channel: ${video?.snippet?.channelTitle || 'Unknown'}
Published: ${video?.snippet?.publishedAt || 'Unknown'}

Transcript:
${transcriptText}

Please provide:
1. A concise summary of the main topics and key points
2. Important details or facts presented
3. The overall tone and style of the content`
          }
        }]
      };
    } catch (error) {
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Error creating transcript summary prompt: ${error}`
          }
        }]
      };
    }
  }
);

// Connect using stdio transport
const transport = new StdioServerTransport();

// Start the server with stdio transport
console.error('Starting YouTube MCP Server with stdio transport...');
await server.connect(transport); 