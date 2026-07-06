import { memo, useCallback, useMemo, useState } from "react";
import { Box, chakra, Checkbox, HStack, Input, Text, VStack } from "@chakra-ui/react";
import type { SecurityStandardNodeContract } from "@role-dashboard/contracts";
import Button from "@/shared/ui/primitives/Button";

type Labels = {
  clear: string;
  search: string;
  selectAll: string;
  selected: (count: number) => string;
};

function flattenNodes(nodes: SecurityStandardNodeContract[]) {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children || [])]);
}

function buildDescendantMap(nodes: SecurityStandardNodeContract[]) {
  const result = new Map<string, string[]>();
  const visit = (node: SecurityStandardNodeContract): string[] => {
    const ids = [node.nodeId, ...(node.children || []).flatMap(visit)];
    result.set(node.nodeId, ids);
    return ids;
  };
  nodes.forEach(visit);
  return result;
}

function filterTree(
  nodes: SecurityStandardNodeContract[],
  allowed: Set<string>,
  query: string,
  useFa: boolean
): SecurityStandardNodeContract[] {
  return nodes.flatMap((node) => {
    const children = filterTree(node.children || [], allowed, query, useFa);
    const label = useFa && node.labelFa ? node.labelFa : node.label;
    const matches = `${label} ${node.code || ""}`.toLocaleLowerCase().includes(query);
    if ((!allowed.has(node.nodeId) && children.length === 0) || (query && !matches && !children.length)) {
      return [];
    }
    return [{ ...node, children }];
  });
}

const TreeNode = memo(function TreeNode({
  node,
  allowed,
  selected,
  descendantsById,
  searchActive,
  useFa,
  onToggle,
}: {
  node: SecurityStandardNodeContract;
  allowed: Set<string>;
  selected: Set<string>;
  descendantsById: Map<string, string[]>;
  searchActive: boolean;
  useFa: boolean;
  onToggle: (node: SecurityStandardNodeContract, checked: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectableIds = useMemo(
    () => (descendantsById.get(node.nodeId) || []).filter((id) => allowed.has(id)),
    [allowed, descendantsById, node.nodeId]
  );
  const selectedCount = selectableIds.filter((id) => selected.has(id)).length;
  const checked = selectedCount === selectableIds.length && selectableIds.length > 0;
  const indeterminate = selectedCount > 0 && !checked;
  const label = useFa && node.labelFa ? node.labelFa : node.label;

  return (
    <Box>
      <HStack align="flex-start" gap={1}>
        <Checkbox.Root
          checked={indeterminate ? "indeterminate" : checked}
          disabled={selectableIds.length === 0}
          onCheckedChange={(details) => onToggle(node, details.checked === true)}
          display="flex"
          alignItems="flex-start"
          gap={2}
          py={1.5}
          flex="1"
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control mt="2px" />
          <Checkbox.Label minW={0}>
            <HStack gap={2} align="baseline">
              {node.code && (
                <Text as="span" color="var(--apple-blue)" fontSize="xs" fontWeight="800">
                  {node.code}
                </Text>
              )}
              <Text as="span" color="var(--apple-text)" fontSize="sm" fontWeight={node.children.length ? "800" : "600"}>
                {label}
              </Text>
            </HStack>
          </Checkbox.Label>
        </Checkbox.Root>
        {node.children.length > 0 && (
          <chakra.button
            type="button"
            aria-label={label}
            onClick={() => setExpanded((value) => !value)}
            color="var(--apple-muted)"
            boxSize="7"
            borderRadius="sm"
            _hover={{ bg: "var(--apple-surface-subtle)", color: "var(--apple-text)" }}
          >
            {expanded || searchActive ? "−" : "+"}
          </chakra.button>
        )}
      </HStack>
      {node.children.length > 0 && (expanded || searchActive) && (
        <VStack
          align="stretch"
          gap={0}
          ms={3}
          ps={3}
          borderInlineStart="1px solid"
          borderColor="var(--apple-border-soft)"
        >
          {node.children.map((child) => (
            <TreeNode
              key={child.nodeId}
              node={child}
              allowed={allowed}
              selected={selected}
              descendantsById={descendantsById}
              searchActive={searchActive}
              useFa={useFa}
              onToggle={onToggle}
            />
          ))}
        </VStack>
      )}
    </Box>
  );
});

function SecurityScopeTree({
  nodes,
  allowedNodeIds,
  selectedNodeIds,
  useFa,
  labels,
  onChange,
}: {
  nodes: SecurityStandardNodeContract[];
  allowedNodeIds: string[];
  selectedNodeIds: string[];
  useFa: boolean;
  labels: Labels;
  onChange: (nodeIds: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const flattened = useMemo(() => flattenNodes(nodes), [nodes]);
  const descendantsById = useMemo(() => buildDescendantMap(nodes), [nodes]);
  const allowed = useMemo(() => new Set(allowedNodeIds), [allowedNodeIds]);
  const selected = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  const allowedIds = useMemo(
    () => flattened.map((node) => node.nodeId).filter((id) => allowed.has(id)),
    [allowed, flattened]
  );
  const selectedCount = useMemo(
    () => allowedIds.filter((id) => selected.has(id)).length,
    [allowedIds, selected]
  );
  const visibleNodes = useMemo(
    () => filterTree(nodes, allowed, search.trim().toLocaleLowerCase(), useFa),
    [allowed, nodes, search, useFa]
  );
  const toggleNode = useCallback(
    (node: SecurityStandardNodeContract, checked: boolean) => {
      const affected = (descendantsById.get(node.nodeId) || []).filter((id) => allowed.has(id));
      const next = new Set(selected);
      affected.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      onChange(allowedIds.filter((id) => next.has(id)));
    },
    [allowed, allowedIds, descendantsById, onChange, selected]
  );

  return (
    <VStack align="stretch" gap={3}>
      <HStack justify="space-between" gap={3} flexWrap="wrap">
        <Text color="var(--apple-muted)" fontSize="sm" fontWeight="700">
          {labels.selected(selectedCount)}
        </Text>
        <HStack gap={1}>
          <Button variant="ghost" onClick={() => onChange(allowedIds)}>{labels.selectAll}</Button>
          <Button variant="ghost" onClick={() => onChange([])}>{labels.clear}</Button>
        </HStack>
      </HStack>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={labels.search}
        size="sm"
        borderRadius="md"
      />
      <Box
        maxH="320px"
        overflowY="auto"
        border="1px solid"
        borderColor="var(--apple-border-soft)"
        borderRadius="md"
        px={3}
        py={2}
      >
        {visibleNodes.map((node) => (
          <TreeNode
            key={node.nodeId}
            node={node}
            allowed={allowed}
            selected={selected}
            descendantsById={descendantsById}
            searchActive={Boolean(search.trim())}
            useFa={useFa}
            onToggle={toggleNode}
          />
        ))}
      </Box>
    </VStack>
  );
}

export default memo(SecurityScopeTree);
