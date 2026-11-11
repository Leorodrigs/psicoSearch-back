export interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  businessStatus?: string;
}

export interface GoogleTextSearchResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
}

export interface PlaceResult {
  id: string;
  name: string;
  address: string | null;
  website: string | null;
  phone: string | null;
}

export interface SearchPage {
  items: PlaceResult[];
  cursor: string | null;
  hasMore: boolean;
}
