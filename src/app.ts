import express, { type ErrorRequestHandler } from "express";
import { getPublicCategories } from "./config/categories.js";
import { PlacesApiError, PlacesClientConfigurationError } from "./services/places-client.js";
import { SearchCursorError, SearchInputError, SearchService } from "./services/search-service.js";

export function createApp(searchService: SearchService) {
  const app = express();
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/categories", (_request, response) => {
    response.json({ categories: getPublicCategories() });
  });

  app.post("/api/search", async (request, response, next) => {
    const controller = new AbortController();
    response.on("close", () => {
      if (!response.writableEnded) controller.abort();
    });
    try {
      const page = await searchService.startSearch(request.body?.categories, controller.signal);
      response.json(page);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/search/next", async (request, response, next) => {
    const controller = new AbortController();
    response.on("close", () => {
      if (!response.writableEnded) controller.abort();
    });
    try {
      const page = await searchService.nextPage(request.body?.cursor, controller.signal);
      response.json(page);
    } catch (error) {
      next(error);
    }
  });

  app.use(((error, _request, response, _next) => {
    if (response.destroyed) return;
    if (error instanceof SearchInputError) {
      response.status(400).json({ error: { code: "INVALID_SEARCH", message: error.message } });
      return;
    }
    if (error instanceof SearchCursorError) {
      response.status(400).json({ error: { code: "INVALID_CURSOR", message: error.message } });
      return;
    }
    if (error instanceof PlacesClientConfigurationError) {
      response.status(503).json({ error: { code: "MISSING_API_KEY", message: "Configure GOOGLE_PLACES_API_KEY em backend/.env." } });
      return;
    }
    if (error instanceof PlacesApiError) {
      const quotaError = error.httpStatus === 429 || error.googleStatus === "RESOURCE_EXHAUSTED" || /quota|rate limit/i.test(error.message);
      const authenticationError = error.httpStatus === 401 || error.httpStatus === 403 || error.googleStatus === "UNAUTHENTICATED" || error.googleStatus === "PERMISSION_DENIED";
      if (quotaError) {
        response.status(429).json({ error: { code: "GOOGLE_QUOTA_EXCEEDED", message: "Limite de consultas do Google Places atingido. Tente novamente mais tarde." } });
        return;
      }
      if (authenticationError) {
        const googleStatus = error.googleStatus ? ` ${error.googleStatus}` : "";
        response.status(502).json({
          error: {
            code: "GOOGLE_AUTHENTICATION_FAILED",
            message: `Google Places negou a solicitação (${error.httpStatus}${googleStatus}). Confira se Places API (New) está habilitada no projeto da chave, se o faturamento está ativo e se as restrições da chave permitem chamadas do backend.`
          }
        });
        return;
      }
      response.status(error.httpStatus >= 500 ? 503 : 502).json({
        error: { code: "GOOGLE_PLACES_ERROR", message: "O Google Places não conseguiu concluir a busca. Tente novamente." }
      });
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({ error: { code: "INVALID_JSON", message: "O corpo da solicitação não é um JSON válido." } });
      return;
    }
    response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a busca." } });
  }) as ErrorRequestHandler);

  return app;
}
