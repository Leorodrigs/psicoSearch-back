import "dotenv/config";
import { createApp } from "./app.js";
import { PlacesClient } from "./services/places-client.js";
import { SearchService } from "./services/search-service.js";
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const host = process.env.HOST?.trim() || "0.0.0.0";
const placesClient = new PlacesClient(process.env.GOOGLE_PLACES_API_KEY);
const searchService = new SearchService((textQuery, pageToken) => placesClient.searchText(textQuery, pageToken));
const app = createApp(searchService);
const server = app.listen(port, host, () => {
    console.log(`Backend disponível em http://${host}:${port}`);
});
function shutdown() {
    server.close(() => {
        searchService.dispose();
        process.exit(0);
    });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
//# sourceMappingURL=server.js.map