import type { Folder } from './folder';
import { buildFolderTree, flattenTree, folderPath } from './folder';

const folder = (id: string, parentId: string | null = null): Folder => ({
  id,
  name: id,
  parentId,
  promptCount: 0,
});

describe('buildFolderTree', () => {
  it('nests children under their parent with their depth', () => {
    const tree = buildFolderTree([folder('dev'), folder('review', 'dev'), folder('writing')]);

    expect(tree.map((n) => n.id)).toEqual(['dev', 'writing']);
    expect(tree[0].children.map((n) => [n.id, n.depth])).toEqual([['review', 1]]);
  });

  it('nests children listed before their parent', () => {
    const tree = buildFolderTree([folder('child', 'parent'), folder('parent')]);

    expect(tree[0].children[0].id).toBe('child');
  });

  it('keeps orphans at the root rather than losing them', () => {
    expect(buildFolderTree([folder('orphan', 'gone')]).map((n) => n.id)).toEqual(['orphan']);
  });
});

describe('flattenTree', () => {
  it('lists folders depth-first', () => {
    const tree = buildFolderTree([
      folder('a'),
      folder('b'),
      folder('a1', 'a'),
      folder('a1x', 'a1'),
    ]);

    expect(flattenTree(tree).map((n) => n.id)).toEqual(['a', 'a1', 'a1x', 'b']);
  });
});

describe('folderPath', () => {
  const folders = [folder('dev'), folder('review', 'dev'), folder('strict', 'review')];

  it('returns the ancestors from the root down to the folder', () => {
    expect(folderPath(folders, 'strict').map((f) => f.id)).toEqual(['dev', 'review', 'strict']);
  });

  it('is empty for no folder or an unknown one', () => {
    expect(folderPath(folders, null)).toEqual([]);
    expect(folderPath(folders, 'nope')).toEqual([]);
  });
});
