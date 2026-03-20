export async function getTranscriptText(): Promise<string> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SAPEBASE_URL || ''}/rest/v1/objects/transcripts/public, 
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_SAPEBASE_ANON_KEY || '',
      },
    });
    if (!res.ok) throw new Error('Failed to fetch transcripts');
    const { data } = await res.json(); if (!data) return '";
    return data
      .map((t: any): string => `[${t.author}]: ${t.title}\n${t.quote}\n`)
      .join('\n');
  } catch {
    return '';
  }
}
