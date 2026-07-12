import { Box, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/shared/lib/getApiErrorMessage";
import Button from "@/shared/ui/primitives/Button";
import Input from "@/shared/ui/primitives/Input";
import Select from "@/shared/ui/primitives/Select";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import { useGetDevopsWorkspaceQuery, useSaveDevopsWorkspaceMutation, type ApplicationEndpoint, type AuthenticationAccount, type DevopsInfo, type SecretEdit } from "../api/devopsApi";

const id = () => globalThis.crypto.randomUUID();
const blankAccount = (): AuthenticationAccount => ({ id: id(), authenticationMethod: "username_password", username: "", password: { value: "" } });
const blankEndpoint = (): ApplicationEndpoint => ({ id: id(), url: "", ipAddress: "", port: undefined, description: "", authenticationAccounts: [] });
const unchanged = (value: unknown): SecretEdit => value && typeof value === "object" && "isSet" in value ? { unchanged: true } : (value as SecretEdit);
const hydrate = (info: DevopsInfo): DevopsInfo => ({ ...info, sharedVm: info.sharedVm ? { endpoints: info.sharedVm.endpoints.map((e) => ({ ...e, authenticationAccounts: e.authenticationAccounts.map((a) => ({ ...a, password: unchanged(a.password), otp: a.otp ? { ...a.otp, secret: unchanged(a.otp.secret) } : undefined })) })) } : undefined, separateVm: info.separateVm ? { ...info.separateVm, vmPassword: unchanged(info.separateVm.vmPassword), users: info.separateVm.users.map((u) => ({ ...u, serverPassword: unchanged(u.serverPassword), endpoints: u.endpoints.map((e) => ({ ...e, authenticationAccounts: e.authenticationAccounts.map((a) => ({ ...a, password: unchanged(a.password), otp: a.otp ? { ...a.otp, secret: unchanged(a.otp.secret) } : undefined })) })) })) } : undefined });

function SecretField({ label, value, onChange }: { label: string; value: SecretEdit; onChange: (value: SecretEdit) => void }) {
  const saved = "unchanged" in value;
  return <Input label={label} type="password" value={saved ? "" : value.value} placeholder={saved ? "Saved — type to replace" : ""} onChange={(event) => onChange({ value: event.target.value })} />;
}

function EndpointEditor({ endpoint, requireAddress, onChange, onRemove }: { endpoint: ApplicationEndpoint; requireAddress: boolean; onChange: (endpoint: ApplicationEndpoint) => void; onRemove: () => void }) {
  const setAccount = (index: number, account: AuthenticationAccount) => onChange({ ...endpoint, authenticationAccounts: endpoint.authenticationAccounts.map((item, i) => i === index ? account : item) });
  return <Box border="1px solid" borderColor="var(--apple-border)" borderRadius="md" p={4}>
    <HStack justify="space-between"><Heading size="sm">Application endpoint</Heading><Button variant="secondary" onClick={onRemove}>Remove</Button></HStack>
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={3}>
      <Input label="URL (optional)" value={endpoint.url || ""} onChange={(e) => onChange({ ...endpoint, url: e.target.value })} />
      <Input label={`IP address${requireAddress ? " *" : ""}`} value={endpoint.ipAddress || ""} onChange={(e) => onChange({ ...endpoint, ipAddress: e.target.value })} />
      <Input label={`Port${requireAddress ? " *" : ""}`} type="number" min={1} max={65535} value={endpoint.port ?? ""} onChange={(e) => onChange({ ...endpoint, port: e.target.value ? Number(e.target.value) : undefined })} />
      <Input label="Description" value={endpoint.description || ""} onChange={(e) => onChange({ ...endpoint, description: e.target.value })} />
    </SimpleGrid>
    <VStack align="stretch" gap={3} mt={4}>{endpoint.authenticationAccounts.map((account, index) => <Box key={account.id} bg="var(--apple-surface-subtle)" borderRadius="md" p={3}>
      <HStack justify="space-between"><Text fontWeight="800">Authentication account</Text><Button variant="secondary" onClick={() => onChange({ ...endpoint, authenticationAccounts: endpoint.authenticationAccounts.filter((_, i) => i !== index) })}>Remove</Button></HStack>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={3}>
        <Select label="Authentication method" value={account.authenticationMethod} onChange={(e) => setAccount(index, { ...account, authenticationMethod: e.target.value as AuthenticationAccount["authenticationMethod"], otp: e.target.value === "username_password_otp" ? (account.otp || { type: "totp", secret: { value: "" } }) : undefined })}><option value="username_password">Username and password</option><option value="username_password_otp">Username, password and OTP</option></Select>
        <Input label="Username" value={account.username} onChange={(e) => setAccount(index, { ...account, username: e.target.value })} />
        <SecretField label="Password" value={account.password} onChange={(password) => setAccount(index, { ...account, password })} />
        {account.otp && <><Input label="OTP type" value={account.otp.type} onChange={(e) => setAccount(index, { ...account, otp: { ...account.otp!, type: e.target.value } })} /><SecretField label="OTP secret" value={account.otp.secret} onChange={(secret) => setAccount(index, { ...account, otp: { ...account.otp!, secret } })} /><Input label="Delivery method" value={account.otp.deliveryMethod || ""} onChange={(e) => setAccount(index, { ...account, otp: { ...account.otp!, deliveryMethod: e.target.value } })} /></>}
      </SimpleGrid>
    </Box>)}</VStack>
    <Button variant="secondary" mt={3} onClick={() => onChange({ ...endpoint, authenticationAccounts: [...endpoint.authenticationAccounts, blankAccount()] })}>Add authentication account</Button>
  </Box>;
}

export default function DevopsWorkspace({ projectId }: { projectId: string }) {
  const { data, error, isLoading } = useGetDevopsWorkspaceQuery(projectId);
  const [save, saveState] = useSaveDevopsWorkspaceMutation();
  const [form, setForm] = useState<DevopsInfo | null>(null); const [dirty, setDirty] = useState(false); const [review, setReview] = useState(false);
  // The API snapshot seeds a long-lived local draft exactly once; later query refreshes must not overwrite unsaved work.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (data && !form) setForm(data.info ? hydrate(data.info) : { deploymentMode: "shared_vm", sharedVm: { endpoints: [] } }); }, [data, form]);
  useEffect(() => { const handler = (event: globalThis.BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } }; globalThis.addEventListener("beforeunload", handler); return () => globalThis.removeEventListener("beforeunload", handler); }, [dirty]);
  const change = (next: DevopsInfo) => { setForm(next); setDirty(true); setReview(false); };
  const users = useMemo(() => data?.assignedUsers || [], [data]);
  if (isLoading) return <LoadingScreen text="Loading DevOps information..." />; if (error) return <ErrorState title="DevOps information unavailable" error={error} />; if (!form) return null;
  const endpoints = form.sharedVm?.endpoints || [];
  const submit = async () => { try { await save({ projectId, info: form }).unwrap(); setDirty(false); setReview(false); toast.success("DevOps information saved"); } catch (e) { toast.error(getApiErrorMessage(e, "Could not save DevOps information")); } };
  return <Box border="1px solid" borderColor="var(--apple-border)" borderRadius="md" p={{ base: 4, md: 6 }}>
    <Heading size="md">DevOps Information</Heading><Text color="var(--apple-muted)" mt={1}>OVF deployment, connection details, endpoints, and assigned credentials.</Text>
    <Select label="OVF deployment mode" mt={4} value={form.deploymentMode} onChange={(e) => change(e.target.value === "shared_vm" ? { deploymentMode: "shared_vm", sharedVm: form.sharedVm || { endpoints: [] } } : { deploymentMode: "separate_vm_per_user", separateVm: form.separateVm || { serverIpAddress: "", serverPort: 22, vmUsername: "", vmPassword: { value: "" }, users: users.map((u) => ({ assignmentId: u.assignmentId, userId: u.userId, serverUsername: "", serverPassword: { value: "" }, vmIpAddress: "", vmPort: 22, endpoints: [] })) } })}><option value="shared_vm">One shared VM</option><option value="separate_vm_per_user">Separate VM per assigned user</option></Select>
    {form.deploymentMode === "shared_vm" && <VStack align="stretch" gap={4} mt={5}>{endpoints.map((endpoint, index) => <EndpointEditor key={endpoint.id} endpoint={endpoint} requireAddress={false} onChange={(value) => change({ ...form, sharedVm: { endpoints: endpoints.map((item, i) => i === index ? value : item) } })} onRemove={() => change({ ...form, sharedVm: { endpoints: endpoints.filter((_, i) => i !== index) } })} />)}<Button variant="secondary" onClick={() => change({ ...form, sharedVm: { endpoints: [...endpoints, blankEndpoint()] } })}>Add endpoint</Button></VStack>}
    {form.deploymentMode === "separate_vm_per_user" && form.separateVm && <VStack align="stretch" gap={5} mt={5}><SimpleGrid columns={{ base: 1, md: 2 }} gap={3}><Input label="Shared laboratory server IP" value={form.separateVm.serverIpAddress} onChange={(e) => change({ ...form, separateVm: { ...form.separateVm!, serverIpAddress: e.target.value } })} /><Input label="Shared laboratory server port" type="number" value={form.separateVm.serverPort} onChange={(e) => change({ ...form, separateVm: { ...form.separateVm!, serverPort: Number(e.target.value) } })} /><Input label="Shared VM username" value={form.separateVm.vmUsername} onChange={(e) => change({ ...form, separateVm: { ...form.separateVm!, vmUsername: e.target.value } })} /><SecretField label="Shared VM password" value={form.separateVm.vmPassword} onChange={(value) => change({ ...form, separateVm: { ...form.separateVm!, vmPassword: value } })} /></SimpleGrid>
      {form.separateVm.users.map((entry, userIndex) => { const identity = users.find((u) => u.assignmentId === entry.assignmentId); return <Box key={entry.assignmentId} border="1px solid" borderColor="var(--apple-border)" borderRadius="md" p={4}><Heading size="sm">{identity?.fullName || entry.userId}</Heading><Text color="var(--apple-muted)" fontSize="sm">{identity?.username} · {identity?.role} · {entry.userId}</Text><SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={3}><Input label="Server username" value={entry.serverUsername} onChange={(e) => { const next = [...form.separateVm!.users]; next[userIndex] = { ...entry, serverUsername: e.target.value }; change({ ...form, separateVm: { ...form.separateVm!, users: next } }); }} /><SecretField label="Server password" value={entry.serverPassword} onChange={(value) => { const next = [...form.separateVm!.users]; next[userIndex] = { ...entry, serverPassword: value }; change({ ...form, separateVm: { ...form.separateVm!, users: next } }); }} /><Input label="VM IP address" value={entry.vmIpAddress} onChange={(e) => { const next = [...form.separateVm!.users]; next[userIndex] = { ...entry, vmIpAddress: e.target.value }; change({ ...form, separateVm: { ...form.separateVm!, users: next } }); }} /><Input label="VM port" type="number" value={entry.vmPort} onChange={(e) => { const next = [...form.separateVm!.users]; next[userIndex] = { ...entry, vmPort: Number(e.target.value) }; change({ ...form, separateVm: { ...form.separateVm!, users: next } }); }} /></SimpleGrid><VStack align="stretch" gap={3} mt={4}>{entry.endpoints.map((endpoint, endpointIndex) => <EndpointEditor key={endpoint.id} endpoint={endpoint} requireAddress onChange={(value) => { const next = [...form.separateVm!.users]; next[userIndex] = { ...entry, endpoints: entry.endpoints.map((item, i) => i === endpointIndex ? value : item) }; change({ ...form, separateVm: { ...form.separateVm!, users: next } }); }} onRemove={() => { const next = [...form.separateVm!.users]; next[userIndex] = { ...entry, endpoints: entry.endpoints.filter((_, i) => i !== endpointIndex) }; change({ ...form, separateVm: { ...form.separateVm!, users: next } }); }} />)}<Button variant="secondary" onClick={() => { const next = [...form.separateVm!.users]; next[userIndex] = { ...entry, endpoints: [...entry.endpoints, blankEndpoint()] }; change({ ...form, separateVm: { ...form.separateVm!, users: next } }); }}>Add application endpoint</Button></VStack></Box>; })}</VStack>}
    {review && <Box mt={5} p={4} bg="var(--apple-surface-subtle)" borderRadius="md"><Text fontWeight="800">Review before saving</Text><Text fontSize="sm">Mode: {form.deploymentMode}; assigned users: {form.separateVm?.users.length || 0}; endpoints: {form.sharedVm?.endpoints.length || form.separateVm?.users.reduce((sum, user) => sum + user.endpoints.length, 0) || 0}. Saved secrets remain masked and are only replaced when a new value is entered.</Text></Box>}
    <HStack mt={5} justify="end"><Button variant="secondary" disabled={!dirty} onClick={() => setReview(true)}>Review</Button><Button disabled={!dirty || !review || saveState.isLoading} onClick={submit}>{saveState.isLoading ? "Saving..." : "Save DevOps information"}</Button></HStack>
  </Box>;
}
