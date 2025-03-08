import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';
import { logger } from './logger';

interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class DropboxService {
  private dbx: Dropbox;
  private accessToken: string;

  constructor() {
    logger.info('Initializing DropboxService...');
    this.accessToken = process.env.VITE_DROPBOX_ACCESS_TOKEN || '';
    if (!this.accessToken) {
      logger.error('No Dropbox access token found in environment variables');
      throw new Error('Missing Dropbox access token');
    }
    this.dbx = new Dropbox({ accessToken: this.accessToken });
    logger.info('DropboxService initialized', { tokenLength: this.accessToken.length });
  }

  private async refreshToken(): Promise<string> {
    const appKey = process.env.VITE_DROPBOX_APP_KEY;
    const appSecret = process.env.VITE_DROPBOX_APP_SECRET;
    const refreshToken = process.env.VITE_DROPBOX_REFRESH_TOKEN;

    logger.info('Attempting to refresh Dropbox token');

    if (!appKey || !appSecret || !refreshToken) {
      const error = new Error('Missing required environment variables for token refresh');
      logger.error('Token refresh failed', error);
      throw error;
    }

    const auth = Buffer.from(`${appKey}:${appSecret}`).toString('base64');

    try {
      const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
      });

      logger.info('Token refresh response received', { status: response.status });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Token refresh failed', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as RefreshTokenResponse;
      logger.info('Token refreshed successfully');

      this.accessToken = data.access_token;
      this.dbx = new Dropbox({ accessToken: this.accessToken });

      return this.accessToken;
    } catch (error) {
      logger.error('Error during token refresh', error);
      throw error;
    }
  }

  async uploadImage(imageData: string, fileName: string): Promise<string> {
    try {
      logger.info('Starting Dropbox upload process', { fileName });

      // Remove data URL prefix if present
      const buffer = Buffer.from(
        imageData.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      );

      const path = `/Magic Menu/${fileName}`;
      logger.info('Uploading to Dropbox path', { path });

      try {
        logger.debug('Attempting file upload...');
        const response = await this.dbx.filesUpload({
          path,
          contents: buffer,
        });
        logger.info('Upload successful', response.result);

        // Return the path of the uploaded file
        return response.result.path_display || path;

      } catch (error: any) {
        logger.error('Dropbox API error', {
          status: error?.status,
          error: error?.error,
          message: error?.message,
          stack: error?.stack
        });

        if (error?.status === 401) {
          logger.info('Token expired, attempting refresh...');
          await this.refreshToken();

          logger.info('Retrying upload after token refresh...');
          const response = await this.dbx.filesUpload({
            path,
            contents: buffer,
          });
          logger.info('Retry upload successful', response.result);

          return response.result.path_display || path;
        }
        throw error;
      }
    } catch (error) {
      logger.error('Error in uploadImage', error);
      throw error;
    }
  }
}

export const dropboxService = new DropboxService();