import { parseVariableNames, renderTemplate, segmentTemplate } from './prompt-template';

describe('parseVariableNames', () => {
  it('extracts names and tolerates inner whitespace', () => {
    expect(parseVariableNames('Hi {{name}}, you are {{ role }}.')).toEqual(['name', 'role']);
  });

  it('deduplicates while keeping first-appearance order', () => {
    expect(parseVariableNames('{{b}} {{a}} {{b}}')).toEqual(['b', 'a']);
  });

  it('returns nothing when there is no placeholder', () => {
    expect(parseVariableNames('plain text')).toEqual([]);
  });

  it('ignores malformed or empty placeholders', () => {
    expect(parseVariableNames('{{}} {single} {{ bad name }} {{ok}}')).toEqual(['ok']);
  });

  it('can be called repeatedly on the same content', () => {
    parseVariableNames('{{a}}');
    expect(parseVariableNames('{{a}}')).toEqual(['a']);
  });
});

describe('renderTemplate', () => {
  it('substitutes provided values', () => {
    expect(renderTemplate('Hi {{name}}', { name: 'Ada' })).toBe('Hi Ada');
  });

  it('falls back to the default when no value is given', () => {
    expect(renderTemplate('Hi {{name}}', {}, { name: 'friend' })).toBe('Hi friend');
  });

  it('prefers the provided value over the default', () => {
    expect(renderTemplate('Hi {{name}}', { name: 'Ada' }, { name: 'friend' })).toBe('Hi Ada');
  });

  it('leaves the placeholder untouched when neither value nor default exists', () => {
    expect(renderTemplate('Hi {{name}}!', {})).toBe('Hi {{name}}!');
  });

  it('keeps an empty string as a real value rather than falling back', () => {
    expect(renderTemplate('[{{x}}]', { x: '' }, { x: 'fallback' })).toBe('[]');
  });

  it('replaces every occurrence of the same variable', () => {
    expect(renderTemplate('{{x}}-{{x}}', { x: '1' })).toBe('1-1');
  });

  it('does not re-expand placeholders coming from a substituted value', () => {
    expect(renderTemplate('{{a}}', { a: '{{b}}', b: 'boom' })).toBe('{{b}}');
  });

  it('keeps replacement patterns in values literal', () => {
    expect(renderTemplate('{{a}}', { a: '$& and $1' })).toBe('$& and $1');
  });
});

describe('segmentTemplate', () => {
  it('splits text and variables, keeping the original placeholder', () => {
    expect(segmentTemplate('Hi {{ name }}!')).toEqual([
      { kind: 'text', text: 'Hi ' },
      { kind: 'variable', name: 'name', source: '{{ name }}' },
      { kind: 'text', text: '!' },
    ]);
  });

  it('returns adjacent variables without empty text between them', () => {
    expect(segmentTemplate('{{a}}{{b}}')).toEqual([
      { kind: 'variable', name: 'a', source: '{{a}}' },
      { kind: 'variable', name: 'b', source: '{{b}}' },
    ]);
  });

  it('returns a single text segment when there is no variable', () => {
    expect(segmentTemplate('plain')).toEqual([{ kind: 'text', text: 'plain' }]);
  });

  it('returns nothing for empty content', () => {
    expect(segmentTemplate('')).toEqual([]);
  });

  it('leaves malformed placeholders in the text', () => {
    expect(segmentTemplate('{{ bad name }}')).toEqual([{ kind: 'text', text: '{{ bad name }}' }]);
  });
});
