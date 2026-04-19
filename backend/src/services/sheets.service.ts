import { google } from 'googleapis';
import { Equipo } from '../types';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) return null;

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function appendEquipoToSheet(equipo: Equipo, tiendaNombre?: string): Promise<boolean> {
  const auth = getAuth();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Ingresos';

  if (!auth || !spreadsheetId) {
    console.warn('[Sheets] Google Sheets no configurado, omitiendo sincronización.');
    return false;
  }

  const sheets = google.sheets({ version: 'v4', auth });

  const row = [
    equipo.fechaIngreso,
    equipo.imei,
    equipo.modelo,
    equipo.clienteNombre,
    equipo.clienteTelefono ?? '',
    tiendaNombre ?? '',
    equipo.servicio,
    equipo.precio,
    equipo.estado,
    equipo.observaciones ?? '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return true;
}

export async function ensureSheetHeaders(): Promise<void> {
  const auth = getAuth();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Ingresos';

  if (!auth || !spreadsheetId) return;

  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:J1`,
  });

  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          'FechaHora', 'IMEI', 'Modelo', 'Cliente', 'Telefono',
          'Tienda', 'Servicio', 'Precio', 'Estado', 'Observaciones',
        ]],
      },
    });
  }
}
