/**
 * Centralized Turso database configuration
 * 
 * This module provides a single source of truth for Turso database
 * connection parameters, with proper validation and trimming.
 */

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL environment variable is required");
}

/**
 * Turso database URL with whitespace trimmed
 */
export const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL.trim();

/**
 * Turso authentication token with whitespace trimmed (optional)
 */
export const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN?.trim();
