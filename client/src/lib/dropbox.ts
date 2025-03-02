import { Dropbox } from 'dropbox';

// Generate a random state string for OAuth security
export const generateState = () => {
  return Math.random().toString(36).substring(2);
};

// Create a singleton Dropbox client instance
let dropboxInstance: Dropbox | null = null;

export const getDropboxClient = (accessToken?: string | null) => {
  if (accessToken) {
    dropboxInstance = new Dropbox({ accessToken });
  }
  return dropboxInstance;
};
