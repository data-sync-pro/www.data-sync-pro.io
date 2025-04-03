const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const FAQS_JSON_PATH = path.join(
  __dirname,
  "src",
  "assets",
  "data",
  "faqs.json"
);

function toKebabCase(answerValue) {
  let kebab = answerValue.replace(/\.html$/i, "");
  kebab = kebab.replace(/[\s_]+/g, "-");
  kebab = kebab.toLowerCase();

  return kebab;
}

function createFaqComponent(record) {
  const { Id, Question__c, Answer__c, Category__c, SubCategory__c } = record;

  const componentName = toKebabCase(Answer__c);

  const generateCmd = `ng generate component faq/faq-item/${componentName} \
    --flat=false \
    --skip-tests \
    --inline-style=false \
    --inline-template=false`;

  console.log(`\n--- Generating component for: "${Question__c}"`);
  console.log(`CLI Command: ${generateCmd}`);

  execSync(generateCmd, { stdio: "inherit" });

  const htmlFilePath = path.join(
    __dirname,
    "src",
    "app",
    "faq",
    "faq-item",
    componentName,
    `${componentName}.component.html`
  );

  const placeholderHtml = `
    <!-- Auto-generated for FAQ: ${Id} -->
    <h1>${Question__c}</h1>
    <p><strong>Category:</strong> ${Category__c || ""}</p>
    <p><strong>SubCategory:</strong> ${SubCategory__c || ""}</p>
    <p><strong>Original Filename:</strong> ${Answer__c}</p>
    <hr/>
    <p>Replace this placeholder with real FAQ content.</p>
  `.trim();

  fs.writeFileSync(htmlFilePath, placeholderHtml, "utf8");
  console.log(`✔ Overwrote: ${htmlFilePath}`);
}

function main() {
  const rawData = fs.readFileSync(FAQS_JSON_PATH, "utf8");
  const faqs = JSON.parse(rawData);

  faqs.forEach((faq) => {
    createFaqComponent(faq);
  });

  console.log("\nAll FAQ components have been generated in kebab-case!\n");
}

main();
