import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Using /tmp directory which is writable in serverless environments like Cloud Run
const MEMORY_FILE = '/tmp/mcp_memory.json';

function getMemory() {
    if (!fs.existsSync(MEMORY_FILE)) {
        return {};
    }
    const data = fs.readFileSync(MEMORY_FILE, 'utf-8');
    try {
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function saveMemory(data: any) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, key, value } = body;

    const memory = getMemory();

    if (action === 'save') {
        if (!key || !value) return NextResponse.json({ error: 'Key and Value are required to save' }, { status: 400 });
        memory[key] = value;
        saveMemory(memory);
        return NextResponse.json({ success: true, message: `Memory saved under key: ${key}` });
    } else if (action === 'recall') {
        if (!key) return NextResponse.json({ error: 'Key is required to recall' }, { status: 400 });
        
        // Exact match
        if (memory[key]) {
             return NextResponse.json({ result: memory[key] });
        }

        // Fuzzy match search (very basic RAG simulation)
        const possibleKeys = Object.keys(memory).filter(k => k.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(k.toLowerCase()));
        
        if (possibleKeys.length > 0) {
            return NextResponse.json({ 
                result: memory[possibleKeys[0]], 
                note: `Fuzzy matched key: ${possibleKeys[0]}` 
            });
        }

        return NextResponse.json({ result: "No memory found for that context." });
    }

    return NextResponse.json({ error: 'Invalid action. Use save or recall.' }, { status: 400 });
  } catch (error: any) {
    console.error("Memory Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
