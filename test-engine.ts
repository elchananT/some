import { researchTopic, brainstormOutline, generateContentPage, generateSVGIllustration } from './lib/ai';

async function testEngine() {
  console.log("🚀 Starting Engine Stress Test...");
  
  try {
    console.log("📡 Phase 1: Researching topic 'Modern Physics'...");
    const research = await researchTopic("Modern Physics", "High School", "UK");
    console.log("✅ Research Success. Sample:", research.substring(0, 100) + "...");

    console.log("🧠 Phase 2: Brainstorming outline...");
    const outline = await brainstormOutline("Modern Physics", "High School", research);
    console.log("✅ Outline Success. Title:", outline.title);
    console.log("Pages:", outline.pages.map((p: any) => p.title).join(", "));

    console.log("✍️ Phase 3: Generating Content Page for 'Introduction to Quantum Mechanics'...");
    const content = await generateContentPage("Introduction to Quantum Mechanics", "Understand wave-particle duality", "content", research);
    console.log("✅ Content Success. Output Length:", content.length);

    console.log("🎨 Phase 4: Generating SVG Illustration...");
    const svg = await generateSVGIllustration("Quantum Atom", "A stylized representation of an atom with electron clouds", "minimal", "Cold Ocean");
    console.log("✅ SVG Success. SVG Code starts with:", svg.substring(0, 50));

    console.log("\n🏆 ENGINE AUDIT COMPLETE: ALL SYSTEMS NOMINAL.");
  } catch (error) {
    console.error("❌ ENGINE FAILURE DETECTED:", error);
  }
}

// Running the test
testEngine();
