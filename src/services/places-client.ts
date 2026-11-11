import type { GoogleTextSearchResponse } from "../types/places.js";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.businessStatus",
  "nextPageToken"
].join(",");

interface GoogleErrorBody {
  error?: {
    code?: number;
    status?: string;
    message?: string;
  };
}

export class PlacesApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly googleStatus?: string
  ) {
    super(message);
    this.name = "PlacesApiError";
  }
}

export class PlacesClientConfigurationError extends Error {
  constructor() {
    super("GOOGLE_PLACES_API_KEY não foi configurada.");
    this.name = "PlacesClientConfigurationError";
  }
}

export type FetchLike = typeof fetch;

export class PlacesClient {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly fetcher: FetchLike = fetch
  ) {}

  async searchText(textQuery: string, pageToken?: string, requestSignal?: AbortSignal): Promise<GoogleTextSearchResponse> {
    if (!this.apiKey?.trim()) {
      throw new PlacesClientConfigurationError();
    }

    const body: Record<string, string | number> = {
      textQuery,
      languageCode: "pt-BR",
      regionCode: "BR",
      pageSize: 20
    };
    if (pageToken) body.pageToken = pageToken;

    let response: Response;
    try {
      response = await this.fetcher(PLACES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": FIELD_MASK
        },
        body: JSON.stringify(body),
        signal: requestSignal
          ? AbortSignal.any([requestSignal, AbortSignal.timeout(15_000)])
          : AbortSignal.timeout(15_000)
      });
    } catch {
      if (requestSignal?.aborted) throw new Error("Solicitação cancelada.");
      throw new PlacesApiError("Não foi possível conectar ao Google Places.", 503);
    }

    if (!response.ok) {
      let googleError: GoogleErrorBody = {};
      try {
        googleError = (await response.json()) as GoogleErrorBody;
      } catch {
        // Keep the upstream status when Google does not return a JSON error body.
      }
      throw new PlacesApiError(
        googleError.error?.message ?? "Google Places retornou um erro.",
        response.status,
        googleError.error?.status
      );
    }

    try {
      return (await response.json()) as GoogleTextSearchResponse;
    } catch {
      throw new PlacesApiError("A resposta do Google Places não pôde ser lida.", 502);
    }
  }
}
