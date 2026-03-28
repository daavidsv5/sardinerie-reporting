import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function POST() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const scriptDir = path.join(process.cwd(), 'scripts');

  return new Promise<NextResponse>((resolve) => {
    exec('node updateData.js', { cwd: scriptDir }, (err, stdout, stderr) => {
      if (!err) {
        resolve(NextResponse.json({ ok: true, log: stdout }));
      } else {
        resolve(
          NextResponse.json({ ok: false, log: stderr || stdout }, { status: 500 })
        );
      }
    });
  });
}
