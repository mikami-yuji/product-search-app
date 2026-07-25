import { describe, it, expect } from 'vitest';
import { parseGoogleDriveFolderId, getGoogleDriveImageUrl } from './googleDriveApi';

describe('googleDriveApi utility functions', () => {
  it('should parse folder ID from Google Drive folder URL correctly', () => {
    const url = 'https://drive.google.com/drive/folders/1kmoJG4MiZ40gBa6azE3J-l6W_GzeQUxE';
    expect(parseGoogleDriveFolderId(url)).toBe('1kmoJG4MiZ40gBa6azE3J-l6W_GzeQUxE');
  });

  it('should return raw ID when input is already a valid folder ID', () => {
    const rawId = '1kmoJG4MiZ40gBa6azE3J-l6W_GzeQUxE';
    expect(parseGoogleDriveFolderId(rawId)).toBe('1kmoJG4MiZ40gBa6azE3J-l6W_GzeQUxE');
  });

  it('should return empty string for invalid input', () => {
    expect(parseGoogleDriveFolderId('')).toBe('');
    expect(parseGoogleDriveFolderId('invalid-short')).toBe('');
  });

  it('should generate valid Google Drive direct image URL', () => {
    const fileId = 'abc123xyz';
    expect(getGoogleDriveImageUrl(fileId)).toBe('https://lh3.googleusercontent.com/d/abc123xyz');
  });
});
