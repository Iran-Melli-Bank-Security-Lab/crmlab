import { useState, type CSSProperties, type ReactNode } from "react";
import { Badge, Box, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import {
  runtimeInstanceStatuses,
  runtimeInstanceTypes,
  testTargetTypes,
  useCreateRuntimeInstanceMutation,
  useCreateTestTargetMutation,
  useDeleteRuntimeInstanceMutation,
  useDeleteTestTargetMutation,
  useGetRuntimeInstancesQuery,
  useGetTestTargetsQuery,
  useUpdateRuntimeInstanceMutation,
  useUpdateTestTargetMutation,
  type RuntimeInstance,
  type RuntimeInstanceInput,
  type TestTarget,
  type TestTargetInput,
} from "@/entities/devops/api/devOpsInfoApi";
import { useLanguage } from "@/features/language/model";
import Button from "@/shared/ui/primitives/Button";

const copy = {
  en: {
    instances: "Runtime Instances", targets: "Test Targets", addInstance: "Add instance",
    addTarget: "Add target", edit: "Edit", remove: "Delete", cancel: "Cancel", save: "Save",
    saving: "Saving...", emptyInstances: "No runtime instances yet.", emptyTargets: "No test targets yet.",
    loading: "Loading...", loadError: "Could not load this section.", actionError: "The operation could not be completed.",
    confirm: "Delete this item?", assignedUser: "Assigned user", unassigned: "Unassigned / shared",
    name: "Name", type: "Type", status: "Status", accessUrl: "Access URL", consoleUrl: "Console URL",
    host: "Host", port: "Port", networkNotes: "Network notes", notes: "Notes", linkedInstance: "Runtime instance",
    projectLevel: "Project-level target", url: "URL", version: "Version", authRequired: "Authentication required",
    invalidUrl: "URLs must use HTTP(S) and cannot contain embedded credentials.", requiredName: "Name is required.",
    instancesHelp: "Create one VM, container, shared environment, or external access record for each required runtime.",
    targetsHelp: "List the application surfaces testers should assess and optionally connect each target to a runtime instance.",
  },
  fa: {
    instances: "محیط‌های اجرا", targets: "اهداف آزمون", addInstance: "افزودن محیط اجرا",
    addTarget: "افزودن هدف", edit: "ویرایش", remove: "حذف", cancel: "انصراف", save: "ذخیره",
    saving: "در حال ذخیره...", emptyInstances: "هنوز محیط اجرایی ثبت نشده است.", emptyTargets: "هنوز هدف آزمونی ثبت نشده است.",
    loading: "در حال بارگذاری...", loadError: "بارگذاری این بخش انجام نشد.", actionError: "عملیات انجام نشد.",
    confirm: "این مورد حذف شود؟", assignedUser: "کاربر تخصیص‌یافته", unassigned: "بدون کاربر / اشتراکی",
    name: "نام", type: "نوع", status: "وضعیت", accessUrl: "آدرس دسترسی", consoleUrl: "آدرس کنسول",
    host: "میزبان", port: "پورت", networkNotes: "یادداشت شبکه", notes: "یادداشت‌ها", linkedInstance: "محیط اجرا",
    projectLevel: "هدف سطح پروژه", url: "آدرس", version: "نسخه", authRequired: "نیازمند احراز هویت",
    invalidUrl: "آدرس باید HTTP(S) باشد و اطلاعات ورود در آن قرار نگیرد.", requiredName: "نام الزامی است.",
    instancesHelp: "برای هر محیط موردنیاز، ماشین مجازی، کانتینر، محیط اشتراکی یا دسترسی خارجی ثبت کنید.",
    targetsHelp: "سطوحی را که باید آزمون شوند ثبت کنید و در صورت نیاز هر هدف را به یک محیط اجرا متصل کنید.",
  },
} as const;

const controlStyle = {
  width: "100%", border: "1px solid var(--apple-border)", borderRadius: 8,
  background: "var(--apple-surface-raised)", color: "var(--apple-text)",
  padding: "9px 11px", fontSize: 14, outline: "none",
} satisfies CSSProperties;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <Box minW={0}><Text as="label" display="block" mb={1} fontSize="xs" fontWeight="800" color="var(--apple-secondary)">{label}</Text>{children}</Box>;
}

function Section({ number, title, description, action, children }: { number: number; title: string; description: string; action: ReactNode; children: ReactNode }) {
  return (
    <Box bg="var(--apple-surface-raised)" border="1px solid" borderColor="var(--apple-border)" borderRadius="lg" p={{ base: 5, md: 6 }} boxShadow="var(--surface-shadow)">
      <HStack justify="space-between" align="start" gap={4} mb={5} flexWrap="wrap">
        <HStack align="start" gap={3} flex="1" minW="240px"><Box flex="0 0 auto" display="grid" placeItems="center" boxSize="8" borderRadius="full" bg="var(--apple-blue-soft)" color="var(--apple-blue)" fontSize="sm" fontWeight="900">{number}</Box><Box><Heading as="h2" size="sm">{title}</Heading><Text mt={1} color="var(--apple-muted)" fontSize="sm" lineHeight="1.6">{description}</Text></Box></HStack>
        {action}
      </HStack>
      {children}
    </Box>
  );
}

function validSafeUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

function humanize(value: string) { return value.split("_").join(" "); }
const faValueLabels: Record<string, string> = {
  vm: "ماشین مجازی", container: "کانتینر", shared: "اشتراکی", external: "خارجی",
  pending: "در انتظار", provisioning: "در حال آماده‌سازی", ready: "آماده", failed: "ناموفق", retired: "خارج از سرویس",
  web: "وب", api: "رابط API", admin: "پنل مدیریت", desktop: "دسکتاپ", mobile: "موبایل", endpoint: "نقطه پایانی", other: "سایر",
};
function valueLabel(value: string, language: "en" | "fa") { return language === "fa" ? faValueLabels[value] || value : humanize(value); }

type InstanceDraft = Omit<RuntimeInstanceInput, "port"> & { port: string };
const emptyInstance: InstanceDraft = {
  assignedUserId: null, name: "", type: "vm", status: "pending", accessUrl: "",
  consoleUrl: "", host: "", port: "", networkNotes: "", notes: "",
};
const emptyTarget: TestTargetInput = {
  runtimeInstanceId: null, name: "", type: "web", url: "", version: "",
  authRequired: false, notes: "",
};

function RuntimeInstances({ projectId, assignedUserIds, number = 3 }: { projectId: string; assignedUserIds: string[]; number?: number }) {
  const { language } = useLanguage();
  const l = copy[language];
  const { data = [], isLoading, error } = useGetRuntimeInstancesQuery(projectId);
  const [create, createState] = useCreateRuntimeInstanceMutation();
  const [update, updateState] = useUpdateRuntimeInstanceMutation();
  const [remove, removeState] = useDeleteRuntimeInstanceMutation();
  const [draft, setDraft] = useState<InstanceDraft>(emptyInstance);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const busy = createState.isLoading || updateState.isLoading || removeState.isLoading;

  const beginEdit = (item: RuntimeInstance) => {
    setDraft({ ...item, port: item.port ? String(item.port) : "" });
    setEditingId(item._id); setOpen(true); setFormError("");
  };
  const close = () => { setOpen(false); setEditingId(null); setDraft(emptyInstance); setFormError(""); };
  const submit = async () => {
    if (!draft.name.trim()) return setFormError(l.requiredName);
    if (![draft.accessUrl, draft.consoleUrl].every(validSafeUrl)) return setFormError(l.invalidUrl);
    const body: RuntimeInstanceInput = { ...draft, name: draft.name.trim(), port: draft.port ? Number(draft.port) : null };
    try {
      if (editingId) await update({ projectId, instanceId: editingId, body }).unwrap();
      else await create({ projectId, body }).unwrap();
      close();
    } catch { setFormError(l.actionError); }
  };
  const deleteItem = async (id: string) => {
    if (!window.confirm(l.confirm)) return;
    try { await remove({ projectId, instanceId: id }).unwrap(); } catch { setFormError(l.actionError); }
  };

  return (
    <Section number={number} title={l.instances} description={l.instancesHelp} action={<Button onClick={() => { close(); setOpen(true); }}>{l.addInstance}</Button>}>
      {open && <Box mb={5} p={4} bg="var(--apple-surface-subtle)" borderRadius="md" border="1px solid var(--apple-border-soft)">
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
          <Field label={l.name}><input style={controlStyle} value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} /></Field>
          <Field label={l.assignedUser}><select style={controlStyle} value={draft.assignedUserId || ""} onChange={(e) => setDraft((v) => ({ ...v, assignedUserId: e.target.value || null }))}><option value="">{l.unassigned}</option>{draft.assignedUserId && !assignedUserIds.includes(draft.assignedUserId) && <option value={draft.assignedUserId}>{draft.assignedUserId}</option>}{assignedUserIds.map((id) => <option key={id} value={id}>{id}</option>)}</select></Field>
          <Field label={l.type}><select style={controlStyle} value={draft.type} onChange={(e) => setDraft((v) => ({ ...v, type: e.target.value as RuntimeInstanceInput["type"] }))}>{runtimeInstanceTypes.map((value) => <option key={value} value={value}>{valueLabel(value, language)}</option>)}</select></Field>
          <Field label={l.status}><select style={controlStyle} value={draft.status} onChange={(e) => setDraft((v) => ({ ...v, status: e.target.value as RuntimeInstanceInput["status"] }))}>{runtimeInstanceStatuses.map((value) => <option key={value} value={value}>{valueLabel(value, language)}</option>)}</select></Field>
          <Field label={l.accessUrl}><input dir="ltr" style={controlStyle} value={draft.accessUrl} onChange={(e) => setDraft((v) => ({ ...v, accessUrl: e.target.value }))} /></Field>
          <Field label={l.consoleUrl}><input dir="ltr" style={controlStyle} value={draft.consoleUrl} onChange={(e) => setDraft((v) => ({ ...v, consoleUrl: e.target.value }))} /></Field>
          <Field label={l.host}><input dir="ltr" style={controlStyle} value={draft.host} onChange={(e) => setDraft((v) => ({ ...v, host: e.target.value }))} /></Field>
          <Field label={l.port}><input type="number" min="1" max="65535" dir="ltr" style={controlStyle} value={draft.port} onChange={(e) => setDraft((v) => ({ ...v, port: e.target.value }))} /></Field>
          <Field label={l.networkNotes}><textarea style={{ ...controlStyle, minHeight: 76 }} value={draft.networkNotes} onChange={(e) => setDraft((v) => ({ ...v, networkNotes: e.target.value }))} /></Field>
          <Field label={l.notes}><textarea style={{ ...controlStyle, minHeight: 76 }} value={draft.notes} onChange={(e) => setDraft((v) => ({ ...v, notes: e.target.value }))} /></Field>
        </SimpleGrid>
        {formError && <Text mt={2} color="var(--apple-danger-text)" fontSize="sm">{formError}</Text>}
        <HStack justify="end" mt={3}><Button variant="secondary" onClick={close} disabled={busy}>{l.cancel}</Button><Button onClick={submit} disabled={busy}>{busy ? l.saving : l.save}</Button></HStack>
      </Box>}
      {!open && formError && <Text mb={3} color="var(--apple-danger-text)" fontSize="sm">{formError}</Text>}
      {isLoading ? <Text color="var(--apple-muted)">{l.loading}</Text> : error ? <Text color="var(--apple-danger-text)">{l.loadError}</Text> : data.length === 0 ? <Box border="1px dashed var(--apple-border)" borderRadius="md" p={7} textAlign="center" bg="var(--apple-surface-subtle)"><Text color="var(--apple-muted)" fontSize="sm">{l.emptyInstances}</Text></Box> :
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={3}>{data.map((item) => <Box key={item._id} border="1px solid var(--apple-border-soft)" borderRadius="md" p={4}>
          <HStack justify="space-between" align="start" gap={3}><Box minW={0}><Text fontWeight="850">{item.name}</Text><Text fontSize="xs" color="var(--apple-muted)" dir="ltr">{item.accessUrl || item.host || "-"}</Text></Box><HStack><Badge textTransform="capitalize">{valueLabel(item.type, language)}</Badge><Badge colorPalette={item.status === "ready" ? "green" : item.status === "failed" ? "red" : "gray"}>{valueLabel(item.status, language)}</Badge></HStack></HStack>
          <Text mt={2} fontSize="xs" color="var(--apple-muted)">{l.assignedUser}: {item.assignedUserId || l.unassigned}</Text>
          <HStack mt={3} justify="end"><Button variant="secondary" onClick={() => beginEdit(item)}>{l.edit}</Button><Button variant="secondary" onClick={() => deleteItem(item._id)} disabled={busy}>{l.remove}</Button></HStack>
        </Box>)}</SimpleGrid>}
    </Section>
  );
}

function TestTargets({ projectId, instances, number = 4 }: { projectId: string; instances: RuntimeInstance[]; number?: number }) {
  const { language } = useLanguage();
  const l = copy[language];
  const { data = [], isLoading, error } = useGetTestTargetsQuery(projectId);
  const [create, createState] = useCreateTestTargetMutation();
  const [update, updateState] = useUpdateTestTargetMutation();
  const [remove, removeState] = useDeleteTestTargetMutation();
  const [draft, setDraft] = useState<TestTargetInput>(emptyTarget);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const busy = createState.isLoading || updateState.isLoading || removeState.isLoading;
  const close = () => { setOpen(false); setEditingId(null); setDraft(emptyTarget); setFormError(""); };
  const beginEdit = (item: TestTarget) => { setDraft(item); setEditingId(item._id); setOpen(true); setFormError(""); };
  const submit = async () => {
    if (!draft.name.trim()) return setFormError(l.requiredName);
    if (!validSafeUrl(draft.url)) return setFormError(l.invalidUrl);
    try {
      const body = { ...draft, name: draft.name.trim() };
      if (editingId) await update({ projectId, targetId: editingId, body }).unwrap();
      else await create({ projectId, body }).unwrap();
      close();
    } catch { setFormError(l.actionError); }
  };
  const deleteItem = async (id: string) => {
    if (!window.confirm(l.confirm)) return;
    try { await remove({ projectId, targetId: id }).unwrap(); } catch { setFormError(l.actionError); }
  };
  const instanceName = (id?: string | null) => instances.find((item) => item._id === id)?.name || l.projectLevel;

  return (
    <Section number={number} title={l.targets} description={l.targetsHelp} action={<Button onClick={() => { close(); setOpen(true); }}>{l.addTarget}</Button>}>
      {open && <Box mb={5} p={4} bg="var(--apple-surface-subtle)" borderRadius="md" border="1px solid var(--apple-border-soft)">
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
          <Field label={l.name}><input style={controlStyle} value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} /></Field>
          <Field label={l.linkedInstance}><select style={controlStyle} value={draft.runtimeInstanceId || ""} onChange={(e) => setDraft((v) => ({ ...v, runtimeInstanceId: e.target.value || null }))}><option value="">{l.projectLevel}</option>{instances.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></Field>
          <Field label={l.type}><select style={controlStyle} value={draft.type} onChange={(e) => setDraft((v) => ({ ...v, type: e.target.value as TestTargetInput["type"] }))}>{testTargetTypes.map((value) => <option key={value} value={value}>{valueLabel(value, language)}</option>)}</select></Field>
          <Field label={l.url}><input dir="ltr" style={controlStyle} value={draft.url} onChange={(e) => setDraft((v) => ({ ...v, url: e.target.value }))} /></Field>
          <Field label={l.version}><input dir="ltr" style={controlStyle} value={draft.version} onChange={(e) => setDraft((v) => ({ ...v, version: e.target.value }))} /></Field>
          <Field label={l.notes}><textarea style={{ ...controlStyle, minHeight: 76 }} value={draft.notes} onChange={(e) => setDraft((v) => ({ ...v, notes: e.target.value }))} /></Field>
          <Field label={l.authRequired}><HStack minH="40px"><input type="checkbox" checked={draft.authRequired} onChange={(e) => setDraft((v) => ({ ...v, authRequired: e.target.checked }))} /><Text fontSize="sm">{l.authRequired}</Text></HStack></Field>
        </SimpleGrid>
        {formError && <Text mt={2} color="var(--apple-danger-text)" fontSize="sm">{formError}</Text>}
        <HStack justify="end" mt={3}><Button variant="secondary" onClick={close} disabled={busy}>{l.cancel}</Button><Button onClick={submit} disabled={busy}>{busy ? l.saving : l.save}</Button></HStack>
      </Box>}
      {!open && formError && <Text mb={3} color="var(--apple-danger-text)" fontSize="sm">{formError}</Text>}
      {isLoading ? <Text color="var(--apple-muted)">{l.loading}</Text> : error ? <Text color="var(--apple-danger-text)">{l.loadError}</Text> : data.length === 0 ? <Box border="1px dashed var(--apple-border)" borderRadius="md" p={7} textAlign="center" bg="var(--apple-surface-subtle)"><Text color="var(--apple-muted)" fontSize="sm">{l.emptyTargets}</Text></Box> :
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={3}>{data.map((item) => <Box key={item._id} border="1px solid var(--apple-border-soft)" borderRadius="md" p={4}>
          <HStack justify="space-between" align="start" gap={3}><Box minW={0}><Text fontWeight="850">{item.name}</Text><Text fontSize="xs" color="var(--apple-muted)" dir="ltr">{item.url || "-"}</Text></Box><Badge textTransform="capitalize">{valueLabel(item.type, language)}</Badge></HStack>
          <Text mt={2} fontSize="xs" color="var(--apple-muted)">{l.linkedInstance}: {instanceName(item.runtimeInstanceId)}{item.authRequired ? ` · ${l.authRequired}` : ""}</Text>
          <HStack mt={3} justify="end"><Button variant="secondary" onClick={() => beginEdit(item)}>{l.edit}</Button><Button variant="secondary" onClick={() => deleteItem(item._id)} disabled={busy}>{l.remove}</Button></HStack>
        </Box>)}</SimpleGrid>}
    </Section>
  );
}

export default function DevOpsResourcesSection({ projectId, assignedUserIds, view = "all" }: { projectId: string; assignedUserIds: string[]; view?: "instances" | "targets" | "all" }) {
  const { data: instances = [] } = useGetRuntimeInstancesQuery(projectId);
  return <VStack align="stretch" gap={5}>{view !== "targets" && <RuntimeInstances projectId={projectId} assignedUserIds={assignedUserIds} />}{view !== "instances" && <TestTargets projectId={projectId} instances={instances} />}</VStack>;
}
