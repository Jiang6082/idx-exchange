function parsePhotos(rawPhotos) {
  if (!rawPhotos || typeof rawPhotos !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(rawPhotos);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

function toNumber(value) {
  const next = Number(value);
  return Number.isNaN(next) ? null : next;
}

function formatCurrency(value) {
  return value ? `$${Number(value).toLocaleString("en-US")}` : null;
}

function formatRelativeDayLabel(value) {
  if (!value) {
    return "Recently updated";
  }

  if (value <= 7) {
    return "Fresh this week";
  }

  if (value <= 30) {
    return "New this month";
  }

  return "On market";
}

function buildCommuteContext(property) {
  const city = property.L_City || "the city center";
  const county = property.CountyOrParish || "the surrounding area";
  const daysOnMarket = toNumber(property.DaysOnMarket) || 18;

  return {
    primaryLabel: `Around ${city}`,
    commuteScoreLabel:
      daysOnMarket <= 14 ? "High buyer activity area" : "Steady touring activity",
    notes: [
      `Best suited for buyers focusing on ${city} and nearby parts of ${county}.`,
      "Commute guidance is market-level context, not live traffic data.",
    ],
  };
}

function buildSchoolContext(property) {
  const district =
    property.HighSchoolDistrict ||
    property.MiddleOrJuniorSchoolDistrict ||
    property.ElementarySchoolDistrict ||
    null;

  if (!district) {
    return [];
  }

  return [
    {
      label: "District",
      value: district,
    },
    property.HighSchoolDistrict
      ? {
          label: "High school boundary",
          value: property.HighSchoolDistrict,
        }
      : null,
    property.ElementarySchoolDistrict
      ? {
          label: "Elementary boundary",
          value: property.ElementarySchoolDistrict,
        }
      : null,
  ].filter(Boolean);
}

function buildTaxHistory(property) {
  const currentPrice = toNumber(property.L_SystemPrice);
  if (!currentPrice) {
    return [];
  }

  const annualTax = Math.round(currentPrice * 0.0115);

  return [
    {
      year: new Date().getFullYear(),
      estimatedAnnualTax: annualTax,
      estimatedMonthlyTax: Math.round(annualTax / 12),
      note: "Estimated using a simplified California-style property tax rate.",
    },
  ];
}

function buildPriceHistory(property) {
  return [
    property.OriginalListPrice
      ? {
          label: "Original list",
          amount: property.OriginalListPrice,
          date: property.OriginalEntryTimestamp || property.ListingContractDate || null,
        }
      : null,
    property.PreviousListPrice
      ? {
          label: "Previous price",
          amount: property.PreviousListPrice,
          date: property.PriceChangeTimestamp || property.StatusChangeTimestamp || null,
        }
      : null,
    property.L_SystemPrice
      ? {
          label: "Current price",
          amount: property.L_SystemPrice,
          date: property.PriceChangeTimestamp || property.ListingContractDate || null,
        }
      : null,
  ]
    .filter(Boolean)
    .map((entry) => ({
      ...entry,
      formattedAmount: formatCurrency(entry.amount),
    }));
}

function serializePropertySummary(property) {
  const photos = parsePhotos(property.L_Photos);
  const price = toNumber(property.L_SystemPrice);
  const beds = toNumber(property.L_Keyword2);
  const baths = toNumber(property.LM_Dec_3);
  const sqft = toNumber(property.LM_Int2_3);
  const lotSqft = toNumber(property.LotSizeSquareFeet);

  return {
    ...property,
    summary: {
      listingId: property.L_ListingID,
      address: property.L_Address || property.L_AddressStreet || "Address unavailable",
      city: property.L_City || "",
      state: property.L_State || "",
      zip: property.L_Zip || "",
      price,
      priceLabel: formatCurrency(price),
      beds,
      baths,
      sqft,
      lotSqft,
      status: property.StandardStatus || property.L_Status || "Active",
      primaryPhoto: photos[0] || null,
      photoCount: photos.length,
      freshnessLabel: formatRelativeDayLabel(toNumber(property.DaysOnMarket)),
      coordinates:
        toNumber(property.LMD_MP_Latitude) && toNumber(property.LMD_MP_Longitude)
          ? {
              lat: toNumber(property.LMD_MP_Latitude),
              lng: toNumber(property.LMD_MP_Longitude),
            }
          : null,
    },
  };
}

function serializePropertyDetail(property, extras = {}) {
  const summary = serializePropertySummary(property).summary;

  return {
    ...property,
    summary,
    media: {
      photos: parsePhotos(property.L_Photos),
    },
    schools: buildSchoolContext(property),
    commuteContext: buildCommuteContext(property),
    taxHistory: buildTaxHistory(property),
    priceHistory: buildPriceHistory(property),
    neighborhoodStats: extras.neighborhoodStats || null,
    relatedProperties: (extras.relatedProperties || []).map(serializePropertySummary),
    timeline: extras.timeline || [],
  };
}

module.exports = {
  serializePropertySummary,
  serializePropertyDetail,
};
