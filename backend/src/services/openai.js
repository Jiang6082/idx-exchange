const { serializePropertySummary } = require("../utils/propertyTransforms");

async function callOpenAIJson({ systemPrompt, userPrompt, schemaHint }) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      input: [
        { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
        {
          role: "user",
          content: [{ type: "input_text", text: `${userPrompt}\n\nReturn JSON matching: ${schemaHint}` }],
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "OpenAI request failed");
  }

  const payload = await response.json();
  const outputText =
    payload.output_text ||
    payload.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text ||
    "{}";

  return JSON.parse(outputText);
}

function heuristicSearchFilters(message) {
  const text = String(message || "").toLowerCase();
  const filters = {};

  const cityMatch = text.match(
    /\b(pasadena|beverly hills|los angeles|alhambra|calabasas|mission viejo|laguna niguel|laguna beach|san juan capistrano)\b/
  );
  if (cityMatch) {
    filters.city = cityMatch[1]
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  const bedsMatch = text.match(/(\d+)\s*[-+ ]?\s*bed/);
  if (bedsMatch) {
    filters.beds = bedsMatch[1];
  }

  const bathsMatch = text.match(/(\d+(\.\d+)?)\s*[-+ ]?\s*bath/);
  if (bathsMatch) {
    filters.baths = bathsMatch[1];
  }

  const underMatch = text.match(/under\s+\$?([\d,.]+)\s*(m|million|k|thousand)?/);
  if (underMatch) {
    let value = Number(String(underMatch[1]).replace(/,/g, ""));
    if (underMatch[2]?.startsWith("m")) value *= 1000000;
    if (underMatch[2]?.startsWith("k") || underMatch[2] === "thousand") value *= 1000;
    filters.maxPrice = String(Math.round(value));
  }

  const minMatch = text.match(/over\s+\$?([\d,.]+)\s*(m|million|k|thousand)?/);
  if (minMatch) {
    let value = Number(String(minMatch[1]).replace(/,/g, ""));
    if (minMatch[2]?.startsWith("m")) value *= 1000000;
    if (minMatch[2]?.startsWith("k") || minMatch[2] === "thousand") value *= 1000;
    filters.minPrice = String(Math.round(value));
  }

  return filters;
}

async function generateSearchFilters(message) {
  try {
    const parsed = await callOpenAIJson({
      systemPrompt:
        "Convert natural-language home search requests into listing filters for a real estate app.",
      userPrompt: message,
      schemaHint:
        '{ "q": "", "city": "", "zipcode": "", "minPrice": "", "maxPrice": "", "beds": "", "baths": "", "reasoning": "" }',
    });
    return parsed;
  } catch (error) {
    return {
      ...heuristicSearchFilters(message),
      reasoning: "Heuristic fallback used because OpenAI is not configured or unavailable.",
    };
  }
}

async function explainProperty(property) {
  const summary = serializePropertySummary(property).summary;

  try {
    const parsed = await callOpenAIJson({
      systemPrompt:
        "Summarize a property listing in plain language for buyers. Keep it concise and practical.",
      userPrompt: JSON.stringify({
        address: summary.address,
        city: summary.city,
        price: summary.priceLabel,
        beds: summary.beds,
        baths: summary.baths,
        sqft: summary.sqft,
        status: summary.status,
        remarks: property.L_Remarks || "",
      }),
      schemaHint: '{ "headline": "", "summary": "", "watchouts": "" }',
    });
    return parsed;
  } catch (error) {
    return {
      headline: "Quick property read",
      summary: `${summary.address} is a ${summary.beds || "multi"}-bed listing in ${
        summary.city || "the area"
      } priced at ${summary.priceLabel || "N/A"}.`,
      watchouts: "Review recent price changes, days on market, and lot condition before touring.",
    };
  }
}

module.exports = {
  generateSearchFilters,
  explainProperty,
};
