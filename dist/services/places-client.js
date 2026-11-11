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
export class PlacesApiError extends Error {
    httpStatus;
    googleStatus;
    constructor(message, httpStatus, googleStatus) {
        super(message);
        this.httpStatus = httpStatus;
        this.googleStatus = googleStatus;
        this.name = "PlacesApiError";
    }
}
export class PlacesClientConfigurationError extends Error {
    constructor() {
        super("GOOGLE_PLACES_API_KEY não foi configurada.");
        this.name = "PlacesClientConfigurationError";
    }
}
export class PlacesClient {
    apiKey;
    fetcher;
    constructor(apiKey, fetcher = fetch) {
        this.apiKey = apiKey;
        this.fetcher = fetcher;
    }
    async searchText(textQuery, pageToken, requestSignal) {
        if (!this.apiKey?.trim()) {
            throw new PlacesClientConfigurationError();
        }
        const body = {
            textQuery,
            languageCode: "pt-BR",
            regionCode: "BR",
            pageSize: 20
        };
        if (pageToken)
            body.pageToken = pageToken;
        let response;
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
        }
        catch {
            if (requestSignal?.aborted)
                throw new Error("Solicitação cancelada.");
            throw new PlacesApiError("Não foi possível conectar ao Google Places.", 503);
        }
        if (!response.ok) {
            let googleError = {};
            try {
                googleError = (await response.json());
            }
            catch {
                // Keep the upstream status when Google does not return a JSON error body.
            }
            throw new PlacesApiError(googleError.error?.message ?? "Google Places retornou um erro.", response.status, googleError.error?.status);
        }
        try {
            return (await response.json());
        }
        catch {
            throw new PlacesApiError("A resposta do Google Places não pôde ser lida.", 502);
        }
    }
}
//# sourceMappingURL=places-client.js.map