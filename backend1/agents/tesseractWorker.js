// Isolated Tesseract worker — runs in a child process so crashes don't kill the server
const Tesseract = require("tesseract.js");

const filePath = process.argv[2];
if (!filePath) {
  process.send({ error: "No file path provided" });
  process.exit(1);
}

(async () => {
  try {
    const result = await Tesseract.recognize(filePath, "eng");
    const text = result.data?.text || "";
    process.send({ text });
  } catch (err) {
    process.send({ error: err.message || "Tesseract failed" });
  }
  process.exit(0);
})();
