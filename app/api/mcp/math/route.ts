import { NextResponse } from 'next/server';
import { evaluate } from 'mathjs';

export async function POST(req: Request) {
  try {
    const { expression } = await req.json();
    if (!expression) return NextResponse.json({ error: 'Expression is required' }, { status: 400 });

    // Evaluate the math expression safely using mathjs
    const result = evaluate(expression);
    
    return NextResponse.json({ result: result.toString() });
  } catch (error: any) {
    console.error("Math Evaluator Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
