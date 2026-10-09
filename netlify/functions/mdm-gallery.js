// =====================================================
// MDM SOCIAL AUTOGALLERY
// J&I Outdoor Living - Netlify Function
// =====================================================

const CACHE_SECONDS = 300;

const jsonResponse = (statusCode, data, extraHeaders = {}) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  },
  body: JSON.stringify(data)
});

exports.handler = async (event) => {

  if (event.httpMethod && event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." }, {
      Allow: "GET"
    });
  }

  const {
    MDM_API_URL,
    MDM_API_KEY,
    MDM_BUSINESS_SLUG
  } = process.env;

  if (!MDM_API_URL || !MDM_API_KEY || !MDM_BUSINESS_SLUG) {
    return jsonResponse(500, {
      error: "Gallery is not configured."
    });
  }

  const incoming = event.queryStringParameters || {};
  const params = new URLSearchParams();

  const requestedLimit = Number(incoming.limit ?? 12);

  if (!Number.isInteger(requestedLimit) ||
      requestedLimit < 1 ||
      requestedLimit > 60) {
    return jsonResponse(400, {
      error: "Invalid gallery limit."
    });
  }

  params.set("limit", String(requestedLimit));

  if (incoming.platform) {
    params.set("platform", incoming.platform);
  }

  if (incoming.category) {
    params.set("category", incoming.category);
  }

  if (incoming.featured !== undefined) {
    if (!["true", "false"].includes(incoming.featured)) {
      return jsonResponse(400, {
        error: "Invalid featured filter."
      });
    }

    params.set("featured", incoming.featured);
  }

  try {
    const baseUrl = new URL(MDM_API_URL);

    if (baseUrl.protocol !== "https:") {
      throw new Error("MDM_API_URL must use HTTPS");
    }

    const url = new URL(
      `/api/v1/businesses/${encodeURIComponent(MDM_BUSINESS_SLUG)}/gallery`,
      baseUrl
    );

    url.search = params.toString();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${MDM_API_KEY}`,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error("MDM gallery upstream status:", response.status);

      return jsonResponse(
        response.status === 404 ? 404 : 502,
        { error: "Gallery is temporarily unavailable." },
        { "Cache-Control": "no-store" }
      );
    }

    const data = await response.json();

    if (!Array.isArray(data.items)) {
      throw new Error("Invalid gallery response format");
    }

    return jsonResponse(200, data, {
      "Cache-Control":
        `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`
    });

  } catch (error) {
    console.error("MDM gallery request failed:", error.message);

    return jsonResponse(502, {
      error: "Gallery is temporarily unavailable."
    });
  }
};