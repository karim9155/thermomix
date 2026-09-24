import Link from 'next/link'
import type { AdvisorTreeNode } from '@/lib/conseiller/network'
import { AdvisorStatusBadge } from '@/components/conseiller/badges'

/**
 * The sponsor tree as nested lists (B7). Recursive and unbounded, since
 * the tree has no depth limit. Server Component: nothing here is
 * interactive beyond the links.
 */
export function NetworkTree({ roots }: { roots: AdvisorTreeNode[] }) {
  if (roots.length === 0) {
    return <p className="admin-empty">Aucun conseiller pour le moment.</p>
  }

  return (
    <ul className="advisor-tree">
      {roots.map((node) => (
        <TreeNode key={node.id} node={node} />
      ))}
    </ul>
  )
}

function TreeNode({ node }: { node: AdvisorTreeNode }) {
  return (
    <li>
      <div className="advisor-tree-node">
        <Link href={`/admin-r/conseillers/${node.id}`} className="admin-table-link">
          {node.prenom} {node.nom}
        </Link>
        <span className="admin-muted">
          {node.gradeName} · {node.region}
        </span>
        <AdvisorStatusBadge status={node.status} />
        {node.children.length > 0 ? (
          <span className="admin-muted">
            {node.children.length} recrue{node.children.length > 1 ? 's' : ''}
          </span>
        ) : null}
      </div>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
