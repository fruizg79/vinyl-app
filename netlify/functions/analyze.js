exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const key = process.env.ANTHROPIC_KEY;
    console.log("Key present:", !!key, "Key prefix:", key ? key.substring(0, 10) : "none");

    const body = JSON.parse(event.body);
    console.log("Request model:", body.model, "Messages:", body.messages?.length);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    console.log("Anthropic status:", response.status, "Response text:", text.substring(0, 200));

    return {
      statusCode: response.status,
      headers,
      body: text,
    };
  } catch (err) {
    console.log("Error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
