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
    this.accessToken = process.env.VITE_DROPBOX_ACCESS_TOKEN || '';
    this.dbx = new Dropbox({ accessToken: this.accessToken });
  }

  private async refreshToken(): Promise<string> {
    const appKey = process.env.VITE_DROPBOX_APP_KEY;
    const appSecret = process.env.VITE_DROPBOX_APP_SECRET;
    const refreshToken = process.env.VITE_DROPBOX_REFRESH_TOKEN;

    const auth = Buffer.from(`${appKey}:${appSecret}`).toString('base64');

    const response = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json() as RefreshTokenResponse;
    this.accessToken = data.access_token;
    this.dbx = new Dropbox({ accessToken: this.accessToken });

    return this.accessToken;
  }

  async uploadImage(imageData: string, fileName: string): Promise<string> {
    try {
      // Remove data URL prefix if present
      const buffer = Buffer.from(
        imageData.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      );

      const path = `/Magic Menu/${fileName}`;

      try {
        const response = await this.dbx.filesUpload({
          path,
          contents: buffer,
        });

        // Get a shared link
        const shareResponse = await this.dbx.sharingCreateSharedLink({
          path: response.result.path_display || path,
        });

        // Convert shared link to direct download link
        let downloadUrl = shareResponse.result.url;
        downloadUrl = downloadUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
        downloadUrl = downloadUrl.replace('?dl=0', '');

        return downloadUrl;
      } catch (error: any) {
        if (error?.status === 401) {
          // Token expired, refresh and retry
          await this.refreshToken();
          const response = await this.dbx.filesUpload({
            path,
            contents: buffer,
          });

          const shareResponse = await this.dbx.sharingCreateSharedLink({
            path: response.result.path_display || path,
          });

          let downloadUrl = shareResponse.result.url;
          downloadUrl = downloadUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
          downloadUrl = downloadUrl.replace('?dl=0', '');

          return downloadUrl;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error uploading to Dropbox:', error);
      throw new Error('Failed to upload image to Dropbox');
    }
  }
}

export const dropboxService = new DropboxService();