import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
const codec = new SvgCodec();
const wrap = (content: string, attributes = 'width="400" height="300"') => `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}>${content}</svg>`;

test('all six types, nested order, styles and Chinese text round-trip as a document', () => {
  const source = wrap('<g id="g" fill="blue"><rect id="r" x="1" y="2" width="3" height="4"/><circle id="c" r="5"/><ellipse id="e" rx="3" ry="4"/><line id="l" x2="10" stroke="black"/><text id="t" x="20" y="40">开始 &amp; &lt;结束&gt;</text></g>');
  const first = codec.decode(source); assert.deepEqual(first.warnings, []);
  const output = codec.encode(first.document);
  assert.match(output, /<text id="t" x="20" y="40">开始 &amp; &lt;结束&gt;<\/text>/);
  assert.equal(codec.encode(codec.decode(output).document), output);
  assert.equal(first.document.find('r').attributes.fill, undefined);
  assert.equal(first.document.find('t').parent?.id, 'g');
});

test('missing IDs reserve all explicit future IDs and warnings follow document order', () => {
  const decoded = codec.decode(wrap('<rect/><g><rect/><text>字</text></g><rect id="rect1"/><g id="g1"/><circle/>'));
  assert.deepEqual(decoded.warnings, [
    'warning: assigned id rect2 to unnamed <rect>', 'warning: assigned id g2 to unnamed <g>',
    'warning: assigned id rect3 to unnamed <rect>', 'warning: assigned id text1 to unnamed <text>',
    'warning: assigned id circle1 to unnamed <circle>',
  ]);
  assert.deepEqual([...decoded.document.descendants()].map((s) => s.id), ['rect2', 'g2', 'rect3', 'text1', 'rect1', 'g1', 'circle1']);
});

test('XML escaping preserves special characters, control whitespace, emoji and empty text', () => {
  const document = new SvgDocument(); const factory = new ShapeFactory();
  document.add(factory.create('text', 't&"<>', { text: '开始 😀 \u0085 &<>"\'\r\n\t' }));
  document.add(factory.create('text', 'empty', { text: '' }));
  document.add(factory.create('rect', 'r', { fill: 'a\tb\nc\r&"<>' }));
  const restored = codec.decode(codec.encode(document)).document;
  assert.equal(restored.find('t&"<>').text, document.find('t&"<>').text);
  assert.equal(restored.find('r').attributes.fill, document.find('r').attributes.fill);
  assert.equal(restored.find('empty').text, '');
});

test('comments, CDATA, prefixed SVG and dimensions from an identity viewBox are supported', () => {
  const decoded = codec.decode('<s:svg xmlns:s="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><!-- note --><s:text id="t"><![CDATA[开始 <结束>]]></s:text></s:svg>');
  assert.equal(decoded.document.width, 400); assert.equal(decoded.document.height, 300);
  assert.equal(decoded.document.find('t').text, '开始 <结束>');
  assert.equal(codec.decode('<svg width="10" height="20"><rect id="r"/></svg>').document.size, 1);
});

test('translate and positive uniform geometry scale compose in SVG order across nested groups', () => {
  const document = codec.decode(wrap('<g id="g" transform="translate(60,40) scale(2)"><g id="inner" transform="translate(10,5)"><rect id="r" x="1" y="2" width="3" height="4"/></g></g>')).document;
  assert.deepEqual(document.find('r').attributes, { id: 'r', x: '82', y: '54', width: '6', height: '8' });
  assert.equal(document.find('g').attributes.transform, undefined);
  const translatedText = codec.decode(wrap('<g id="g" transform="translate(10,20)"><text id="t" x="1" y="2">字</text><line id="l" stroke="red" x1="1"/></g>')).document;
  assert.equal(translatedText.find('t').attributes.x, '11');
  assert.equal(translatedText.find('l').attributes.y1, '20');
});

test('malformed XML, duplicate IDs and unsupported elements or attributes fail explicitly', () => {
  for (const source of [
    '<svg width="10" height="10"><g></svg>', '<svg width="10" height="10"><rect x="1" x="2"/></svg>',
    wrap('<rect id="same"/><circle id="same"/>'), wrap('<path id="p" d="M0 0"/>'),
    wrap('<rect style="fill:red"/>'), '<svg width=10 height="20"/>',
    '<?xml version="1.1"?><svg width="10" height="20"/>',
    '<?xml version="1.0" encoding="ISO-8859-1"?><svg width="10" height="20"/>', wrap('<text font-size="bad">word</text>'),
    wrap('<text><tspan>word</tspan></text>'), wrap('<g>unexpected</g>'), wrap('unexpected'),
    wrap('<rect xmlns="urn:other"/>'), wrap('<g xmlns=""/>'), wrap('<text text="bad">real</text>'),
    '<html/>', '<svg/>', wrap('', 'width="400" height="300" viewBox="0 0 800 600"'),
    wrap('', 'width="400" height="300" viewBox="1 0 400 300"'),
    wrap('', 'width="0" height="300"'), wrap('<circle r="-1"/>'),
    wrap('<text>&unknown;</text>'), wrap('<text>&#0;</text>'),
    '<?xml-stylesheet href="style.css"?>'+wrap(''), wrap('<?style x?>'),
    '<!DOCTYPE svg [<!ENTITY x "value">]>'+wrap('<text>&x;</text>'),
  ]) assert.throws(() => codec.decode(source), /invalid SVG:/, source);
});

test('transforms that cannot preserve appearance are rejected rather than silently lost', () => {
  for (const content of [
    '<rect transform="rotate(30)"/>', '<rect transform="scale(2,3)"/>',
    '<rect transform="scale(0)"/>', '<rect transform="translate(1,,2)"/>',
  ]) assert.throws(() => codec.decode(wrap(content)), /invalid SVG:/);
});

test('invalid XML output characters fail before serialization', () => {
  const document = new SvgDocument();
  document.add(new ShapeFactory().create('text', 't', { text: 'bad\u0000text' }));
  assert.throws(() => codec.encode(document), /invalid XML character/);
});

test('scaled text and strokes retain inherited font size, anchor and stroke width on round-trip', () => {
  const source = wrap('<g id="g" font-size="20px" text-anchor="middle" stroke="red" stroke-width="3" transform="translate(60,40) scale(2)"><text id="t" x="1" y="2" font-size="150%">开始</text><line id="l" x2="10"/><g id="inner" transform="scale(0.5)" font-size="2em"><text id="u" font-size="inherit">结束</text></g></g>');
  const document = codec.decode(source).document;
  assert.equal(document.find('t').attributes['font-size'], '60');
  assert.equal(document.find('t').attributes.x, '62');
  assert.equal(document.find('t').attributes.y, '44');
  assert.equal(document.find('t').attributes['stroke-width'], '6');
  assert.equal(document.find('l').attributes['stroke-width'], '6');
  assert.equal(document.find('g').attributes['text-anchor'], 'middle');
  assert.equal(document.find('u').attributes['font-size'], 'inherit');
  assert.equal(document.find('inner').attributes['font-size'], '2em');
  const output = codec.encode(document);
  assert.equal(codec.encode(codec.decode(output).document), output);
  assert.equal(codec.encode(document.copy()), output);
  assert.throws(() => document.find('t').set('font-size', '10'), /unknown attribute: font-size/);
  assert.throws(() => document.find('g').set('text-anchor', 'end'), /unknown attribute: text-anchor/);
});

test('text without an absolute font size keeps browser-relative sizing after transform flattening', () => {
  const document = codec.decode(wrap('<g id="g" transform="scale(2)" font-size="3em"><text id="t">default</text><text id="u" font-size="150%">relative</text></g>')).document;
  assert.equal(document.find('t').attributes['font-size'], '2em');
  assert.equal(document.find('u').attributes['font-size'], '3em');
  const output = codec.encode(document);
  assert.equal(codec.encode(codec.decode(output).document), output);
});

test('invalid presentation and overflow are rejected before publishing an imported document', () => {
  for (const source of [
    '<text font-size="-1"/>', '<text font-size="1 em"/>', '<text font-size="NaN"/>',
    '<text font-size="16pt"/>', '<g text-anchor="center"><text/></g>',
    '<g font-size="1e308"><text font-size="2em"/></g>',
    '<text font-size="1e308" transform="scale(2)"/>',
    '<line stroke="red" stroke-width="1e308" transform="scale(2)"/>',
  ]) assert.throws(() => codec.decode(wrap(source)), /invalid SVG:/, source);
});
