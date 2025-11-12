// lib/datocms.js
const DATOCMS_ENDPOINT = 'https://graphql.datocms.com/';

export async function datoFetch(query, variables = {}) {
  const res = await fetch(DATOCMS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DATOCMS_READONLY_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (!res.ok || json.errors) {
    // surface helpful message during dev
    const message = (json && json.errors && JSON.stringify(json.errors, null, 2)) || res.statusText;
    throw new Error(`DatoCMS GraphQL Error: ${message}`);
  }

  return json.data;
}

