const API_BASE = 'http://localhost:4000/api/v1';

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      cache: 'no-store',
    });

    const json = await res.json();
    return json;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network communication failed',
    };
  }
}
