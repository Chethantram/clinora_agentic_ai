const { processUploadedDocument } = require('./agents/ocrAgent');
const fs = require('fs');

async function runTest() {
  const text = `
    Pa+i3nt N@me: ?0hn Do3
    Symptoms: Cl3ar fever and ch!lls
    Medications: Tylen0l 500m9
    Diagnosis: C0mm0n C0ld
    Blood Pressure: ?20/80 (hard to read)
    HbA1c: 5.6
  `;
  
  fs.writeFileSync('test_ambiguous.txt', text);
  
  console.log("Running OCR processing on highly ambiguous file...");
  const result = await processUploadedDocument('test_ambiguous.txt');
  
  console.log("\nSuccess:", result.success);
  if (result.structured) {
    console.log("\nExtracted Data:");
    for (const [key, value] of Object.entries(result.structured)) {
       if (key === 'confidence_scores' || key === 'raw_text') continue;
       console.log(`- ${key}: ${JSON.stringify(value)}`);
    }
    
    console.log("\nConfidence Scores:");
    if (result.structured.confidence_scores) {
      for (const [key, score] of Object.entries(result.structured.confidence_scores)) {
        const flag = score < 0.75 ? "⚠️ LOW" : "✅ OK";
        console.log(`- ${key}: ${score} [${flag}]`);
      }
    } else {
      console.log("No confidence scores returned!");
    }
  } else {
    console.log("No structured data returned.");
  }
  
  fs.unlinkSync('test_ambiguous.txt');
}

runTest();
