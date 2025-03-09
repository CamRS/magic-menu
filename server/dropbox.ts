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
  private zapierWebhookUrl: string;

  constructor() {
    logger.info('Initializing DropboxService...');
    this.accessToken = process.env.VITE_DROPBOX_ACCESS_TOKEN || '';
    this.zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL || '';

    if (!this.accessToken) {
      logger.error('No Dropbox access token found in environment variables');
      throw new Error('Missing Dropbox access token');
    }

    if (!this.zapierWebhookUrl) {
      logger.warn('No Zapier webhook URL found in environment variables');
    }

    this.dbx = new Dropbox({ accessToken: this.accessToken });
    logger.info('DropboxService initialized', { 
      tokenLength: this.accessToken.length,
      hasWebhook: Boolean(this.zapierWebhookUrl)
    });
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

    try {
      const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString('base64')}`,
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

  private async getSharedLink(path: string): Promise<string> {
    try {
      const response = await this.dbx.sharingCreateSharedLink({
        path,
        settings: {
          requested_visibility: { '.tag': 'public' },
          audience: { '.tag': 'public' },
          access: { '.tag': 'viewer' }
        }
      });

      // Convert the shared link to a direct download link
      let downloadUrl = response.result.url;
      // Replace 'www.dropbox' with 'dl.dropboxusercontent' to get direct download link
      downloadUrl = downloadUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
      // Remove ?dl=0 and append ?dl=1 to force download
      downloadUrl = downloadUrl.replace('?dl=0', '?dl=1');

      return downloadUrl;
    } catch (error: any) {
      if (error?.status === 401) {
        await this.refreshToken();
        const response = await this.dbx.sharingCreateSharedLink({
          path,
          settings: {
            requested_visibility: { '.tag': 'public' },
            audience: { '.tag': 'public' },
            access: { '.tag': 'viewer' }
          }
        });
        let downloadUrl = response.result.url;
        downloadUrl = downloadUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
        downloadUrl = downloadUrl.replace('?dl=0', '?dl=1');
        return downloadUrl;
      }
      throw error;
    }
  }

  private async notifyZapier(fileUrl: string): Promise<void> {
    if (!this.zapierWebhookUrl) {
      logger.warn('Skipping Zapier notification - no webhook URL configured');
      return;
    }

    try {
      logger.info('Sending notification to Zapier webhook', { fileUrl });
      const response = await fetch(this.zapierWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          download_url: fileUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Zapier webhook failed with status ${response.status}`);
      }

      logger.info('Successfully notified Zapier webhook');
    } catch (error) {
      logger.error('Failed to notify Zapier webhook', error);
      // Don't throw the error - we don't want to fail the upload if webhook fails
    }
  }

  async uploadImage(imageData: string, fileName: string, isConsumerUpload: boolean = false, userId?: string): Promise<string> {
    try {
      logger.info('Starting Dropbox upload process', { fileName, userId });

      // Remove data URL prefix if present
      const buffer = Buffer.from(
        imageData.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      );

      // Modify filename to include userId if present
      let modifiedFileName = fileName;
      if (isConsumerUpload && userId) {
        // Extract extension
        const extension = fileName.substring(fileName.lastIndexOf('.'));
        const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
        modifiedFileName = `user_${userId}_${baseName}${extension}`;
      }

      const path = isConsumerUpload 
        ? `/translate - magic menu/${modifiedFileName}`
        : `/Magic Menu/${fileName}`;

      logger.info('Uploading to Dropbox path', { path });

      try {
        logger.debug('Attempting file upload...');
        const response = await this.dbx.filesUpload({
          path,
          contents: buffer,
        });
        logger.info('Upload successful', response.result);

        // Get the shared link for the file
        const downloadUrl = await this.getSharedLink(response.result.path_display || path);
        logger.info('Successfully generated shared link', { downloadUrl });

        // Notify Zapier about the upload
        await this.notifyZapier(downloadUrl);

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

          // Get the shared link after retry
          const downloadUrl = await this.getSharedLink(response.result.path_display || path);
          logger.info('Successfully generated shared link after retry', { downloadUrl });

          // Notify Zapier about the upload after retry
          await this.notifyZapier(downloadUrl);

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

// Create and export a singleton instance
export const dropboxService = new DropboxService();