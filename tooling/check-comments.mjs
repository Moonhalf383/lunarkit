import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import ts from 'typescript';

let failures = 0;

// 输出带文件位置的规范错误。
function report(path, line, message) {
  console.error(`${path}:${line + 1}: ${message}`);
  failures += 1;
}

// 检查中文单行注释及其对应的函数或变量声明。
function checkScript(path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const lines = source.split('\n');
  const allowedCommentLines = new Set();
  const comments = new Map();

  // 遍历语法树并收集需要注释的声明位置。
  function visit(node) {
    const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line;
    const isFunction = ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
      || ts.isArrowFunction(node) || ts.isMethodDeclaration(node)
      || ts.isConstructorDeclaration(node) || ts.isGetAccessorDeclaration(node)
      || ts.isSetAccessorDeclaration(node);
    const isVariable = ts.isVariableStatement(node);
    if (isFunction || isVariable || ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      allowedCommentLines.add(line - 1);
      if (!isVariable && !/^\s*\/\/.*[\u3400-\u9fff]/u.test(lines[line - 1] ?? '')) {
        report(path, line, '函数和类前需要一行扼要的中文注释');
      }
    }
    const ranges = [
      ...(ts.getLeadingCommentRanges(source, node.getFullStart()) ?? []),
      ...(ts.getTrailingCommentRanges(source, node.end) ?? []),
    ];
    for (const range of ranges) comments.set(range.pos, range);
    ts.forEachChild(node, visit);
  }

  visit(file);
  for (const range of comments.values()) {
    const line = file.getLineAndCharacterOfPosition(range.pos).line;
    const text = source.slice(range.pos, range.end);
    if (range.kind !== ts.SyntaxKind.SingleLineCommentTrivia
      || !/^\s*\/\//u.test(lines[line] ?? '')
      || !/[\u3400-\u9fff]/u.test(text)
      || !allowedCommentLines.has(line)) {
      report(path, line, '只允许紧邻函数、类或需说明变量的中文单行注释');
    }
  }
}

// 按目录递归检查实现、测试与工具代码。
function checkDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      checkDirectory(path);
      continue;
    }
    const source = readFileSync(path, 'utf8');
    const extension = extname(path);
    if (['.ts', '.js', '.mjs'].includes(extension)) checkScript(path, source);
    if ((extension === '.css' && source.includes('/*'))
      || (extension === '.html' && source.includes('<!--'))) {
      report(path, 0, '样式和 HTML 中禁止注释');
    }
  }
}

for (const directory of ['src', 'example/example1/src', 'example/example2/src', 'example/example3/src', 'example/example4/src', 'tests', 'tooling']) checkDirectory(directory);
checkScript('eslint.config.js', readFileSync('eslint.config.js', 'utf8'));
if (failures > 0) process.exitCode = 1;
else console.log('中文注释规范检查通过');
