import { ofetch } from 'ofetch'

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
]

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

export interface FetchOptions {
  timeout?: number
  headers?: Record<string, string>
  responseType?: 'text' | 'json'
}

export async function httpGet(url: string, opts: FetchOptions = {}): Promise<string> {
  return ofetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': randomUA(),
      ...opts.headers,
    },
    timeout: opts.timeout ?? 15000,
    retry: 2,
    retryDelay: 1000,
    responseType: 'text',
  })
}

export async function httpGetJSON<T = unknown>(url: string, opts: FetchOptions = {}): Promise<T> {
  return ofetch<T>(url, {
    method: 'GET',
    headers: {
      'User-Agent': randomUA(),
      ...opts.headers,
    },
    timeout: opts.timeout ?? 15000,
    retry: 2,
    retryDelay: 1000,
  })
}
