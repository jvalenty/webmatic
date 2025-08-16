import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ProjectsAPI } from "../projects/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import AuthBar from "../auth/AuthBar";

const getModelsForProvider = (prov) => {
  if (prov === "claude") return ["claude-4-sonnet"]; 
  if (prov === "gpt") return ["gpt-5"]; 
  return ["claude-4-sonnet", "gpt-5"]; // auto
};

export default function ProjectBuilder() {
  const { id } = useParams();
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState("");
  const [provider, setProvider] = useState("claude");
  const [model, setModel] = useState("claude-4-sonnet");
  const [running, setRunning] = useState(false);

  // Load current project
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const p = await ProjectsAPI.get(id);
        setProject(p);
      } catch (e) { console.error(e);} finally { setLoading(false);} 
    };
    load();
  }, [id]);

  // Load all projects for sidebar
  useEffect(() => {
    const loadList = async () => {
      try {
        setListLoading(true);
        const list = await ProjectsAPI.list();
        setProjects(list);
      } catch (e) { console.error(e);} finally { setListLoading(false); }
    };
    loadList();
  }, [id]);

  useEffect(() => {
    const allowed = getModelsForProvider(provider);
    if (!allowed.includes(model)) setModel(allowed[0]);
  }, [provider]);

  // local chat persistence
  useEffect(() => {
    try {
      const key = `chat_${id}`;
      const saved = localStorage.getItem(key);
      if (saved) setChat(JSON.parse(saved));
    } catch {}
  }, [id]);

  useEffect(() => {
    try {
      localStorage.setItem(`chat_${id}`, JSON.stringify(chat));
    } catch {}
  }, [id, chat]);

  const send = async () => {
    if (!msg.trim()) return;
    const newMsg = { role: "user", content: msg };
    setChat((c) => [...c, newMsg]);
    setMsg("");
    try {
      setRunning(true);
      const updated = await ProjectsAPI.scaffold(id, provider, model);
      setProject(updated);
      toast.success("Plan updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update plan");
    } finally { setRunning(false); }
  };

  const counts = useMemo(() => ({
    f: project?.plan?.frontend?.length || 0,
    b: project?.plan?.backend?.length || 0,
    d: project?.plan?.database?.length || 0,
  }), [project]);

  return (
    <div className="min-h-screen bg-[hsl(210,20%,98%)]">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 grid place-items-center text-white shadow-md">WM</Link>
            <div>
              <div className="text-xs text-slate-500">WEBMATIC.dev</div>
              <h1 className="text-lg font-semibold tracking-tight">{project?.name || "Project"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user?.email ? <div className="text-sm text-slate-600">Welcome back, {user.email}</div> : null}
            <AuthBar onAuthChange={(ok, me) => { setAuthed(!!ok); if (me) setUser(me); }} />
          </div>
        </div>
      </header>

      {/* Body: Left sidebar + Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        {/* Left Projects Sidebar (25%) */}
        <aside className="col-span-12 md:col-span-3">
          <Card className="h-[calc(100vh-160px)] sticky top-[88px] overflow-hidden flex flex-col">
            <CardContent className="p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">All Projects</div>
                <div className="text-xs text-slate-500">{projects?.length || 0}</div>
              </div>
              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {listLoading ? (
                  [...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                ) : (
                  projects.map((p) => (
                    <Link key={p.id} to={`/project/${p.id}`} className={`block rounded-lg border p-3 bg-white/70 hover:shadow-sm transition ${p.id === id ? 'border-slate-900' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium line-clamp-1">{p.name}</div>
                        <Badge className="bg-black text-white rounded-full h-5 px-2 text-[10px]">active</Badge>
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</div>
                      <div className="text-[10px] mt-1 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Right Content (75%) */}
        <section className="col-span-12 md:col-span-9">
          <Tabs defaultValue="agent">
            <TabsList>
              <TabsTrigger value="agent">Agent</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            {/* Agent Tab: Chat + Plan */}
            <TabsContent value="agent">
              <div className="grid grid-cols-12 gap-6 mt-4">
                {/* Chat 25% */}
                <div className="col-span-12 lg:col-span-3">
                  <Card className="h-[calc(100vh-220px)] sticky top-[104px] flex flex-col">
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <div className="text-xs text-slate-500 mb-2">Chat</div>
                      <div className="flex-1 overflow-auto space-y-2">
                        {chat.length === 0 ? (
                          <div className="text-xs text-slate-400">Start chatting to refine the plan.</div>
                        ) : (
                          chat.map((m, i) => (
                            <div key={i} className={"text-sm " + (m.role === "user" ? "text-slate-800" : "text-slate-600")}>
                              {m.content}
                            </div>
                          ))
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        <Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ask to add auth, payments, testing…" />
                        <div className="flex items-center gap-2">
                          <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger className="w-[120px] rounded-full"><SelectValue placeholder="Provider" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="claude">Claude</SelectItem>
                              <SelectItem value="gpt">GPT</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={model} onValueChange={setModel}>
                            <SelectTrigger className="w-[160px] rounded-full"><SelectValue placeholder="Model" /></SelectTrigger>
                            <SelectContent>
                              {getModelsForProvider(provider).map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={send} disabled={!authed || running}>{running ? "Generating…" : "Send"}</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Output 75% */}
                <div className="col-span-12 lg:col-span-9 space-y-6">
                  <Card>
                    <CardContent className="p-4">
                      {loading ? (
                        <div className="space-y-2">
                          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 w-2/3" />)}
                        </div>
                      ) : !project?.plan ? (
                        <div className="text-sm text-slate-500">No plan yet. Send a message on the left to generate.</div>
                      ) : (
                        <div>
                          <div className="text-sm font-medium mb-2">Plan Overview</div>
                          <div className="text-xs text-slate-500 mb-4">Items • F:{counts.f} B:{counts.b} D:{counts.d}</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <PlanColumn title="Frontend" items={project.plan.frontend || []} />
                            <PlanColumn title="Backend" items={project.plan.backend || []} />
                            <PlanColumn title="Database" items={project.plan.database || []} />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files">
              <Card className="mt-4">
                <CardContent className="p-6">
                  <div className="text-sm text-slate-500">Files view coming soon.</div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview">
              <Card className="mt-4 h-[60vh] grid place-items-center">
                <CardContent className="p-6 text-center text-slate-500">
                  <div className="text-sm">No page generated yet</div>
                  <div className="text-xs mt-1">Start a conversation in the Agent tab to see your landing page here</div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
}

function PlanColumn({ title, items }) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2">{title}</div>
      <div className="rounded-xl border bg-white/70 p-3">
        <ul className="text-sm list-disc pl-5 space-y-1">
          {items.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>
    </div>
  );
}