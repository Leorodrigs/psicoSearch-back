import { randomUUID } from "node:crypto";
import { searchCategories } from "../config/categories.js";
const PAGE_SIZE = 20;
const MAX_PAGES_PER_QUERY = 3;
const SESSION_TTL_MS = 30 * 60 * 1000;
export class SearchInputError extends Error {
    constructor(message) {
        super(message);
        this.name = "SearchInputError";
    }
}
export class SearchCursorError extends Error {
    constructor(message) {
        super(message);
        this.name = "SearchCursorError";
    }
}
function toPlaceResult(place) {
    if (!place.id || place.businessStatus === "CLOSED_PERMANENTLY")
        return null;
    return {
        id: place.id,
        name: place.displayName?.text?.trim() || "—",
        address: place.formattedAddress?.trim() || null,
        website: place.websiteUri?.trim() || null,
        phone: place.nationalPhoneNumber?.trim() || null
    };
}
export class SearchService {
    searchText;
    location;
    now;
    sessionsByCursor = new Map();
    cleanupTimer;
    constructor(searchText, location = process.env.SEARCH_LOCATION?.trim() || "Porto Alegre, RS, Brasil", now = Date.now) {
        this.searchText = searchText;
        this.location = location;
        this.now = now;
        this.cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), 60_000);
        this.cleanupTimer.unref();
    }
    dispose() {
        clearInterval(this.cleanupTimer);
        this.sessionsByCursor.clear();
    }
    async startSearch(categoryIds, signal) {
        this.cleanupExpiredSessions();
        const categories = this.validateCategories(categoryIds);
        const cursor = randomUUID();
        const session = {
            categories,
            categoryIndex: 0,
            pagesFetched: 0,
            seenPlaceIds: new Set(),
            pendingPlaces: [],
            currentCursor: cursor,
            expiresAt: this.now() + SESSION_TTL_MS,
            responses: new Map(),
            inFlight: new Map()
        };
        this.sessionsByCursor.set(cursor, session);
        try {
            const page = await this.collectPage(session, signal);
            session.currentCursor = page.cursor;
            this.rememberNextCursor(session, page.cursor);
            session.expiresAt = this.now() + SESSION_TTL_MS;
            return page;
        }
        catch (error) {
            this.removeSession(session);
            throw error;
        }
    }
    async nextPage(cursorValue, signal) {
        this.cleanupExpiredSessions();
        if (typeof cursorValue !== "string" || cursorValue.length < 1 || cursorValue.length > 100) {
            throw new SearchCursorError("Cursor de pesquisa inválido ou expirado.");
        }
        const session = this.sessionsByCursor.get(cursorValue);
        if (!session)
            throw new SearchCursorError("Esta pesquisa expirou. Inicie uma nova busca.");
        const cachedResponse = session.responses.get(cursorValue);
        if (cachedResponse)
            return cachedResponse;
        const pendingResponse = session.inFlight.get(cursorValue);
        if (pendingResponse)
            return pendingResponse;
        if (session.currentCursor !== cursorValue) {
            throw new SearchCursorError("Cursor de pesquisa inválido ou já utilizado.");
        }
        const operation = this.collectPage(session, signal).then((page) => {
            session.responses.set(cursorValue, page);
            session.currentCursor = page.cursor;
            session.expiresAt = this.now() + SESSION_TTL_MS;
            this.rememberNextCursor(session, page.cursor);
            return page;
        });
        session.inFlight.set(cursorValue, operation);
        try {
            return await operation;
        }
        finally {
            session.inFlight.delete(cursorValue);
        }
    }
    validateCategories(value) {
        if (!Array.isArray(value) || value.length === 0 || value.length > searchCategories.length) {
            throw new SearchInputError("Selecione pelo menos uma categoria válida.");
        }
        if (!value.every((id) => typeof id === "string")) {
            throw new SearchInputError("As categorias selecionadas são inválidas.");
        }
        const uniqueIds = [...new Set(value)];
        const selected = uniqueIds.map((id) => searchCategories.find((category) => category.id === id));
        if (selected.some((category) => !category)) {
            throw new SearchInputError("Uma ou mais categorias selecionadas não são reconhecidas.");
        }
        return selected;
    }
    async collectPage(session, signal) {
        while (session.pendingPlaces.length < PAGE_SIZE && session.categoryIndex < session.categories.length) {
            if (signal?.aborted)
                throw new Error("Solicitação cancelada.");
            const category = session.categories[session.categoryIndex];
            const textQuery = `${category.searchTerm} em ${this.location}`;
            const response = await this.searchText(textQuery, session.pageToken, signal);
            session.pagesFetched += 1;
            for (const place of response.places ?? []) {
                const result = toPlaceResult(place);
                if (!result || session.seenPlaceIds.has(result.id))
                    continue;
                session.seenPlaceIds.add(result.id);
                session.pendingPlaces.push(result);
            }
            if (response.nextPageToken && session.pagesFetched < MAX_PAGES_PER_QUERY) {
                session.pageToken = response.nextPageToken;
            }
            else {
                session.categoryIndex += 1;
                session.pageToken = undefined;
                session.pagesFetched = 0;
            }
        }
        const items = session.pendingPlaces.splice(0, PAGE_SIZE);
        const hasMore = session.pendingPlaces.length > 0 || session.categoryIndex < session.categories.length;
        return {
            items,
            cursor: hasMore ? randomUUID() : null,
            hasMore
        };
    }
    rememberNextCursor(session, cursor) {
        if (cursor)
            this.sessionsByCursor.set(cursor, session);
    }
    cleanupExpiredSessions() {
        const expired = new Set();
        for (const session of this.sessionsByCursor.values()) {
            if (session.expiresAt <= this.now())
                expired.add(session);
        }
        for (const session of expired)
            this.removeSession(session);
    }
    removeSession(session) {
        for (const [cursor, cursorSession] of this.sessionsByCursor) {
            if (cursorSession === session)
                this.sessionsByCursor.delete(cursor);
        }
    }
}
//# sourceMappingURL=search-service.js.map