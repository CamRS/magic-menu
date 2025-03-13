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
  private zapierConsumerWebookUrl: string;

  constructor() {
    logger.info('Initializing DropboxService...');
    this.accessToken = process.env.VITE_DROPBOX_ACCESS_TOKEN || '';
    this.zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL || '';
    this.zapierConsumerWebookUrl = process.env.ZAPIER_CONSUMER_WEBHOOK_URL || '';

    if (!this.accessToken) {
      logger.error('No Dropbox access token found in environment variables');
      throw new Error('Missing Dropbox access token');
    }

    if (!this.zapierWebhookUrl) {
      logger.info('No Zapier webhook URL found in environment variables');
    }

    this.dbx = new Dropbox({ accessToken: this.accessToken });
    logger.info('DropboxService initialized', { 
      tokenLength: this.accessToken.length,
      hasWebhook: Boolean(this.zapierWebhookUrl),
      hasConsumerWebhook: Boolean(this.zapierConsumerWebookUrl)
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

  private async getSharedLink(path: string, retryCount = 0): Promise<string> {
    const MAX_RETRIES = 1; // Only retry once after token refresh

    try {
      // Simplest form, no extra settings
      const response = await this.dbx.sharingCreateSharedLink({
        path
      });

      let downloadUrl = response.result.url;
      downloadUrl = downloadUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
      downloadUrl = downloadUrl.replace('?dl=0', '?dl=1');
      return downloadUrl;
    } catch (error: any) {
      // Handle "already shared" error
      if (error?.error?.['.tag'] === 'shared_link_already_exists') {
        // Get existing links
        const listResponse = await this.dbx.sharingListSharedLinks({ path });
        if (listResponse.result.links && listResponse.result.links.length > 0) {
          let downloadUrl = listResponse.result.links[0].url;
          downloadUrl = downloadUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
          downloadUrl = downloadUrl.replace('?dl=0', '?dl=1');
          return downloadUrl;
        }
      }

      // Handle token expiration
      if (error?.status === 401 && retryCount < MAX_RETRIES) {
        logger.info('Token expired during shared link creation, refreshing...');
        await this.refreshToken();
        logger.info('Retrying shared link creation after token refresh...');
        return this.getSharedLink(path, retryCount + 1);
      }

      logger.error('Dropbox API error:', error);
      throw new Error(`Failed to create shared link ${JSON.stringify({ error, path })}`);
    }
  }

  private async notifyZapier(fileUrl: string, zapierUrl: string): Promise<void> {
    if (!zapierUrl) {
      logger.info('Skipping Zapier notification - no webhook URL configured');
      return;
    }

    try {
      logger.info('Sending notification to Zapier webhook', { fileUrl });
      const response = await fetch(zapierUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          download_url: fileUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Zapier webhook failed with status ${response.status}`);
      }
      const jsonResponse = await response.json();
      logger.info(`Successfully notified Zapier webhook' ${JSON.stringify(jsonResponse, null, 2)}`);
    } catch (error) {
      logger.error('Failed to notify Zapier webhook', error);
    }
  }

  async uploadImage(imageData: string, fileName: string, isConsumerUpload: boolean = false, userId?: string): Promise<string> {
    try {
      logger.info('Starting Dropbox upload process', { fileName, userId });

      const buffer = Buffer.from(
        imageData.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      );

      let modifiedFileName = fileName;
      if (isConsumerUpload && userId) {
        const extension = fileName.substring(fileName.lastIndexOf('.'));
        const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
        modifiedFileName = `user_${userId}_${baseName}${extension}`;
      }

      const path = isConsumerUpload 
        ? `/translate - magic menu/${modifiedFileName}`
        : `/Magic Menu/${fileName}`;

      const zapierUrl = isConsumerUpload 
      ? this.zapierConsumerWebookUrl
      : this.zapierWebhookUrl;

      logger.info('Zapier webhook URL', { zapierUrl });

      logger.info('Uploading to Dropbox path', { path });

      try {
        logger.debug('Attempting file upload...');
        const uploadResponse = await this.dbx.filesUpload({
          path,
          contents: buffer,
        });
        logger.info('Upload successful', uploadResponse.result);

        try {
          const downloadUrl = await this.getSharedLink(uploadResponse.result.path_display || path);
          logger.info('Successfully generated shared link', { downloadUrl });

          // Listen for SSE Event from Zapier
          const eventSource = new EventSource(`/api/sse-zapier?userId=${userId}`);

          const timeout = setTimeout(() => {
            console.error("Zapier response timeout exceeded (30s)");
            eventSource.close();
          }, 30000); // 30-second timeout

          eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.completed) {
              console.log("Zapier process completed!", data);
              clearTimeout(timeout); // Stop timeout
              eventSource.close(); // Close SSE connection
            }
          };

          await this.notifyZapier(downloadUrl, zapierUrl);

          return uploadResponse.result.path_display || path;
        } catch (sharedLinkError: any) {
          // If creating shared link fails even after retry in getSharedLink
          logger.error('Failed to create shared link after upload', sharedLinkError);
          throw sharedLinkError;
        }
      } catch (uploadError: any) {
        logger.error('Dropbox API error during upload', {
          status: uploadError?.status,
          error: uploadError?.error,
          message: uploadError?.message
        });

        if (uploadError?.status === 401) {
          logger.info('Token expired during upload, attempting refresh...');
          await this.refreshToken();

          logger.info('Retrying upload after token refresh...');
          const retryResponse = await this.dbx.filesUpload({
            path,
            contents: buffer,
          });
          logger.info('Retry upload successful', retryResponse.result);

          const downloadUrl = await this.getSharedLink(retryResponse.result.path_display || path);
          logger.info('Successfully generated shared link after retry', { downloadUrl });

          await this.notifyZapier(downloadUrl, zapierUrl);

          return retryResponse.result.path_display || path;
        }
        throw uploadError;
      }
    } catch (error) {
      logger.error('Error in uploadImage', error);
      throw error;
    }
  }
}

export const dropboxService = new DropboxService();