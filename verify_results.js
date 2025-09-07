const fs = require('fs');
const path = require('path');

// 读取更新后的faqs.json
const data = JSON.parse(fs.readFileSync('src/assets/data/faqs.json', 'utf8'));
const faqItemDir = 'src/assets/faq-item';

console.log('验证FAQ前缀去除结果...');
console.log('==============================');

let totalItems = 0;
let duplicateItems = 0;
let matchingFiles = 0;
let missingFiles = 0;
let prefixStillExists = 0;

// 重复项目的ID列表
const duplicateIds = new Set([
  'a0oEc000005Joi6IAC', 'a0oEc000005JoiDIAS', 'a0oEc000005JoiOIAS', 'a0oEc000005JoieIAC',
  'a0oEc000005JoiwIAC', 'a0oEc000005JoizIAC', 'a0oEc000005Joj7IAC', 'a0oEc000005Joj8IAC',
  'a0oEc000005JojLIAS', 'a0oEc000005JojjIAC', 'a0oEc000005JojnIAC', 'a0oEc000005JojqIAC'
]);

// 检查前缀是否仍然存在的模式
const prefixPatterns = [
  'general-', 'batch-', 'data-list-', 'data-loader-', 'action-button-', 
  'trigger-', 'triggers-', 'transformation-', 'query-manager-', 'retrieve-', 
  'preview-', 'input-', 'scoping-', 'mapping-', 'match-', 'action-', 'verify-'
];

data.forEach(item => {
  totalItems++;
  
  if (duplicateIds.has(item.Id)) {
    duplicateItems++;
    console.log(`重复项目 (保持不变): ${item.Id} - ${item['Answer__c']}`);
    return;
  }
  
  const answer = item['Answer__c'];
  const filePath = path.join(faqItemDir, answer);
  
  // 检查是否仍有前缀
  const hasPrefix = prefixPatterns.some(prefix => answer.startsWith(prefix));
  if (hasPrefix) {
    prefixStillExists++;
    console.log(`⚠ 仍有前缀: ${item.Id} - ${answer}`);
  }
  
  // 检查对应的HTML文件是否存在
  if (fs.existsSync(filePath)) {
    matchingFiles++;
  } else {
    missingFiles++;
    console.log(`✗ 文件缺失: ${answer}`);
  }
});

console.log('\n验证结果摘要:');
console.log('==============');
console.log(`总FAQ项目数: ${totalItems}`);
console.log(`重复项目数 (保持不变): ${duplicateItems}`);
console.log(`不重复项目数: ${totalItems - duplicateItems}`);
console.log(`仍有前缀的项目: ${prefixStillExists}`);
console.log(`匹配的HTML文件: ${matchingFiles}`);
console.log(`缺失的HTML文件: ${missingFiles}`);

if (prefixStillExists === 0 && missingFiles === 0) {
  console.log('\n✅ 验证成功！所有不重复的FAQ项目前缀都已去除，HTML文件都已正确重命名。');
} else {
  console.log('\n⚠ 验证发现问题，请检查上述输出。');
}