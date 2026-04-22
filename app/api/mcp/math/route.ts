import { NextResponse } from 'next/server';
import { create, all } from 'mathjs';

// Create a restricted mathjs instance
const math = create(all);
const limitedEvaluate = math.evaluate;

// Disable dangerous functions in the parser scope
math.import({
  'import':     function () { throw new Error('Function import is disabled') },
  'createUnit': function () { throw new Error('Function createUnit is disabled') },
  'evaluate':   function () { throw new Error('Function evaluate is disabled') },
  'parse':      function () { throw new Error('Function parse is disabled') },
  'simplify':   function () { throw new Error('Function simplify is disabled') },
  'derivative': function () { throw new Error('Function derivative is disabled') },
  'resolve':    function () { throw new Error('Function resolve is disabled') },
}, { override: true });

export async function POST(req: Request) {
  try {
    const { expression } = await req.json();
    if (!expression) return NextResponse.json({ error: 'Expression is required' }, { status: 400 });

    // Use the restricted evaluate function
    const result = limitedEvaluate(expression);
    
    return NextResponse.json({ result: result.toString() });
  } catch (error: any) {
    console.error("Math Evaluator Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
