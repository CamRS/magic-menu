import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';

interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class DropboxService {
  private dbx: Dropbox;
  private accessToken: string;

  constructor() {
    console.log('Initializing DropboxService...');
    this.accessToken = process.env.VITE_DROPBOX_ACCESS_TOKEN || '';
    this.dbx = new Dropbox({ accessToken: this.accessToken });
    console.log('DropboxService initialized with token length:', this.accessToken.length);
  }

  private async refreshToken(): Promise<string> {
    const appKey = process.env.VITE_DROPBOX_APP_KEY;
    const appSecret = process.env.VITE_DROPBOX_APP_SECRET;
    const refreshToken = process.env.VITE_DROPBOX_REFRESH_TOKEN;

    console.log('Attempting to refresh Dropbox token');

    if (!appKey || !appSecret || !refreshToken) {
      const error = new Error('Missing required environment variables for token refresh');
      console.error('Token refresh failed:', error);
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

      console.log('Token refresh response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token refresh failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as RefreshTokenResponse;
      console.log('Token refreshed successfully');

      this.accessToken = data.access_token;
      this.dbx = new Dropbox({ accessToken: this.accessToken });

      return this.accessToken;
    } catch (error) {
      console.error('Error during token refresh:', error);
      throw error;
    }
  }

  async uploadImage(imageData: string, fileName: string): Promise<string> {
    try {
      console.log('Starting Dropbox upload process for:', fileName);

      // Remove data URL prefix if present
      const buffer = Buffer.from(
        imageData.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      );

      const path = `/Magic Menu/${fileName}`;
      console.log('Uploading to Dropbox path:', path);

      try {
        console.log('Attempting file upload...');
        const response = await this.dbx.filesUpload({
          path,
          contents: buffer,
        });
        console.log('Upload successful:', response.result);

        // Get a shared link
        console.log('Creating shared link...');
        const shareResponse = await this.dbx.sharingCreateSharedLink({
          path: response.result.path_display || path,
        });
        console.log('Shared link created:', shareResponse.result);

        // Convert shared link to direct download link
        let downloadUrl = shareResponse.result.url;
        downloadUrl = downloadUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
        downloadUrl = downloadUrl.replace('?dl=0', '');

        console.log('Final download URL:', downloadUrl);
        return downloadUrl;
      } catch (error: any) {
        console.error('Dropbox API error:', {
          status: error?.status,
          error: error?.error,
          message: error?.message,
          stack: error?.stack
        });

        if (error?.status === 401) {
          console.log('Token expired, attempting refresh...');
          await this.refreshToken();

          console.log('Retrying upload after token refresh...');
          const response = await this.dbx.filesUpload({
            path,
            contents: buffer,
          });
          console.log('Retry upload successful:', response.result);

          const shareResponse = await this.dbx.sharingCreateSharedLink({
            path: response.result.path_display || path,
          });
          console.log('Retry shared link created:', shareResponse.result);

          let downloadUrl = shareResponse.result.url;
          downloadUrl = downloadUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
          downloadUrl = downloadUrl.replace('?dl=0', '');

          console.log('Final download URL after retry:', downloadUrl);
          return downloadUrl;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error in uploadImage:', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      });
      throw error;
    }
  }
}

export const dropboxService = new DropboxService();