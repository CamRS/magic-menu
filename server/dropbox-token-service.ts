import { Dropbox } from 'dropbox';

const APP_KEY = 's0y3pb9x0ug1yd4';
const APP_SECRET = 'u0v0lo5w073x34v';

export class DropboxService {
  private dbx: Dropbox;
  private accessToken: string | null = null;

  constructor() {
    this.dbx = new Dropbox({
      clientId: APP_KEY,
      clientSecret: APP_SECRET
    });
  }

  public setAccessToken(token: string) {
    this.accessToken = token;
    this.dbx = new Dropbox({
      accessToken: token
    });
  }

  public getAuthUrl(): string {
    return `https://www.dropbox.com/oauth2/authorize?client_id=${APP_KEY}&response_type=token&redirect_uri=${encodeURIComponent(window.location.origin)}`;
  }

  public getCurrentToken(): string | null {
    return this.accessToken;
  }

  public getDropboxClient(): Dropbox {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    return this.dbx;
  }
}

export const dropboxService = new DropboxService();