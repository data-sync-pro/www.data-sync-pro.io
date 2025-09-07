const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/assets/data/faqs.json', 'utf8'));

// 重复项目的ID列表
const duplicateIds = new Set([
  'a0oEc000005Joi6IAC', 'a0oEc000005JoiDIAS', 'a0oEc000005JoiOIAS', 'a0oEc000005JoieIAC',
  'a0oEc000005JoiwIAC', 'a0oEc000005JoizIAC', 'a0oEc000005Joj7IAC', 'a0oEc000005Joj8IAC',
  'a0oEc000005JojLIAS', 'a0oEc000005JojjIAC', 'a0oEc000005JojnIAC', 'a0oEc000005JojqIAC'
]);

console.log('不重复项目的Answer__c字段前缀分析：');
console.log('=====================================');

const prefixPatterns = {};
data.forEach((item, index) => {
  if (duplicateIds.has(item.Id)) {
    return; // 跳过重复项目
  }
  
  const answer = item['Answer__c'];
  const category = item['Category__c'];
  const subcategory = item['SubCategory__c'] || '';
  
  // 分析前缀模式
  let prefix = '';
  if (answer.includes('-')) {
    const parts = answer.split('-');
    if (parts.length > 1) {
      prefix = parts[0];
    }
  }
  
  if (!prefixPatterns[prefix]) {
    prefixPatterns[prefix] = [];
  }
  prefixPatterns[prefix].push({
    id: item.Id,
    answer: answer,
    category: category,
    subcategory: subcategory,
    newAnswer: prefix ? answer.replace(new RegExp('^' + prefix + '-'), '') : answer
  });
});

Object.keys(prefixPatterns).sort().forEach(prefix => {
  console.log(`前缀 '${prefix}' (${prefixPatterns[prefix].length} 个文件):`);
  prefixPatterns[prefix].slice(0, 2).forEach(item => {
    console.log(`  原文件名: ${item.answer}`);
    console.log(`  新文件名: ${item.newAnswer}`);
    console.log(`  分类: ${item.category}/${item.subcategory}`);
    console.log('');
  });
  if (prefixPatterns[prefix].length > 2) {
    console.log(`  ... 还有 ${prefixPatterns[prefix].length - 2} 个`);
  }
  console.log('');
});