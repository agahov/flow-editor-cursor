import type { GraphEdge, Process } from '@/types/flow'
import type { System } from '@/types/systems'
import type { TagDef } from '@/types/tags'
import type { EdgeFlow, Strand, StrandStatus } from '@/types/data-flow'

interface CommandSets {
  added: Set<string>
  removed: Set<string>
  changed: Set<string>
  queryHas: Set<string>
  queryAbsent: Set<string>
}

function commandSets(system: System): CommandSets {
  const added = new Set<string>()
  const removed = new Set<string>()
  const changed = new Set<string>()
  for (const action of system.actions) {
    if (action.kind === 'addTags') for (const t of action.tags) added.add(t.tagId)
    else if (action.kind === 'removeTags') for (const id of action.tagIds) removed.add(id)
    else if (action.kind === 'changeComp') for (const c of action.changes) changed.add(c.tagId)
  }
  const queryHas = new Set<string>()
  const queryAbsent = new Set<string>()
  for (const c of system.query.conditions) {
    if (c.mode === 'has') queryHas.add(c.tagId)
    else queryAbsent.add(c.tagId)
  }
  return { added, removed, changed, queryHas, queryAbsent }
}

function statusFor(tagId: string, input: Set<string>, cmd: CommandSets): StrandStatus {
  if (cmd.removed.has(tagId)) return 'deleted'
  if (cmd.added.has(tagId) && !input.has(tagId)) return 'added'
  if (cmd.changed.has(tagId) || (cmd.added.has(tagId) && input.has(tagId))) return 'updated'
  if (cmd.queryHas.has(tagId)) return 'read'
  return 'unchanged'
}

export interface ProcessFlowResult {
  /** Topologically ordered system node ids of the process. */
  order: string[]
  edgeFlows: Map<string, EdgeFlow>
  statusByNode: Map<string, Map<string, StrandStatus>>
  /** The forwardable output set (input + added - removed) per system node. */
  outputSetByNode: Map<string, string[]>
  warningsByNode: Map<string, string[]>
}

/** Compute the per-Process data flow: ordering, per-edge colored strands, output sets and validation. */
export function computeProcessFlow(
  process: Process,
  systems: System[],
  tags: TagDef[],
): ProcessFlowResult {
  const tagById = new Map(tags.map((t) => [t.id, t]))
  const systemById = new Map(systems.map((s) => [s.id, s]))
  const tagName = (id: string) => tagById.get(id)?.name ?? id

  const nodeToSystem = new Map<string, System>()
  for (const node of process.graph.nodes) {
    if (node.type === 'system' && node.data.systemId) {
      const sys = systemById.get(node.data.systemId)
      if (sys) nodeToSystem.set(node.id, sys)
    }
  }

  const nodeIds = [...nodeToSystem.keys()]
  const incoming = new Map<string, GraphEdge[]>(nodeIds.map((id) => [id, []]))
  const adj = new Map<string, string[]>(nodeIds.map((id) => [id, []]))
  const inDegree = new Map<string, number>(nodeIds.map((id) => [id, 0]))
  for (const edge of process.graph.edges) {
    if (!nodeToSystem.has(edge.source) || !nodeToSystem.has(edge.target)) continue
    incoming.get(edge.target)!.push(edge)
    adj.get(edge.source)!.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  // Kahn topological sort; leftover (cycles) appended in declaration order.
  const ready = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0)
  const order: string[] = []
  const seen = new Set<string>()
  while (ready.length) {
    const id = ready.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    order.push(id)
    for (const next of adj.get(id) ?? []) {
      inDegree.set(next, (inDegree.get(next) ?? 1) - 1)
      if ((inDegree.get(next) ?? 0) === 0) ready.push(next)
    }
  }
  for (const id of nodeIds) if (!seen.has(id)) order.push(id)

  const statusByNode = new Map<string, Map<string, StrandStatus>>()
  const outputSetByNode = new Map<string, string[]>()
  const outputSetSetByNode = new Map<string, Set<string>>()
  const pinTagsByNode = new Map<string, Map<string, string[]>>()
  const warningsByNode = new Map<string, string[]>()

  const pinIdFromHandle = (handle?: string) => handle?.replace(/^out-/, '')

  function carriedTagsForEdge(edge: GraphEdge): string[] {
    const pinMap = pinTagsByNode.get(edge.source)
    const outSet = outputSetSetByNode.get(edge.source)
    if (!pinMap || !outSet) return []
    const pinId = pinIdFromHandle(edge.sourceHandle)
    if (pinId && pinMap.has(pinId)) return pinMap.get(pinId)!
    // Legacy / handle-less edges: forward the full output set.
    return [...outSet]
  }

  for (const nodeId of order) {
    const system = nodeToSystem.get(nodeId)!
    const cmd = commandSets(system)

    const input = new Set<string>()
    const inEdges = incoming.get(nodeId) ?? []
    if (inEdges.length === 0) {
      for (const t of cmd.queryHas) input.add(t)
    } else {
      for (const edge of inEdges) for (const t of carriedTagsForEdge(edge)) input.add(t)
    }

    const relevant = new Set<string>([
      ...input,
      ...cmd.added,
      ...cmd.removed,
      ...cmd.changed,
      ...cmd.queryHas,
    ])
    const statusMap = new Map<string, StrandStatus>()
    for (const t of relevant) statusMap.set(t, statusFor(t, input, cmd))
    statusByNode.set(nodeId, statusMap)

    const outSet = new Set<string>(input)
    for (const t of cmd.added) outSet.add(t)
    for (const t of cmd.removed) outSet.delete(t)
    outputSetSetByNode.set(nodeId, outSet)
    outputSetByNode.set(nodeId, [...outSet])

    const pinMap = new Map<string, string[]>()
    for (const pin of system.outputs) {
      // An empty subset means "forward the full output set".
      pinMap.set(
        pin.id,
        pin.tagIds.length === 0 ? [...outSet] : pin.tagIds.filter((t) => outSet.has(t)),
      )
    }
    pinTagsByNode.set(nodeId, pinMap)

    const warnings: string[] = []
    for (const t of cmd.queryHas) {
      if (!input.has(t))
        warnings.push(`Query requires "${tagName(t)}" but no incoming flow provides it`)
    }
    for (const t of cmd.queryAbsent) {
      if (input.has(t))
        warnings.push(`Query requires "${tagName(t)}" absent, but an incoming flow carries it`)
    }
    warningsByNode.set(nodeId, warnings)
  }

  const edgeFlows = new Map<string, EdgeFlow>()
  for (const edge of process.graph.edges) {
    if (!nodeToSystem.has(edge.source) || !nodeToSystem.has(edge.target)) continue
    const carried = carriedTagsForEdge(edge)
    const srcStatus = statusByNode.get(edge.source) ?? new Map<string, StrandStatus>()
    const strands: Strand[] = carried.map((tagId) => {
      const tag = tagById.get(tagId)
      return {
        tagId,
        name: tag?.name ?? tagId,
        type: tag?.type ?? 'data',
        status: srcStatus.get(tagId) ?? 'unchanged',
      }
    })
    edgeFlows.set(edge.id, {
      edgeId: edge.id,
      strands,
      warnings: warningsByNode.get(edge.target) ?? [],
    })
  }

  return { order, edgeFlows, statusByNode, outputSetByNode, warningsByNode }
}
