// Utility functions for Dropbox authentication
import { utils } from 'dropbox';

export function getAccessTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return utils.parseQueryString(window.location.hash).access_token || null;
}

export function isAuthenticated(): boolean {
  return !!getAccessTokenFromUrl();
}