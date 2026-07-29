import { parseVariableNames, renderTemplate } from './prompt-variables';

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
});
