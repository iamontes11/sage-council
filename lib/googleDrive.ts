import { google } from 'googleapis';
import { Readable } from 'stream';
import { getGoogleRefreshToken } from './supabase';

const ROOT_FOLDER_NAME = 'Periódico';

function monthFolderName(dateISO: string): string {
  return dateISO.slice(0, 7); // 'YYYY-MM'
}

function fileName(dateISO: string): string {
  return `${dateISO}.png`;
}

async function getDriveClient(userEmail: string) {
  const refreshToken = await getGoogleRefreshToken(userEmail);
  if (!refreshToken) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

type Drive = NonNullable<Awaited<ReturnType<typeof getDriveClient>>>;

async function findOrCreateFolder(drive: Drive, name: string, parentId?: string): Promise<string> {
  const parentClause = parentId ? `and '${parentId}' in parents` : "and 'root' in parents";
  const res = await drive.files.list({
    q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false ${parentClause}`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  const existing = res.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  });
  if (!created.data.id) throw new Error(`No se pudo crear la carpeta "${name}" en Drive`);
  return created.data.id;
}

async function findFile(drive: Drive, name: string, parentId: string): Promise<string | null> {
  const res = await drive.files.list({
    q: `name = '${name}' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  return res.data.files?.[0]?.id || null;
}

/**
 * Archives today's periódico PNG to the user's own Drive, under
 * "Periódico/YYYY-MM/YYYY-MM-DD.png" — creating folders as needed.
 * Returns null (never throws) if the user hasn't granted Drive access yet,
 * so a missing OAuth grant never breaks the main generation flow.
 */
export async function uploadOraculoPngToDrive(
  userEmail: string,
  dateISO: string,
  png: Buffer,
): Promise<{ fileId: string; webViewLink: string } | null> {
  const drive = await getDriveClient(userEmail);
  if (!drive) return null;

  const rootId = await findOrCreateFolder(drive, ROOT_FOLDER_NAME);
  const monthId = await findOrCreateFolder(drive, monthFolderName(dateISO), rootId);
  const name = fileName(dateISO);

  const media = { mimeType: 'image/png', body: bufferToStream(png) };
  const existingId = await findFile(drive, name, monthId);

  const fileId = existingId
    ? (await drive.files.update({ fileId: existingId, media, fields: 'id, webViewLink' })).data.id
    : (
        await drive.files.create({
          requestBody: { name, parents: [monthId] },
          media,
          fields: 'id, webViewLink',
        })
      ).data.id;

  if (!fileId) throw new Error('Drive no devolvió un fileId al subir el periódico');

  const meta = await drive.files.get({ fileId, fields: 'id, webViewLink' });
  return { fileId, webViewLink: meta.data.webViewLink || '' };
}

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer);
}
