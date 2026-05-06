import { getSessionFromRequest, jsonResponse } from './_lib/auth.js';

let cachedContacts = null;

export async function GET(request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonResponse({ ok: false, error: 'Authentification requise.' }, { status: 401 });
  }

  try {
    const contacts = loadContacts();
    return jsonResponse(
      {
        ok: true,
        contacts
      },
      {
        headers: {
          'cache-control': 'no-store'
        }
      }
    );
  } catch (error) {
    console.error('contacts api failed', error);
    return jsonResponse({ ok: false, error: 'Chargement des contacts impossible.' }, { status: 500 });
  }
}

function loadContacts() {
  if (cachedContacts) {
    return cachedContacts;
  }

  const raw = process.env.CAPB_CONTACTS_JSON;
  if (!raw) {
    throw new Error('CAPB_CONTACTS_JSON is not configured');
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('CAPB_CONTACTS_JSON is invalid');
  }

  cachedContacts = parsed;
  return cachedContacts;
}
