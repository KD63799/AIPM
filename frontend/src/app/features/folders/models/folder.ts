export type Folder = { id: string; name: string; parentId: string | null; promptCount: number };

export type FolderNode = Folder & { depth: number; children: FolderNode[] };

/** Nests folders under their parent, keeping the incoming sibling order. */
export function buildFolderTree(folders: Folder[]): FolderNode[] {
  const nodes = new Map(
    folders.map((f) => [f.id, { ...f, depth: 0, children: [] as FolderNode[] }]),
  );
  const roots: FolderNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const setDepth = (list: FolderNode[], depth: number): void => {
    for (const node of list) {
      node.depth = depth;
      setDepth(node.children, depth + 1);
    }
  };
  setDepth(roots, 0);
  return roots;
}

/** Depth-first order, for indented pickers. */
export function flattenTree(nodes: FolderNode[]): FolderNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

/** Folders from the root down to `id` included, empty when unknown. */
export function folderPath(folders: Folder[], id: string | null): Folder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: Folder[] = [];
  for (
    let f = id ? byId.get(id) : undefined;
    f;
    f = f.parentId ? byId.get(f.parentId) : undefined
  ) {
    path.unshift(f);
  }
  return path;
}
