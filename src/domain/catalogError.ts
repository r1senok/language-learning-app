export type CatalogErrorReason = 'configuration' | 'access' | 'network' | 'response'

export class CatalogLoadError extends Error {
  readonly reason: CatalogErrorReason

  constructor(reason: CatalogErrorReason) {
    super('Catalog load failed')
    this.reason = reason
  }
}

export function catalogErrorReason(error: unknown): CatalogErrorReason {
  return error instanceof CatalogLoadError ? error.reason : 'network'
}
