function getIntegrationStatus() {
  return {
    openai: {
      configured: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_MODEL || "gpt-5.2",
    },
    schools: {
      configured: Boolean(process.env.SCHOOLS_API_KEY),
      provider: process.env.SCHOOLS_PROVIDER || "not-configured",
    },
    commute: {
      configured: Boolean(process.env.COMMUTE_API_KEY),
      provider: process.env.COMMUTE_PROVIDER || "not-configured",
    },
    email: {
      configured: Boolean(process.env.EMAIL_API_KEY),
      provider: process.env.EMAIL_PROVIDER || "not-configured",
    },
    marketData: {
      configured: Boolean(process.env.MARKET_DATA_API_KEY),
      provider: process.env.MARKET_DATA_PROVIDER || "not-configured",
    },
  };
}

function buildSchoolFallback(property) {
  return {
    source: "fallback",
    district:
      property.HighSchoolDistrict ||
      property.MiddleOrJuniorSchoolDistrict ||
      property.ElementarySchoolDistrict ||
      "District unavailable",
  };
}

function buildCommuteFallback(property) {
  return {
    source: "fallback",
    summary: `Commute context centered around ${property.L_City || "the local market"}.`,
  };
}

module.exports = {
  getIntegrationStatus,
  buildSchoolFallback,
  buildCommuteFallback,
};
