import { supabase } from './supabaseClient';

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/$/, '');

/**
 * Authenticated API request helper for PRABANDH.
 *
 * Every protected FastAPI request gets the current
 * Supabase access token automatically.
 */
export async function apiFetch(path, options = {}) {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Check your .env.local file.'
    );
  }

  // Get the currently authenticated Supabase session.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error(
      'Unable to read Supabase session:',
      sessionError
    );

    throw new Error(
      'Unable to read authentication session.'
    );
  }

  if (!session?.access_token) {
    throw new Error(
      'Authenticated PRABANDH session required.'
    );
  }

  // Build headers.
  const headers = new Headers(
    options.headers || {}
  );

  headers.set(
    'Authorization',
    `Bearer ${session.access_token}`
  );

  // Only set JSON content type when we are actually sending JSON.
  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set(
      'Content-Type',
      'application/json'
    );
  }

  // Make request.
  let response;

  try {
    response = await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        headers,
      }
    );
  } catch (error) {
    console.error(
      'PRABANDH API network error:',
      error
    );

    throw new Error(
      'Unable to connect to PRABANDH backend. Make sure FastAPI is running on http://localhost:8000.'
    );
  }

  // Try to parse response.
  const contentType =
    response.headers.get('content-type') || '';

  let body;

  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => ({}));
  } else {
    body = await response.text().catch(() => '');
  }

  // Handle expired/invalid authentication.
  if (response.status === 401) {
    console.error(
      'PRABANDH API authentication failed:',
      body
    );

    throw new Error(
      'Your PRABANDH session has expired or is not authenticated. Please sign in again.'
    );
  }

  // Handle authorization.
  if (response.status === 403) {
    const message =
      typeof body === 'object'
        ? body?.detail
        : body;

    throw new Error(
      message ||
      'You are not authorized to perform this action.'
    );
  }

  // Handle other API errors.
  if (!response.ok) {
    const message =
      typeof body === 'object'
        ? body?.detail
        : body;

    throw new Error(
      message ||
      `Request failed (${response.status})`
    );
  }

  return body;
}