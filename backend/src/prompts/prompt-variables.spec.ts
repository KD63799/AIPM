import { parseVariableNames } from './prompt-variables';

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
