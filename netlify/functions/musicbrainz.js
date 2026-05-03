const MB_BASE = "https://musicbrainz.org/ws/2";
const HEADERS = {
  "User-Agent": "VinylArchive/1.0 (netlify-function)",
  "Accept": "application/json",
};

// Pause to respect MusicBrainz rate limit (1 req/sec)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Search for the best matching release given artist + album title
async function searchRelease(artist, album) {
  const query = `artist:"${artist}" AND release:"${album}"`;
  const url = `${MB_BASE}/release/?query=${encodeURIComponent(query)}&limit=5&fmt=json`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`MusicBrainz search failed: ${res.status}`);
  const data = await res.json();
  const releases = data.releases || [];
  // Return the highest-score release
  return releases.length ? releases[0] : null;
}

// Fetch full release details including recordings (tracks) per medium
async function fetchRelease(mbid) {
  await sleep(1100); // respect rate limit between requests
  const url = `${MB_BASE}/release/${mbid}?inc=recordings+labels+release-groups&fmt=json`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`MusicBrainz release fetch failed: ${res.status}`);
  return res.json();
}

// Split tracks into side A and side B based on medium position and track order
// Vinyl records typically have 2 mediums (sides) or 1 medium where side A = first half
function extractTracklists(mediums) {
  if (!mediums || mediums.length === 0) return { tracklist_a: [], tracklist_b: [] };

  if (mediums.length >= 2) {
    // Two physical sides — medium 1 = side A, medium 2 = side B
    const tracklist_a = (mediums[0].tracks || []).map(t => t.title || "");
    const tracklist_b = (mediums[1].tracks || []).map(t => t.title || "");
    return { tracklist_a, tracklist_b };
  }

  // Single medium — split by half
  const tracks = mediums[0].tracks || [];
  const mid = Math.ceil(tracks.length / 2);
  const tracklist_a = tracks.slice(0, mid).map(t => t.title || "");
  const tracklist_b = tracks.slice(mid).map(t => t.title || "");
  return { tracklist_a, tracklist_b };
}

// Extract label name and catalog number from label-info array
function extractLabelInfo(labelInfo) {
  if (!labelInfo || labelInfo.length === 0) return { label: "", catalog_number: "" };
  const first = labelInfo[0];
  return {
    label: first.label?.name || "",
    catalog_number: first["catalog-number"] || "",
  };
}

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let artist, album;
  try {
    ({ artist, album } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (!artist || !album) {
    return { statusCode: 400, body: JSON.stringify({ error: "artist and album are required" }) };
  }

  try {
    // Step 1: search for the release
    const topRelease = await searchRelease(artist, album);
    if (!topRelease) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ found: false }),
      };
    }

    // Step 2: fetch full release details
    const release = await fetchRelease(topRelease.id);

    // Step 3: extract year from date string (e.g. "1971-09-01" → "1971")
    const year = release.date ? release.date.split("-")[0] : "";

    // Step 4: extract country
    const country = release.country || "";

    // Step 5: extract label and catalog number
    const { label, catalog_number } = extractLabelInfo(release["label-info"]);

    // Step 6: extract tracklist split by side
    const { tracklist_a, tracklist_b } = extractTracklists(release.media);

    const result = {
      found: true,
      mbid: release.id,
      year,
      country,
      label,
      catalog_number,
      tracklist_a,
      tracklist_b,
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("MusicBrainz error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
