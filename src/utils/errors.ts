export class SourceFetchError extends Error {
  constructor(
    public sourceId: string,
    message: string,
    public cause?: unknown,
  ) {
    super(`[${sourceId}] ${message}`)
    this.name = 'SourceFetchError'
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}
