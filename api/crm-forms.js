const CRM_FORMS_URL = 'https://hub.diploma-sante.fr/api/external/forms';

export default async function handler(req, res) {
  const apiKey = process.env.CRM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'CRM API key not configured', forms: [] });
  }

  if (req.method === 'GET') {
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

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (!body.name) {
        return res.status(400).json({ error: 'Missing required field: name' });
      }

      const resp = await fetch(CRM_FORMS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: body.name,
          title: body.title || body.name,
          folder: body.folder,
          brand: body.brand,
          event_type: body.event_type,
          status: 'published',
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return res.status(resp.status).json({ error: data.error || 'CRM create form failed' });
      }
      return res.status(201).json(data);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to create CRM form' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
