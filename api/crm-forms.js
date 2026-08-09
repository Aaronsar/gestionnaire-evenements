const CRM_FORMS_URL = 'https://hub.diploma-sante.fr/api/external/forms';

export default async function handler(req, res) {
  const apiKey = process.env.CRM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'CRM API key not configured', forms: [] });
  }

  try {
    const resp = await fetch(CRM_FORMS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: data.error || 'CRM API error', forms: [] });
    }

    const all = Array.isArray(data) ? data : [];
    const forms = all.filter((f) => {
      if (f.formType === 'meta') return true;
      return f.status === 'published';
    });

    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ forms });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch CRM forms', forms: [] });
  }
}
