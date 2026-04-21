import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing python code' }, { status: 400 });
    }

    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: 'python',
        version: '*',
        files: [
          {
            content: code
          }
        ]
      })
    });

    const data = await res.json();
    
    if (data.compile?.stderr) {
       return NextResponse.json({ error: data.compile.stderr, stdout: data.run?.stdout, stderr: data.run?.stderr });
    }
    
    return NextResponse.json({ 
      stdout: data.run?.stdout,
      stderr: data.run?.stderr,
      code: data.run?.code
    });

  } catch (error: any) {
    console.error('Python Sandbox Error:', error);
    return NextResponse.json({ error: 'Execution failed: ' + error.message }, { status: 500 });
  }
}
