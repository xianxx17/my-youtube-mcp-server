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

// Define tools
server.tool(
  'search-videos',
  {
    query: z.string().min(1),
    maxResults: z.number().min(1).max(50).optional()
  },
  async ({ query, maxResults = 10 }) => {
    try {
      const searchResults = await youtubeService.searchVideos(query, maxResults);
      
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

// Define prompts
server.prompt(
  'video-analysis',
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

// Connect using stdio transport
const transport = new StdioServerTransport();

// Start the server with stdio transport
console.log('Starting YouTube MCP Server with stdio transport...');
await server.connect(transport); 