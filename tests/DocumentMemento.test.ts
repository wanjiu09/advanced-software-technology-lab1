import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';

const factory = new ShapeFactory();

test('memento restores dimensions, attributes, text, sibling order and parent links', () => {
  const document = new SvgDocument(400, 300);
  document.add(factory.create('g', 'scene', { fill: 'blue' }));
  document.add(factory.create('rect', 'r', { x: '10', width: '20' }), 'scene');
  document.add(factory.create('text', 'label', { text: '开始' }), 'scene');
  document.add(factory.create('circle', 'last', { r: '5' }));
  const memento = document.createMemento();
  document.find('scene').move(20, 30);
  document.find('label').set('text', 'changed');
  document.resize(900, 700);
  document.removeChild(document.find('last'));
  document.restore(memento);
  assert.equal(document.width, 400);
  assert.equal(document.height, 300);
  assert.deepEqual([...document.descendants()].map((shape) => shape.id), ['scene', 'r', 'label', 'last']);
  assert.equal(document.find('scene').parent, document);
  assert.equal(document.find('label').parent, document.find('scene'));
  assert.equal(document.find('r').attributes.x, '10');
  assert.equal(document.find('scene').attributes.fill, 'blue');
  assert.equal(document.find('label').text, '开始');
});

test('materialized trees and repeated restores cannot mutate the saved memento', () => {
  const document = new SvgDocument();
  document.add(factory.create('text', 't', { text: 'original' }));
  const memento = document.createMemento();
  const materialized = memento.materialize();
  materialized.find('t').set('text', 'tampered');
  document.restore(memento);
  assert.equal(document.find('t').text, 'original');
  document.find('t').set('text', 'later');
  document.restore(memento);
  assert.equal(document.find('t').text, 'original');
});
