const fs = require('fs');
const path = require('path');

// Read the faqs.json file
const faqsData = JSON.parse(fs.readFileSync('src/assets/data/faqs.json', 'utf8'));

// Create output directory
const outputDir = 'extracted-faq-data';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Extract Question__c and Answer__c to separate files
faqsData.forEach((faq, index) => {
    const sanitizedId = faq.Id.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${index + 1}_${sanitizedId}`;
    
    // Create a text file with both question and answer
    const content = `ID: ${faq.Id}
Question: ${faq.Question__c}
Answer: ${faq.Answer__c}
Category: ${faq.Category__c}
SubCategory: ${faq.SubCategory__c || 'N/A'}
IsActive: ${faq.isActive}
`;
    
    fs.writeFileSync(path.join(outputDir, `${fileName}.txt`), content, 'utf8');
});

// Also create a summary CSV file
const csvHeaders = 'ID,Question__c,Answer__c,Category__c,SubCategory__c,isActive\n';
const csvContent = faqsData.map(faq => {
    return `"${faq.Id}","${faq.Question__c.replace(/"/g, '""')}","${faq.Answer__c}","${faq.Category__c}","${faq.SubCategory__c || ''}","${faq.isActive}"`;
}).join('\n');

fs.writeFileSync(path.join(outputDir, 'faqs_summary.csv'), csvHeaders + csvContent, 'utf8');

console.log(`Successfully extracted ${faqsData.length} FAQ items to ${outputDir} folder`);
console.log(`Generated ${faqsData.length} individual text files and 1 CSV summary file`);