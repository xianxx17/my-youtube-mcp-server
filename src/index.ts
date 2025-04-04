#!/usr/bin/env node
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

// New tools
server.tool(
  'get-video-stats',
  'Get statistical information for a specific YouTube video (views, likes, comments, upload date, etc.)',
  {
    videoId: z.string().min(1)
  },
  async ({ videoId }) => {
    try {
      const videoData = await youtubeService.getVideoDetails(videoId);
      const video = videoData.items?.[0];
      
      if (!video) {
        return {
          content: [{
            type: 'text',
            text: `Video with ID ${videoId} not found.`
          }],
          isError: true
        };
      }
      
      const stats = {
        videoId: video.id,
        title: video.snippet?.title,
        publishedAt: video.snippet?.publishedAt,
        channelTitle: video.snippet?.channelTitle,
        viewCount: video.statistics?.viewCount,
        likeCount: video.statistics?.likeCount,
        commentCount: video.statistics?.commentCount,
        duration: video.contentDetails?.duration
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(stats, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching video statistics: ${error}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  'get-channel-stats',
  'Get statistical information for a specific YouTube channel (subscriber count, total views, video count, etc.)',
  {
    channelId: z.string().min(1)
  },
  async ({ channelId }) => {
    try {
      const channelData = await youtubeService.getChannelDetails(channelId);
      const channel = channelData.items?.[0];
      
      if (!channel) {
        return {
          content: [{
            type: 'text',
            text: `Channel with ID ${channelId} not found.`
          }],
          isError: true
        };
      }
      
      const stats = {
        channelId: channel.id,
        title: channel.snippet?.title,
        createdAt: channel.snippet?.publishedAt,
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount,
        viewCount: channel.statistics?.viewCount,
        thumbnailUrl: channel.snippet?.thumbnails?.default?.url
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(stats, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching channel statistics: ${error}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  'compare-videos',
  'Compare statistics for multiple YouTube videos',
  {
    videoIds: z.array(z.string()).min(2).max(10)
  },
  async ({ videoIds }) => {
    try {
      const results = [];
      
      for (const videoId of videoIds) {
        const videoData = await youtubeService.getVideoDetails(videoId);
        const video = videoData.items?.[0];
        
        if (video) {
          results.push({
            videoId: video.id,
            title: video.snippet?.title,
            viewCount: Number(video.statistics?.viewCount || 0),
            likeCount: Number(video.statistics?.likeCount || 0),
            commentCount: Number(video.statistics?.commentCount || 0),
            publishedAt: video.snippet?.publishedAt
          });
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error comparing videos: ${error}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  'get-trending-videos',
  'Retrieve trending videos by region and category. This helps analyze current popular content trends.',
  {
    regionCode: z.string().length(2).optional(),
    categoryId: z.string().optional(),
    maxResults: z.number().min(1).max(50).optional()
  },
  async ({ regionCode = 'US', categoryId, maxResults = 10 }) => {
    try {
      const response = await youtubeService.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        chart: 'mostPopular',
        regionCode,
        videoCategoryId: categoryId,
        maxResults
      });
      
      const trendingVideos = response.data.items?.map(video => ({
        videoId: video.id,
        title: video.snippet?.title,
        channelTitle: video.snippet?.channelTitle,
        publishedAt: video.snippet?.publishedAt,
        viewCount: video.statistics?.viewCount,
        likeCount: video.statistics?.likeCount,
        commentCount: video.statistics?.commentCount
      }));
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(trendingVideos, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching trending videos: ${error}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  'get-video-categories',
  'Retrieve available video categories for a specific region',
  {
    regionCode: z.string().length(2).optional()
  },
  async ({ regionCode = 'US' }) => {
    try {
      const response = await youtubeService.youtube.videoCategories.list({
        part: ['snippet'],
        regionCode
      });
      
      const categories = response.data.items?.map(category => ({
        id: category.id,
        title: category.snippet?.title
      }));
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(categories, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching video categories: ${error}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  'analyze-channel-videos',
  'Analyze recent videos from a specific channel to identify performance trends',
  {
    channelId: z.string().min(1),
    maxResults: z.number().min(1).max(50).optional(),
    sortBy: z.enum(['date', 'viewCount', 'rating']).optional()
  },
  async ({ channelId, maxResults = 10, sortBy = 'date' }) => {
    try {
      // First get all videos from the channel
      const searchResponse = await youtubeService.youtube.search.list({
        part: ['snippet'],
        channelId,
        maxResults,
        order: sortBy,
        type: ['video']
      });
      
      // Extract videoIds and filter out any null or undefined values
      const videoIds: string[] = searchResponse.data.items
        ?.map(item => item.id?.videoId)
        .filter((id): id is string => id !== null && id !== undefined) || [];
      
      if (videoIds.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No videos found for channel ${channelId}`
          }]
        };
      }
      
      // Then get detailed stats for each video
      const videosResponse = await youtubeService.youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: videoIds
      });
      
      interface VideoAnalysisItem {
        videoId: string;
        title: string | null | undefined;
        publishedAt: string | null | undefined;
        duration: string | null | undefined;
        viewCount: number;
        likeCount: number;
        commentCount: number;
      }
      
      const videoAnalysis: VideoAnalysisItem[] = videosResponse.data.items?.map(video => ({
        videoId: video.id || '',
        title: video.snippet?.title,
        publishedAt: video.snippet?.publishedAt,
        duration: video.contentDetails?.duration,
        viewCount: Number(video.statistics?.viewCount || 0),
        likeCount: Number(video.statistics?.likeCount || 0),
        commentCount: Number(video.statistics?.commentCount || 0)
      })) || [];
      
      // Calculate averages
      if (videoAnalysis.length > 0) {
        const avgViews = videoAnalysis.reduce((sum: number, video: VideoAnalysisItem) => sum + video.viewCount, 0) / videoAnalysis.length;
        const avgLikes = videoAnalysis.reduce((sum: number, video: VideoAnalysisItem) => sum + video.likeCount, 0) / videoAnalysis.length;
        const avgComments = videoAnalysis.reduce((sum: number, video: VideoAnalysisItem) => sum + video.commentCount, 0) / videoAnalysis.length;
        
        const result = {
          channelId,
          videoCount: videoAnalysis.length,
          averages: {
            viewCount: avgViews,
            likeCount: avgLikes,
            commentCount: avgComments
          },
          videos: videoAnalysis
        };
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: `No video data available for analysis`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error analyzing channel videos: ${error}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  'enhanced-transcript',
  'Advanced transcript extraction tool with filtering, search, and multi-video capabilities. Provides raw transcript data for LLM analysis.',
  {
    videoIds: z.array(z.string()).min(1).max(5),
    filters: z.object({
      timeRange: z.object({
        start: z.number().min(0).optional(),
        end: z.number().min(0).optional()
      }).optional(),
      search: z.object({
        query: z.string().min(1),
        caseSensitive: z.boolean().optional(),
        contextLines: z.number().min(0).max(5).optional()
      }).optional(),
      segment: z.object({
        count: z.number().min(1).max(10).optional(),
        method: z.enum(['equal', 'smart']).optional()
      }).optional()
    }).optional(),
    language: z.string().optional(),
    format: z.enum(['raw', 'timestamped', 'merged']).optional(),
    includeMetadata: z.boolean().optional()
  },
  async ({ videoIds, filters, language, format = 'timestamped', includeMetadata = true }) => {
    try {
      const results = [];
      
      // Define types for transcript related data
      type Caption = {
        text: string;
        duration: number;
        offset: number;
        isMatch?: boolean;
      };
      
      interface SearchMatch {
        match: Caption;
        matchIndex: number;
        context: Caption[];
      }
      
      type Segment = {
        startTime: string;
        endTime: string;
        captions: Caption[];
      };
      
      type TranscriptResult = Caption[] | { segments: Segment[] };
      
      // Process each video
      for (const videoId of videoIds) {
        try {
          // Get video details
          const videoData = await youtubeService.getVideoDetails(videoId);
          const video = videoData.items?.[0];
          
          if (!video) {
            results.push({
              videoId,
              error: `Video not found or not accessible`
            });
            continue;
          }
          
          // Get transcript
          const transcriptData = await youtubeService.getTranscript(videoId, language);
          
          if (transcriptData.length === 0) {
            results.push({
              videoId,
              error: `No transcript available for this video${language ? ` in language: ${language}` : ''}`
            });
            continue;
          }
          
          // Apply filters if provided
          let filteredTranscript: TranscriptResult = [...transcriptData];
          
          // Time range filter
          if (filters?.timeRange) {
            const { start, end } = filters.timeRange;
            
            if (start !== undefined || end !== undefined) {
              filteredTranscript = (filteredTranscript as Caption[]).filter(caption => {
                const captionStart = caption.offset;
                const captionEnd = caption.offset + caption.duration;
                
                const afterStart = start !== undefined ? captionStart >= start * 1000 : true;
                const beforeEnd = end !== undefined ? captionEnd <= end * 1000 : true;
                
                return afterStart && beforeEnd;
              });
            }
          }
          
          // Search filter
          let searchResults = null;
          if (filters?.search?.query) {
            const query = filters.search.query;
            const caseSensitive = filters.search.caseSensitive || false;
            const contextLines = filters.search.contextLines || 2;
            
            // This approach avoids the type issues
            const captions = filteredTranscript as Caption[];
            const matchIndices: number[] = [];
            
            // First find all matching captions
            captions.forEach((caption, index) => {
              const text = caseSensitive ? caption.text : caption.text.toLowerCase();
              const searchQuery = caseSensitive ? query : query.toLowerCase();
              
              if (text.includes(searchQuery)) {
                matchIndices.push(index);
              }
            });
            
            if (matchIndices.length > 0) {
              // Build match objects with context
              const searchMatches: SearchMatch[] = matchIndices.map(matchIndex => {
                const match = captions[matchIndex];
                const contextStart = Math.max(0, matchIndex - contextLines);
                const contextEnd = Math.min(captions.length - 1, matchIndex + contextLines);
                
                const context = captions.slice(contextStart, contextEnd + 1).map(c => ({
                  ...c,
                  isMatch: c === match
                }));
                
                return { match, matchIndex, context };
              });
              
              searchResults = {
                query: filters.search.query,
                matchCount: searchMatches.length,
                matches: searchMatches
              };
              
              // Replace filteredTranscript with only matching segments and their context
              const matchSegments: Caption[] = [];
              for (const match of searchMatches) {
                matchSegments.push(...match.context);
              }
              
              // Remove duplicates by offset
              const uniqueSegments: Caption[] = [];
              const offsetSet = new Set<number>();
              
              for (const segment of matchSegments) {
                if (!offsetSet.has(segment.offset)) {
                  offsetSet.add(segment.offset);
                  uniqueSegments.push(segment);
                }
              }
              
              // Sort by time
              filteredTranscript = uniqueSegments.sort((a, b) => a.offset - b.offset);
            } else {
              filteredTranscript = []; // No matches found
            }
          }
          
          // Segment filter - divide transcript into equal parts
          if (filters?.segment && (filteredTranscript as Caption[]).length > 0) {
            const segmentCount = filters.segment.count || 5;
            const method = filters.segment.method || 'equal';
            
            if (method === 'equal') {
              // Equal time segments
              const captions = filteredTranscript as Caption[];
              const firstOffset = captions[0].offset;
              const lastOffset = captions[captions.length - 1].offset + 
                                 captions[captions.length - 1].duration;
              const totalDuration = lastOffset - firstOffset;
              const segmentDuration = totalDuration / segmentCount;
              
              const segments: Segment[] = [];
              for (let i = 0; i < segmentCount; i++) {
                const segmentStart = firstOffset + (i * segmentDuration);
                const segmentEnd = segmentStart + segmentDuration;
                
                const segmentCaptions = captions.filter(
                  caption => caption.offset >= segmentStart && caption.offset < segmentEnd
                );
                
                if (segmentCaptions.length > 0) {
                  segments.push({
                    startTime: formatTime(segmentStart),
                    endTime: formatTime(segmentEnd),
                    captions: segmentCaptions
                  });
                }
              }
              
              // If using segments, replace the transcript with segmented data
              if (segments.length > 0) {
                filteredTranscript = { segments };
              }
            } else if (method === 'smart') {
              // Smart segmentation (try to break at natural boundaries)
              // This is a simplified version that breaks at longer pauses
              const captions = filteredTranscript as Caption[];
              const segments: Segment[] = [];
              let currentSegment: Caption[] = [];
              let segmentCount = 0;
              
              // Find the average time gap between captions
              let totalGap = 0;
              let gapCount = 0;
              
              for (let i = 1; i < captions.length; i++) {
                const prevEnd = captions[i-1].offset + captions[i-1].duration;
                const currentStart = captions[i].offset;
                const gap = currentStart - prevEnd;
                
                if (gap > 0) {
                  totalGap += gap;
                  gapCount++;
                }
              }
              
              const avgGap = gapCount > 0 ? totalGap / gapCount : 0;
              // Use 3x average gap as a significant pause
              const significantPause = Math.max(avgGap * 3, 1000); // At least 1 second
              
              currentSegment = [captions[0]];
              
              for (let i = 1; i < captions.length; i++) {
                const prevEnd = captions[i-1].offset + captions[i-1].duration;
                const currentStart = captions[i].offset;
                const gap = currentStart - prevEnd;
                
                if (gap > significantPause && currentSegment.length > 0) {
                  // End of a segment
                  segments.push({
                    startTime: formatTime(currentSegment[0].offset),
                    endTime: formatTime(currentSegment[currentSegment.length-1].offset + 
                                       currentSegment[currentSegment.length-1].duration),
                    captions: [...currentSegment]
                  });
                  
                  currentSegment = [];
                  segmentCount++;
                  
                  // If we've reached the requested segment count, stop
                  if (segmentCount >= (filters.segment.count || 5)) {
                    break;
                  }
                }
                
                currentSegment.push(captions[i]);
              }
              
              // Add the last segment if it's not empty
              if (currentSegment.length > 0) {
                segments.push({
                  startTime: formatTime(currentSegment[0].offset),
                  endTime: formatTime(currentSegment[currentSegment.length-1].offset + 
                                     currentSegment[currentSegment.length-1].duration),
                  captions: [...currentSegment]
                });
              }
              
              // If using segments, replace the transcript with segmented data
              if (segments.length > 0) {
                filteredTranscript = { segments };
              }
            }
          }
          
          // Format the transcript based on the requested format
          let formattedTranscript;
          if (Array.isArray(filteredTranscript)) {
            switch (format) {
              case 'raw':
                formattedTranscript = filteredTranscript;
                break;
              case 'timestamped':
                formattedTranscript = filteredTranscript.map(caption => 
                  `[${formatTime(caption.offset)}] ${caption.text}`
                ).join('\n');
                break;
              case 'merged':
                formattedTranscript = filteredTranscript.map(caption => caption.text).join(' ');
                break;
            }
          } else {
            // Handle segmented transcript
            if (format === 'raw') {
              formattedTranscript = filteredTranscript;
            } else if (format === 'timestamped') {
              formattedTranscript = (filteredTranscript as { segments: Segment[] }).segments.map((segment: Segment) => {
                const header = `### Segment ${segment.startTime} - ${segment.endTime}\n\n`;
                const content = segment.captions.map((caption: Caption) => 
                  `[${formatTime(caption.offset)}] ${caption.text}`
                ).join('\n');
                return header + content;
              }).join('\n\n');
            } else { // merged
              formattedTranscript = (filteredTranscript as { segments: Segment[] }).segments.map((segment: Segment) => {
                const header = `### Segment ${segment.startTime} - ${segment.endTime}\n\n`;
                const content = segment.captions.map((caption: Caption) => caption.text).join(' ');
                return header + content;
              }).join('\n\n');
            }
          }
          
          // Build the result
          const result: any = {
            videoId,
            transcript: formattedTranscript
          };
          
          // Add search results if available
          if (searchResults) {
            result.search = searchResults;
          }
          
          // Add metadata if requested
          if (includeMetadata) {
            result.metadata = {
              title: video.snippet?.title,
              channelTitle: video.snippet?.channelTitle,
              publishedAt: video.snippet?.publishedAt,
              language: language || 'default',
              captionCount: transcriptData.length,
              filteredCaptionCount: Array.isArray(filteredTranscript) 
                ? filteredTranscript.length 
                : (filteredTranscript as { segments: Segment[] }).segments.reduce((count: number, segment: Segment) => 
                    count + segment.captions.length, 0)
            };
          }
          
          results.push(result);
        } catch (error) {
          results.push({
            videoId,
            error: `Error processing video: ${error}`
          });
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error processing enhanced transcript request: ${error}`
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