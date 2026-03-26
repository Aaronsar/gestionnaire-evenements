export default async function handler(req, res) {
  const { template, prenom, event_id } = req.query;
  if (!template) return res.status(400).send('Param\u00e8tre "template" requis. Ex: ?template=confirmation&prenom=Aaron');

  const firstName = prenom || 'Jean';
  const lastName = 'Dupont';

  // Map template aliases
  const templateMap = {
    'confirmation': 'confirmation',
    'j-7': 'j-7',
    'j-1': 'j-1',
    'j-0-matin': 'j-0-10h',
    'j-0-10h': 'j-0-10h',
    'j-0-5min': 'j-0-18h25',
    'j-0-18h25': 'j-0-18h25',
  };
  const type = templateMap[template];
  if (!type) {
    return res.status(400).send('Template invalide. Templates disponibles : confirmation, j-7, j-1, j-0-matin, j-0-5min');
  }

  // Load event data if event_id provided, otherwise use sample data
  let event = {
    name: 'Comment financer ses \u00e9tudes de Sant\u00e9 en Europe ?',
    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    event_time_end: '19:30',
    zoom_join_url: 'https://us02web.zoom.us/j/83013598154',
    location: 'Visioconference',
  };

  if (event_id) {
    try {
      const SUPABASE_URL = 'https://jhopwqpbaiyjfoggvcaf.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impob3B3cXBiYWl5amZvZ2d2Y2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTI2OTEsImV4cCI6MjA4ODYyODY5MX0.rz3TJZryPxEf3P5kQgpzQkwN9aF8_F4eo4F03CEYVPs';
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/events?select=*&id=eq.${event_id}&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const data = await resp.json();
      if (data && data.length > 0) event = data[0];
    } catch (e) { /* use sample data */ }
  }

  const html = buildEdumoveEmail(firstName, lastName, event, type);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).send(html);
}

function titleCase(s) { return s ? s.toLowerCase().replace(/(?:^|\s|-)\S/g, c => c.toUpperCase()) : ''; }
function ucfirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function fmtTimeRange(ev) {
  const d = new Date(ev.event_date);
  const s = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  return ev.event_time_end ? `De ${s} \u00e0 ${ev.event_time_end}` : `\u00c0 ${s}`;
}

function edumoveZoomBtn(url) {
  return `<div style="background:linear-gradient(135deg,#EC680A,#D45A00);border-radius:12px;padding:24px;margin:28px 0;text-align:center;"><p style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.9);margin:0 0 12px;font-weight:700;">Rejoindre le webinaire</p><a href="${url}" style="display:inline-block;background:#FFF;color:#EC680A!important;font-size:15px;font-weight:700;padding:14px 32px;border-radius:100px;text-decoration:none;">Rejoindre \u2192</a><p style="font-size:12px;color:rgba(255,255,255,0.6);margin:12px 0 0;word-break:break-all;">${url}</p></div>`;
}

function edumoveDetailTbl(ev, fn, ln) {
  const d = new Date(ev.event_date);
  const dateStr = ucfirst(d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' }));
  const timeDisp = fmtTimeRange(ev);
  return `<h2 style="font-family:'Inter',Arial,sans-serif;font-size:20px;color:#1B1D3A;margin:0 0 20px;padding-bottom:14px;border-bottom:2px solid rgba(236,104,10,0.2);font-weight:700;">D\u00e9tails du webinaire</h2><table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="padding:8px 16px 8px 0;vertical-align:top;width:50%;"><p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#615CA5;margin:0 0 4px;font-weight:700;">Webinaire</p><p style="font-size:16px;color:#1B1D3A;margin:0;font-weight:700;">${ev.name}</p></td><td style="padding:8px 0 8px 16px;vertical-align:top;width:50%;"><p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#615CA5;margin:0 0 4px;font-weight:700;">Date</p><p style="font-size:16px;color:#1B1D3A;margin:0;font-weight:700;">${dateStr}<br>${timeDisp}</p></td></tr><tr><td style="padding:8px 16px 8px 0;vertical-align:top;"><p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#615CA5;margin:0 0 4px;font-weight:700;">Format</p><p style="font-size:16px;color:#1B1D3A;margin:0;font-weight:700;">En ligne (Zoom)</p></td><td style="padding:8px 0 8px 16px;vertical-align:top;"><p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#615CA5;margin:0 0 4px;font-weight:700;">Participant</p><p style="font-size:16px;color:#1B1D3A;margin:0;font-weight:700;">${fn} ${ln}</p></td></tr></table>`;
}

function edumoveWrap(heroTitle, heroSub, preheader, body) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:#F5F5F7;font-family:'Inter',Arial,sans-serif;"><div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#F5F5F7;">${preheader}</div><table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;"><tr><td align="center" style="padding:24px 16px;"><div style="text-align:center;padding:28px 0 20px;background:#FFF;border-radius:16px 16px 0 0;max-width:640px;margin:0 auto;"><img src="https://www.edumove.fr/edumove-logo.svg" alt="Edumove" width="200" style="display:block;margin:0 auto;width:200px;"></div><table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;"><tr><td><div style="background:#1B1D3A;padding:32px 32px 40px;text-align:center;"><h1 style="font-family:'Inter',Arial,sans-serif;font-size:26px;line-height:1.2;color:#FFF;margin:0 0 16px;font-weight:700;">${heroTitle}</h1><p style="font-size:16px;line-height:1.65;color:rgba(255,255,255,0.72);max-width:440px;margin:0 auto;">${heroSub}</p><div style="width:48px;height:3px;background:#EC680A;margin:28px auto 0;border-radius:2px;"></div></div></td></tr><tr><td><div style="background:#FFF;padding:36px 32px;">${body}</div></td></tr><tr><td><div style="background:#1B1D3A;padding:40px 32px;text-align:center;border-radius:0 0 16px 16px;"><h2 style="font-family:'Inter',Arial,sans-serif;font-size:20px;color:#FFF;margin:0 0 12px;font-weight:700;">\u00c0 tr\u00e8s bient\u00f4t !</h2><p style="font-size:15px;line-height:1.65;color:rgba(255,255,255,0.65);margin:0 0 24px;">L'\u00e9quipe Edumove a h\u00e2te de vous retrouver.</p><a href="mailto:admissions@edumove.fr" style="display:inline-block;background:#EC680A;color:#FFF!important;font-size:15px;font-weight:700;padding:14px 32px;border-radius:100px;text-decoration:none;">Nous contacter \u2192</a><p style="margin-top:16px;font-size:11px;color:rgba(255,255,255,0.3);">Edumove</p></div></td></tr></table><p style="font-size:11px;color:#9A9A9A;text-align:center;margin:24px 0 0;">\u00a9 ${new Date().getFullYear()} Edumove</p></td></tr></table></body></html>`;
}

function buildEdumoveEmail(firstName, lastName, ev, type) {
  const fn = titleCase(firstName);
  const ln = titleCase(lastName);
  const zoomUrl = ev.zoom_join_url || 'https://us02web.zoom.us/j/83013598154';
  const zoomBlock = edumoveZoomBtn(zoomUrl);
  const details = edumoveDetailTbl(ev, fn, ln);
  const n = ev.name;

  const templates = {
    'confirmation': {
      heroT: `<span style="color:#EC680A;">Votre inscription</span><br>est confirm\u00e9e !`,
      heroS: `Merci pour votre inscription ! Votre lien de connexion Zoom se trouve ci-dessous.`,
      pre: `Inscription confirm\u00e9e \u2014 ${n}`,
      body: `<p style="font-size:16px;line-height:1.7;color:#3D4B5C;margin:0 0 24px;">Bonjour <strong style="color:#1B1D3A;">${fn}</strong>, merci pour votre inscription au webinaire <strong>${n}</strong> ! Nous avons h\u00e2te de vous y retrouver.</p>${details}${zoomBlock}<div style="background:rgba(97,92,165,0.1);border-left:4px solid #615CA5;border-radius:0 12px 12px 0;padding:20px 24px;"><p style="font-size:15px;line-height:1.7;color:#3D4B5C;margin:0;font-style:italic;">Gardez le <strong style="color:#1B1D3A;">lien Zoom</strong> ci-dessus \u00e0 port\u00e9e de main pour le jour J.</p></div>`,
    },
    'j-7': {
      heroT: `Plus que <span style="color:#EC680A;">7 jours</span><br>avant le webinaire !`,
      heroS: `Bloquez la date dans votre agenda !`,
      pre: `J-7 \u2014 ${n} approche !`,
      body: `<p style="font-size:16px;line-height:1.7;color:#3D4B5C;margin:0 0 24px;">Bonjour <strong style="color:#1B1D3A;">${fn}</strong>, le webinaire <strong>${n}</strong> a lieu dans une semaine. Bloquez la date dans votre agenda !</p>${details}`,
    },
    'j-1': {
      heroT: `C'est <span style="color:#EC680A;">demain</span> !`,
      heroS: `Pr\u00e9parez vos questions pour le webinaire !`,
      pre: `C'est demain \u2014 ${n}`,
      body: `<p style="font-size:16px;line-height:1.7;color:#3D4B5C;margin:0 0 24px;">Bonjour <strong style="color:#1B1D3A;">${fn}</strong>, c'est demain ! Le webinaire <strong>${n}</strong> vous attend. Pr\u00e9parez vos questions !</p>${zoomBlock}`,
    },
    'j-0-10h': {
      heroT: `C'est <span style="color:#EC680A;">aujourd'hui</span> !`,
      heroS: `Le webinaire va bient\u00f4t commencer !`,
      pre: `C'est aujourd'hui \u2014 ${n} !`,
      body: `<p style="font-size:16px;line-height:1.7;color:#3D4B5C;margin:0 0 24px;">Bonjour <strong style="color:#1B1D3A;">${fn}</strong>, c'est aujourd'hui ! Retrouvez-nous pour le webinaire <strong>${n}</strong>. Votre lien Zoom est ci-dessous.</p>${zoomBlock}`,
    },
    'j-0-18h25': {
      heroT: `\u00c7a commence dans <span style="color:#EC680A;">5 minutes</span> !`,
      heroS: `Connectez-vous vite !`,
      pre: `\u00c7a commence dans 5 minutes \u2014 ${n} !`,
      body: `<p style="font-size:16px;line-height:1.7;color:#3D4B5C;margin:0 0 24px;"><strong style="color:#1B1D3A;">${fn}</strong>, le webinaire <strong>${n}</strong> commence dans 5 minutes ! Cliquez sur le lien Zoom ci-dessous pour nous rejoindre.</p>${zoomBlock}`,
    },
  };

  const t = templates[type] || templates['confirmation'];
  return edumoveWrap(t.heroT, t.heroS, t.pre, t.body);
}
