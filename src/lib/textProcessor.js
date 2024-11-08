import DOMPurify from 'dompurify';

class TextProcessor {
  // 数値変換用の対応表
  static numberMap = {
    kanji: ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'],
    unit: ['', '万', '億', '兆'],
    smallUnit: ['', '十', '百', '千']
  };

  constructor() {
    this.parser = new DOMParser();
    this.serializer = new XMLSerializer();
  }

  // メインの処理メソッド - HTMLからXHTMLへの変換と整形を行う
  convertToXhtml(html, title = 'Chapter') {
    // 安全なHTMLに浄化
    const cleanHtml = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'ruby', 'rt', 'rp', 'span', 'div', 'h1'],
      ALLOWED_ATTR: ['class']
    });

    // EPUB 3のXHTMLテンプレート
    const xhtmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ja">
  <head>
    <title>${this.escapeXml(title)}</title>
    <meta charset="UTF-8" />
    <link rel="stylesheet" type="text/css" href="style.css" />
  </head>
  <body>
  </body>
</html>`;

    // テンプレートをパース
    const doc = this.parser.parseFromString(xhtmlTemplate, 'application/xhtml+xml');

    // 浄化されたHTMLをパース
    const contentDoc = this.parser.parseFromString(cleanHtml, 'text/html');

    // タイトルを追加
    const titleElement = contentDoc.createElement('h1');
    titleElement.textContent = title;

    const breakParagraph = contentDoc.createElement('p');
    breakParagraph.innerHTML = '&nbsp;';  // 空の段落

    contentDoc.body.insertBefore(breakParagraph, contentDoc.body.firstChild);
    contentDoc.body.insertBefore(titleElement, contentDoc.body.firstChild);

    // ボディ内の全ノードを処理
    this.processNode(contentDoc.body);

    // 処理済みのコンテンツをXHTMLドキュメントに移植
    const processedNodes = Array.from(contentDoc.body.childNodes);
    processedNodes.forEach(node => {
      doc.body.appendChild(doc.importNode(node, true));
    });

    // 出力前にXHTMLの妥当性を確認
    if (doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid XHTML generated');
    }

    // シリアライズして返却
    return this.serializer.serializeToString(doc)
      // XML宣言を正しい形式に修正（必要な場合）
      .replace(/<\?xml[^>]*\?>/, '<?xml version="1.0" encoding="UTF-8"?>');
  }

  // ノードの再帰的な処理
  processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const fragments = this.createFragmentsFromText(text, node.ownerDocument);

      if (fragments.length === 1 && fragments[0].nodeType === Node.TEXT_NODE) {
        // 単純なテキスト置換の場合
        node.textContent = fragments[0].textContent;
      } else {
        // 複数のノードやspanを含む場合
        const parent = node.parentNode;
        fragments.forEach(fragment => {
          parent.insertBefore(fragment, node);
        });
        parent.removeChild(node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 段落の処理
      if (node.tagName.toLowerCase() === 'p') {
        if (!node.textContent.startsWith('　')) {
          const firstChild = node.firstChild;
          if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
            firstChild.textContent = '　' + firstChild.textContent;
          }
        }
      }

      // 子ノードを再帰的に処理
      Array.from(node.childNodes).forEach(child => this.processNode(child));
    }
  }

  // テキストからDOMフラグメントを生成
  createFragmentsFromText(text, doc) {
    const fragments = [];
    let currentPosition = 0;
    let lastIndex = 0;

    // 正規表現パターンを定義
    const patterns = [
      {
        // 3桁以上の数字（カンマ区切り含む）
        name: '3digit',
        pattern: /(?<![0-9０-９])([0-9０-９][0-9０-９,，、]*[0-9０-９])(?![0-9０-９])/g,
        validate: (match) => {
          // カンマを除いた数字が3桁以上あるか確認
          const digits = match[1].replace(/[,，、]/g, '');
          return digits.length >= 3;
        },
        process: (match) => {
          const normalized = match[1].replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
            .replace(/[,，、]/g, '、');
          return doc.createTextNode(
            normalized.split(/[、]/).map(part =>
              part.split('').map(digit => TextProcessor.numberMap.kanji[parseInt(digit)]).join('')
            ).join('、')
          );
        }
      },
      {
        // 2桁の数字
        name: '2digit',
        pattern: /(?<![0-9０-９])([0-9０-９]{2})(?![0-9０-９])/g,
        validate: () => true,
        process: (match) => {
          const normalized = match[1].replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
          const span = doc.createElement('span');
          span.className = 'tcy';
          span.textContent = normalized;
          return span;
        }
      },
      {
        // 1桁の数字
        name: '1digit',
        pattern: /(?<![0-9０-９])([0-9０-９])(?![0-9０-９])/g,
        validate: () => true,
        process: (match) => {
          const digit = match[1].replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
          return doc.createTextNode(String.fromCharCode(digit.charCodeAt(0) + 0xFEE0));
        }
      },
      {
        // 2連続の感嘆符・疑問符
        name: 'punctuation',
        pattern: /(?<![!?！？])([!?！？][!?！？])(?![!?！？])/g,
        validate: () => true,
        process: (match) => {
          const span = doc.createElement('span');
          span.className = 'tcy';
          span.textContent = match[1].replace(/[！？]/g, char => char === '！' ? '!' : '?');
          const nodes = [span];
          if (text[match.index + 2] !== '　') {
            nodes.push(doc.createTextNode('　'));
          }
          return nodes;
        }
      }
    ];

    while (currentPosition < text.length) {
      let bestMatch = null;
      let bestPattern = null;
      let bestPosition = text.length;

      // 各パターンで最も早い位置のマッチを探す
      for (const pattern of patterns) {
        pattern.pattern.lastIndex = currentPosition;
        const match = pattern.pattern.exec(text);
        if (match && match.index < bestPosition && pattern.validate(match)) {
          bestMatch = match;
          bestPattern = pattern;
          bestPosition = match.index;
        }
      }

      if (bestMatch) {
        // マッチ前のテキストを追加
        if (bestPosition > lastIndex) {
          fragments.push(doc.createTextNode(text.substring(lastIndex, bestPosition)));
        }

        // マッチしたパターンを処理
        const processed = bestPattern.process(bestMatch);
        if (Array.isArray(processed)) {
          fragments.push(...processed);
        } else {
          fragments.push(processed);
        }

        currentPosition = bestMatch.index + bestMatch[0].length;
        lastIndex = currentPosition;
      } else {
        currentPosition++;
      }
    }

    // 残りのテキストを追加
    if (lastIndex < text.length) {
      fragments.push(doc.createTextNode(text.substring(lastIndex)));
    }

    return fragments.length > 0 ? fragments : [doc.createTextNode(text)];
  }

  escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }
}

export default TextProcessor;
