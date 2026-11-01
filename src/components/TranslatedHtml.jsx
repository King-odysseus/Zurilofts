import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslatedList } from '../i18n/useTranslated.js';

// Code blocks and scripts are not prose. Machine-translating them would produce
// nonsense at best and broken markup at worst, so their contents are left as
// written.
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE']);

function isInsideSkippedTag(node) {
  let element = node.parentElement;
  while (element) {
    if (SKIP_TAGS.has(element.tagName)) return true;
    // The HTML convention for "do not translate this", which Google's own
    // crawler and translator both honour.
    if (element.getAttribute('translate') === 'no') return true;
    element = element.parentElement;
  }
  return false;
}

// Matches the service's idea of a translatable string: real words, not the
// whitespace and punctuation nodes that separate elements.
function isProse(value) {
  return value.trim().length > 1 && /[a-zA-Z]/.test(value);
}

/**
 * The text nodes of an HTML document, in document order. Both the reading and
 * the writing pass walk in this same order, which is what keeps the translations
 * lined up with the nodes they came from.
 */
function textNodes(body) {
  const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node = walker.nextNode();
  while (node) {
    if (isProse(node.nodeValue ?? '') && !isInsideSkippedTag(node)) nodes.push(node);
    node = walker.nextNode();
  }
  return nodes;
}

/**
 * Renders HTML stored in the database - a guide body - with its prose
 * translated into the reader's language.
 *
 * The HTML is translated node by node rather than as one string, so tags,
 * attributes, links and inline formatting survive untouched and only the words
 * change. The page is readable at every moment: until the translations arrive
 * the original English is on screen, and if they never arrive it stays.
 */
function TranslatedHtml({ html, className }) {
  const segments = useMemo(() => {
    if (!html) return [];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return textNodes(doc.body).map((node) => node.nodeValue ?? '');
  }, [html]);

  const translated = useTranslatedList(segments);

  const rendered = useMemo(() => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nodes = textNodes(doc.body);
    nodes.forEach((node, i) => {
      const value = translated[i];
      if (value && value !== node.nodeValue) node.nodeValue = value;
    });
    return doc.body.innerHTML;
  }, [html, translated]);

  if (!html) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: rendered }} />;
}

TranslatedHtml.propTypes = {
  html: PropTypes.string,
  className: PropTypes.string,
};

export default TranslatedHtml;
