import { useState, type CSSProperties } from "react";
import { Badge, Box, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import {
  credentialScopes,
  useCreateCredentialGroupMutation,
  useDeleteCredentialGroupMutation,
  useGetCredentialGroupsQuery,
  useGetRuntimeInstancesQuery,
  useGetTestTargetsQuery,
  useUpdateCredentialGroupMutation,
  type DevOpsCredentialAccount,
  type DevOpsCredentialGroup,
  type DevOpsCredentialGroupInput,
} from "@/entities/devops/api/devOpsInfoApi";
import { useLanguage } from "@/features/language/model";
import Button from "@/shared/ui/primitives/Button";

const copy = {
  en: {
    title: "Access & Credentials", help: "Keep temporary environment logins and application test accounts grouped by who should use them.",
    instance: "Instance Access", application: "Application Test Accounts", add: "Add Credential Group",
    empty: "No credential groups have been added.", name: "Group name", type: "Credential type", scope: "Sharing mode",
    sharedToggle: "Use same application accounts for all pentesters", shared: "Shared for all pentesters",
    perUser: "Per user", perInstance: "Per instance", perTarget: "Per target", links: "Applies to",
    accounts: "Accounts", addAccount: "Add account", label: "Label", role: "Role", username: "Username",
    password: "Password", token: "Token", notes: "Notes", save: "Save group", saving: "Saving...",
    cancel: "Cancel", edit: "Edit", remove: "Delete", loading: "Loading credentials...", loadError: "Could not load credentials.",
    actionError: "The credential group could not be saved.", required: "Add a group name and at least one uniquely labeled account.",
    saved: "Credential group saved.", confirm: "Delete this credential group?", projectUsers: "Project users",
  },
  fa: {
    title: "دسترسی‌ها و اطلاعات احراز هویت", help: "ورودهای موقت محیط و اکانت‌های تست برنامه را بر اساس کاربران مجاز گروه‌بندی کنید.",
    instance: "دسترسی محیط/سرور", application: "اکانت‌های تست برنامه", add: "افزودن گروه احراز هویت",
    empty: "هنوز گروه احراز هویتی ثبت نشده است.", name: "نام گروه", type: "نوع اطلاعات", scope: "روش اشتراک",
    sharedToggle: "استفاده از اکانت‌های مشترک برای همه پنتسترها", shared: "مشترک برای همه پنتسترها",
    perUser: "برای هر کاربر", perInstance: "برای هر محیط", perTarget: "برای هر تارگت", links: "قابل استفاده برای",
    accounts: "اکانت‌ها", addAccount: "افزودن اکانت", label: "عنوان", role: "نقش", username: "نام کاربری",
    password: "رمز عبور", token: "توکن", notes: "یادداشت", save: "ذخیره گروه", saving: "در حال ذخیره...",
    cancel: "انصراف", edit: "ویرایش", remove: "حذف", loading: "در حال بارگذاری اطلاعات احراز هویت...", loadError: "بارگذاری اطلاعات انجام نشد.",
    actionError: "ذخیره گروه انجام نشد.", required: "نام گروه و حداقل یک اکانت با عنوان یکتا وارد کنید.",
    saved: "گروه احراز هویت ذخیره شد.", confirm: "این گروه حذف شود؟", projectUsers: "کاربران پروژه",
  },
} as const;

const control = { width: "100%", border: "1px solid var(--apple-border)", borderRadius: 8, background: "var(--apple-surface-raised)", color: "var(--apple-text)", padding: "9px 11px", fontSize: 14, outline: "none" } satisfies CSSProperties;
const emptyAccount = (): DevOpsCredentialAccount => ({ label: "", role: "", username: "", password: "", token: "", notes: "" });
const emptyGroup = (): DevOpsCredentialGroupInput => ({ name: "", type: "application_accounts", scope: "shared_for_all_users", targetIds: [], instanceIds: [], visibleToUserIds: [], accounts: [emptyAccount()] });

export default function DevOpsCredentialsSection({ projectId, assignedUserIds, number = 5 }: { projectId: string; assignedUserIds: string[]; number?: number }) {
  const { language } = useLanguage();
  const l = copy[language];
  const { data: groups = [], isLoading, error } = useGetCredentialGroupsQuery(projectId);
  const { data: instances = [] } = useGetRuntimeInstancesQuery(projectId);
  const { data: targets = [] } = useGetTestTargetsQuery(projectId);
  const [create, createState] = useCreateCredentialGroupMutation();
  const [update, updateState] = useUpdateCredentialGroupMutation();
  const [remove, removeState] = useDeleteCredentialGroupMutation();
  const [draft, setDraft] = useState<DevOpsCredentialGroupInput>(emptyGroup);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const busy = createState.isLoading || updateState.isLoading || removeState.isLoading;
  const scopeLabels = { shared_for_all_users: l.shared, per_user: l.perUser, per_instance: l.perInstance, per_target: l.perTarget } as const;

  const close = () => { setOpen(false); setEditingId(null); setDraft(emptyGroup()); setFormError(""); };
  const edit = (group: DevOpsCredentialGroup) => { setDraft({ name: group.name, type: group.type, scope: group.scope, targetIds: group.targetIds.map(String), instanceIds: group.instanceIds.map(String), visibleToUserIds: group.visibleToUserIds.map(String), accounts: group.accounts.map(({ label, role, username, password, token, notes }) => ({ label, role, username, password, token, notes })) }); setEditingId(group._id); setOpen(true); setFormError(""); setMessage(""); };
  const setAccount = (index: number, key: keyof DevOpsCredentialAccount, value: string) => setDraft((current) => ({ ...current, accounts: current.accounts.map((account, accountIndex) => accountIndex === index ? { ...account, [key]: value } : account) }));
  const toggleId = (key: "targetIds" | "instanceIds" | "visibleToUserIds", id: string) => setDraft((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id] }));
  const submit = async () => {
    const labels = draft.accounts.map((account) => account.label.trim().toLocaleLowerCase());
    if (!draft.name.trim() || labels.some((label) => !label) || new Set(labels).size !== labels.length) return setFormError(l.required);
    const linkedInstanceIds = draft.scope === "per_instance"
      ? draft.instanceIds
      : targets.filter((target) => draft.targetIds.includes(target._id)).map((target) => target.runtimeInstanceId).filter((id): id is string => Boolean(id));
    const linkedUserIds = instances
      .filter((instance) => linkedInstanceIds.includes(instance._id))
      .map((instance) => instance.assignedUserId)
      .filter((id): id is string => Boolean(id));
    const visibleToUserIds = draft.scope === "shared_for_all_users"
      ? assignedUserIds
      : draft.scope === "per_user"
        ? draft.visibleToUserIds
        : [...new Set(linkedUserIds)];
    const body = { ...draft, name: draft.name.trim(), visibleToUserIds };
    try {
      if (editingId) await update({ projectId, groupId: editingId, body }).unwrap();
      else await create({ projectId, body }).unwrap();
      close(); setMessage(l.saved);
    } catch { setFormError(l.actionError); }
  };
  const deleteGroup = async (id: string) => { if (!window.confirm(l.confirm)) return; try { await remove({ projectId, groupId: id }).unwrap(); setMessage(""); } catch { setFormError(l.actionError); } };
  const linkOptions = draft.scope === "per_instance" ? instances.map((item) => ({ id: item._id, label: item.name })) : draft.scope === "per_target" ? targets.map((item) => ({ id: item._id, label: item.name })) : draft.scope === "per_user" ? assignedUserIds.map((id) => ({ id, label: id })) : [];
  const linkKey = draft.scope === "per_instance" ? "instanceIds" : draft.scope === "per_target" ? "targetIds" : "visibleToUserIds";

  return <Box bg="var(--apple-surface-raised)" border="1px solid" borderColor="var(--apple-border)" borderRadius="lg" p={{ base: 5, md: 6 }} boxShadow="var(--surface-shadow)">
    <HStack justify="space-between" align="start" gap={4} flexWrap="wrap" mb={5}><HStack align="start" gap={3} flex="1" minW="250px"><Box display="grid" placeItems="center" boxSize="8" borderRadius="full" bg="var(--apple-blue-soft)" color="var(--apple-blue)" fontWeight="900">{number}</Box><Box><Heading as="h2" size="sm">{l.title}</Heading><Text mt={1} color="var(--apple-muted)" fontSize="sm" lineHeight="1.6">{l.help}</Text></Box></HStack><Button onClick={() => { close(); setOpen(true); }}>{l.add}</Button></HStack>
    {open && <Box mb={5} p={4} border="1px solid var(--apple-border-soft)" bg="var(--apple-surface-subtle)" borderRadius="md">
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
        <label><Text mb={1} fontSize="xs" fontWeight="800">{l.name}</Text><input style={control} value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} /></label>
        <label><Text mb={1} fontSize="xs" fontWeight="800">{l.type}</Text><select style={control} value={draft.type} onChange={(e) => setDraft((v) => ({ ...v, type: e.target.value as DevOpsCredentialGroupInput["type"], scope: e.target.value === "application_accounts" ? "shared_for_all_users" : "per_instance" }))}><option value="instance_access">{l.instance}</option><option value="application_accounts">{l.application}</option></select></label>
        <label><Text mb={1} fontSize="xs" fontWeight="800">{l.scope}</Text><select style={control} value={draft.scope} onChange={(e) => setDraft((v) => ({ ...v, scope: e.target.value as DevOpsCredentialGroupInput["scope"], targetIds: [], instanceIds: [], visibleToUserIds: [] }))}>{credentialScopes.map((scope) => <option key={scope} value={scope}>{scopeLabels[scope]}</option>)}</select></label>
      </SimpleGrid>
      {draft.type === "application_accounts" && <HStack mt={3} p={3} borderRadius="md" bg="var(--apple-blue-soft)"><input type="checkbox" checked={draft.scope === "shared_for_all_users"} onChange={(e) => setDraft((v) => ({ ...v, scope: e.target.checked ? "shared_for_all_users" : "per_user", targetIds: [], instanceIds: [], visibleToUserIds: [] }))} /><Text fontSize="sm" fontWeight="750">{l.sharedToggle}</Text></HStack>}
      {linkOptions.length > 0 && <Box mt={4}><Text mb={2} fontSize="xs" fontWeight="800">{l.links}</Text><HStack gap={2} flexWrap="wrap">{linkOptions.map((option) => <label key={option.id} style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "6px 10px", border: "1px solid var(--apple-border)", borderRadius: 8 }}><input type="checkbox" checked={draft[linkKey].includes(option.id)} onChange={() => toggleId(linkKey, option.id)} /><Text fontSize="xs">{option.label}</Text></label>)}</HStack></Box>}
      <HStack justify="space-between" mt={5} mb={2}><Text fontSize="sm" fontWeight="850">{l.accounts}</Text><Button variant="secondary" onClick={() => setDraft((v) => ({ ...v, accounts: [...v.accounts, emptyAccount()] }))}>{l.addAccount}</Button></HStack>
      <VStack align="stretch" gap={3}>{draft.accounts.map((account, index) => <Box key={index} p={3} bg="var(--apple-surface-raised)" border="1px solid var(--apple-border)" borderRadius="md"><SimpleGrid columns={{ base: 1, md: 3 }} gap={2}><input aria-label={l.label} placeholder={l.label} style={control} value={account.label} onChange={(e) => setAccount(index, "label", e.target.value)} /><input aria-label={l.role} placeholder={l.role} style={control} value={account.role} onChange={(e) => setAccount(index, "role", e.target.value)} /><input aria-label={l.username} placeholder={l.username} style={control} value={account.username} onChange={(e) => setAccount(index, "username", e.target.value)} /><input type="password" aria-label={l.password} placeholder={l.password} style={control} value={account.password} onChange={(e) => setAccount(index, "password", e.target.value)} /><input type="password" aria-label={l.token} placeholder={l.token} style={control} value={account.token} onChange={(e) => setAccount(index, "token", e.target.value)} /><input aria-label={l.notes} placeholder={l.notes} style={control} value={account.notes} onChange={(e) => setAccount(index, "notes", e.target.value)} /></SimpleGrid>{draft.accounts.length > 1 && <HStack justify="end" mt={2}><Button variant="secondary" onClick={() => setDraft((v) => ({ ...v, accounts: v.accounts.filter((_, accountIndex) => accountIndex !== index) }))}>{l.remove}</Button></HStack>}</Box>)}</VStack>
      {formError && <Text mt={2} color="var(--apple-danger-text)" fontSize="sm">{formError}</Text>}<HStack justify="end" mt={3}><Button variant="secondary" onClick={close} disabled={busy}>{l.cancel}</Button><Button onClick={submit} disabled={busy}>{busy ? l.saving : l.save}</Button></HStack>
    </Box>}
    {message && <Text mb={3} color="var(--apple-success-text)" fontSize="sm" fontWeight="750">{message}</Text>}
    {!open && formError && <Text mb={3} color="var(--apple-danger-text)" fontSize="sm">{formError}</Text>}
    {isLoading ? <Text color="var(--apple-muted)">{l.loading}</Text> : error ? <Text color="var(--apple-danger-text)">{l.loadError}</Text> : groups.length === 0 ? <Box p={7} textAlign="center" border="1px dashed var(--apple-border)" borderRadius="md"><Text color="var(--apple-muted)" fontSize="sm">{l.empty}</Text></Box> : <SimpleGrid columns={{ base: 1, xl: 2 }} gap={3}>{groups.map((group) => <Box key={group._id} p={4} border="1px solid var(--apple-border-soft)" borderRadius="md"><HStack justify="space-between" align="start"><Box><Text fontWeight="850">{group.name}</Text><Text fontSize="xs" color="var(--apple-muted)">{group.type === "instance_access" ? l.instance : l.application} · {group.accounts.length} {l.accounts}</Text><Text mt={1} fontSize="xs" color="var(--apple-muted)">{l.links}: {group.instanceIds.length + group.targetIds.length + group.visibleToUserIds.length}</Text></Box><Badge colorPalette="blue">{scopeLabels[group.scope]}</Badge></HStack><VStack align="stretch" gap={1} mt={3}>{group.accounts.map((account, index) => <HStack key={`${account.label}-${index}`} justify="space-between"><Text fontSize="sm">{account.label} {account.role ? `· ${account.role}` : ""}</Text><Text fontSize="xs" color="var(--apple-muted)" dir="ltr">{account.username || "-"} {account.password || account.token ? "••••••" : ""}</Text></HStack>)}</VStack><HStack justify="end" mt={3}><Button variant="secondary" onClick={() => edit(group)}>{l.edit}</Button><Button variant="secondary" onClick={() => deleteGroup(group._id)} disabled={busy}>{l.remove}</Button></HStack></Box>)}</SimpleGrid>}
  </Box>;
}
