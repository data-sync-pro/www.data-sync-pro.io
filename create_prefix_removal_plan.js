const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/assets/data/faqs.json', 'utf8'));

// 重复项目的ID列表
const duplicateIds = new Set([
  'a0oEc000005Joi6IAC', 'a0oEc000005JoiDIAS', 'a0oEc000005JoiOIAS', 'a0oEc000005JoieIAC',
  'a0oEc000005JoiwIAC', 'a0oEc000005JoizIAC', 'a0oEc000005Joj7IAC', 'a0oEc000005Joj8IAC',
  'a0oEc000005JojLIAS', 'a0oEc000005JojjIAC', 'a0oEc000005JojnIAC', 'a0oEc000005JojqIAC'
]);

// 定义更智能的前缀去除规则
const prefixRules = {
  'general-': '',
  'batch-': '',
  'data-list-': '',
  'data-loader-': '',
  'action-button-': '',
  'triggers-': '', // triggers前缀
  'transformation-': '',
  'query-manager-': '',
  'retrieve-': '',
  'preview-': '',
  'input-': '',
  'scoping-': '',
  'mapping-': '',
  'match-': '',
  'action-': '',
  'verify-': ''
};

console.log('智能前缀去除计划：');
console.log('================');

const processItems = [];
data.forEach((item, index) => {
  if (duplicateIds.has(item.Id)) {
    return; // 跳过重复项目
  }
  
  const answer = item['Answer__c'];
  let newAnswer = answer;
  let appliedRule = '';
  
  // 查找匹配的前缀规则
  for (const [prefix, replacement] of Object.entries(prefixRules)) {
    if (answer.startsWith(prefix)) {
      newAnswer = replacement + answer.substring(prefix.length);
      appliedRule = prefix;
      break;
    }
  }
  
  if (appliedRule) {
    processItems.push({
      id: item.Id,
      originalAnswer: answer,
      newAnswer: newAnswer,
      prefix: appliedRule,
      category: item['Category__c'],
      subcategory: item['SubCategory__c'] || ''
    });
  }
});

console.log(`需要处理的项目数量: ${processItems.length}`);
console.log('');

// 按前缀分组显示
const groupedByPrefix = {};
processItems.forEach(item => {
  if (!groupedByPrefix[item.prefix]) {
    groupedByPrefix[item.prefix] = [];
  }
  groupedByPrefix[item.prefix].push(item);
});

Object.keys(groupedByPrefix).sort().forEach(prefix => {
  const items = groupedByPrefix[prefix];
  console.log(`前缀 '${prefix}' (${items.length} 个文件):`);
  items.slice(0, 2).forEach(item => {
    console.log(`  ${item.originalAnswer} → ${item.newAnswer}`);
  });
  if (items.length > 2) {
    console.log(`  ... 还有 ${items.length - 2} 个`);
  }
  console.log('');
});

// 保存处理计划到文件
fs.writeFileSync('prefix_removal_plan.json', JSON.stringify(processItems, null, 2));
console.log('处理计划已保存到 prefix_removal_plan.json');