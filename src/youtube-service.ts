import { google, youtube_v3 } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  console.error('YOUTUBE_API_KEY is not defined in the environment variables');
  process.exit(1);
}

export class YouTubeService {
  private youtube: youtube_v3.Youtube;

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: YOUTUBE_API_KEY
    });
  }

  async searchVideos(query: string, maxResults: number = 10): Promise<youtube_v3.Schema$SearchListResponse> {
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        maxResults,
        type: ['video'],
      });
      return response.data;
    } catch (error) {
      console.error('Error searching videos:', error);
      throw error;
    }
  }

  async getVideoDetails(videoId: string): Promise<youtube_v3.Schema$VideoListResponse> {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [videoId]
      });
      return response.data;
    } catch (error) {
      console.error('Error getting video details:', error);
      throw error;
    }
  }

  async getChannelDetails(channelId: string): Promise<youtube_v3.Schema$ChannelListResponse> {
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [channelId]
      });
      return response.data;
    } catch (error) {
      console.error('Error getting channel details:', error);
      throw error;
    }
  }

  async getComments(videoId: string, maxResults: number = 20): Promise<youtube_v3.Schema$CommentThreadListResponse> {
    try {
      const response = await this.youtube.commentThreads.list({
        part: ['snippet'],
        videoId,
        maxResults
      });
      return response.data;
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }
} 