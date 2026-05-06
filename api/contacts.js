import { readFile } from 'node:fs/promises';
import { getSessionFromRequest, jsonResponse } from './_lib/auth.js';

let cachedContacts = null;

export async function GET(request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonResponse({ ok: false, error: 'Authentification requise.' }, { status: 401 });
  }

  try {
    const contacts = await loadContacts();
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

async function loadContacts() {
  if (cachedContacts) {
    return cachedContacts;
  }

  const fileUrl = new URL('../data/contacts.json', import.meta.url);
  const raw = await readFile(fileUrl, 'utf-8');
  cachedContacts = JSON.parse(raw);
  return cachedContacts;
}
