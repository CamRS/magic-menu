import { Dropbox } from 'dropbox';

const APP_KEY = 's0y3pb9x0ug1yd4';
const APP_SECRET = 'u0v0lo5w073x34v';

let currentAccessToken = 'sl.u.AFl_Sm0VvreSnOuSdWHK5rR41xXZ0e1ax1KXmdzGcrBzu93CgXoYXabBbPXQ1ixKPJqEiRwJFNoAZR7g5H6FOPziCi14cQDa2LkommycAQOfWGyIBLGwJeb5EBkcBsUeP5WEPIZpJkNJoSz-ggr_fynsiFbLTinDrn9_VeJGIEkaXLTygT0dwR66-ayia0GICKvhHE355P_OdqYlHhk6A_BZz3DuBCiEngop5deOpuTyATyrjJo8qnlqGzGJXmC8tu74E5XaRzcHh_f8pzdCrsBHH-btjdqUmZ3N7NcIHT_C5xyDxondmaX5d1v7HattUQrSGerhyHiZ_C_n3x6cM3I2gUl359SLDZGiJthgqqPewH504MAcE8vXMrVsKcomspeSxADX8nreXcuQbYFZsrz16h-ZII7YHOUCM1a4TSoHHMN2toRYa53kvNfo3jy47oAbz79u5RYwavacA-ljKYB7qnQWqATsrOWtRT_3wVq7YI786qvimhV6sr_1vesO1KvnAPkE_shZSGN37p6yRY6xFGmmoBcUKh4gVHcxNAJiNKxyDDDFuEVdmtCtAtLMJp1nS_wFfUdlwNYSfaxRSv32FYl9nHXfp6q5YuELNQiwIiZLWte5Zb1afLdSHEKKHCzmRu8pFWkj2Sm5JpdrsPWP2ZeermrQGRlNt6Ez9xw5MJ2vEV70khqsQdahOMEUcKtuD4UG3Bu5kat4po0ekV8EqNAT4qfn5byZ1PpC4OS9ZMsiYcYmof-r_1Zr8RfHdWGSpnIU90KKop9cYoyjYmvgQkKGIqvrvQV50VOdYmxCK6f5mk8BrTiOSGNIztDmV805f9ZLEVmQfRUB8jsyd50-TR7C_9bKN_h65XoSJxzrdcXA3UuhGmzBicuIfdnUq4Dbw4tLxqFQ1sBr8iuQlDBs_heWnvLa4B8DzVbCesQ7WQ7aHrXSNpQONcia-2DZiMA2KkTaJ44cM-Bu9blwHTRveyEdHwKkkTOPa8TlX45x3i3YEuJ1_myltpvAXPPfwIcBZhcNQDftbLqO4Fnchx_L1tEYfdL7oK3xHpspzwIIYwFQ2KC6xiuzgWT05eph459Fdd564aMxbZp5lr4VSnJ96fMdXUUfuVLKQb_YpZ_-T-JdjeCexxQMmTdbRy7YPN33lIMxeq9cp240VIu8yP6HPhsoQMqxSHgSpEsgX8cQhcEKr5UgxmXl-m4Q6DTV5pXElcAIBMMNUCdHc0Hn-ES-CXc02ujgzZ3DHkTn5lLYzSeJCoEzv4313y1PPdOHVa0';

export class DropboxService {
  private dbx: Dropbox;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.dbx = new Dropbox({
      clientId: APP_KEY,
      clientSecret: APP_SECRET,
      accessToken: currentAccessToken
    });
  }

  public getCurrentToken(): string {
    return currentAccessToken;
  }

  private async refreshToken() {
    try {
      // Try to make a test API call to check token validity
      await this.dbx.filesListFolder({ path: '' });
    } catch (error) {
      console.error('Dropbox token refresh needed:', error);
      
      try {
        // Attempt to refresh the token
        const response = await this.dbx.refreshAccessToken();
        currentAccessToken = response.result.access_token;
        
        // Update the Dropbox client with new token
        this.dbx = new Dropbox({
          clientId: APP_KEY,
          clientSecret: APP_SECRET,
          accessToken: currentAccessToken
        });

        console.log('Dropbox token refreshed successfully');
      } catch (refreshError) {
        console.error('Failed to refresh Dropbox token:', refreshError);
      }
    }
  }

  public startTokenRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Run immediately once
    this.refreshToken();

    // Then set up the hourly interval
    this.refreshInterval = setInterval(() => {
      this.refreshToken();
    }, 60 * 60 * 1000); // 1 hour in milliseconds
  }

  public stopTokenRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Create and export a singleton instance
export const dropboxService = new DropboxService();
