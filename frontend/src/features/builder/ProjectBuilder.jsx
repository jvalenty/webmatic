import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ProjectsAPI } from "../projects/api";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";
import AuthBar from "../auth/AuthBar";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

const getModelsForProvider = (prov) => {
  if (prov === "claude") return ["claude-4-sonnet"]; 
  if (prov === "gpt") return ["gpt-5"]; 
  return ["claude-4-sonnet", "gpt-5"]; // auto
};

export default function ProjectBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);

  // Current project
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Projects for Home tab grid
  const [projects, setProjects] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  // Agent chat
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState("");
  const [provider, setProvider] = useState("claude");
  const [model, setModel] = useState("claude-4-sonnet");
  const [running, setRunning] = useState(false);

  // Home tab chat
  const [homePrompt, setHomePrompt] = useState("");
  const [homeProvider, setHomeProvider] = useState("claude");
  const [homeModel, setHomeModel] = useState("claude-4-sonnet");
  const [creating, setCreating] = useState(false);

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

  // Load projects for Home tab
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

  // Adjust models when providers change
  useEffect(() => {
    const allowed = getModelsForProvider(provider);
    if (!allowed.includes(model)) setModel(allowed[0]);
  }, [provider]);
  useEffect(() => {
    const allowed = getModelsForProvider(homeProvider);
    if (!allowed.includes(homeModel)) setHomeModel(allowed[0]);
  }, [homeProvider]);

  // Agent: local chat persistence
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

  const firstWordsName = useMemo(() => {
    const x = homePrompt.trim().split(/\s+/).slice(0, 6).join(" ");
    if (!x) return "Untitled Project";
    return x.charAt(0).toUpperCase() + x.slice(1);
  }, [homePrompt]);

  const createFromHomePrompt = async () => {
    if (!homePrompt.trim()) { toast("Type what you want to build"); return; }
    try {
      setCreating(true);
      const proj = await ProjectsAPI.create({ name: firstWordsName, description: homePrompt.trim() });
      await ProjectsAPI.scaffold(proj.id, homeProvider, homeModel);
      navigate(`/project/${proj.id}`);
      toast.success("Project created");
    } catch (e) { console.error(e); toast.error("Failed to create"); } finally { setCreating(false); }
  };

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

      {/* Body (no project sidebar) */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="agent">
          <TabsList className="border-b border-slate-200 rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger value="home" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 hover:text-slate-800">Home</TabsTrigger>
            <TabsTrigger value="agent" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 hover:text-slate-800">Agent</TabsTrigger>
            <TabsTrigger value="files" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 hover:text-slate-800">Files</TabsTrigger>
          </TabsList>

          {/* Home Tab: centered chat + project cards grid */}
          <TabsContent value="home">
            <div className="max-w-3xl mx-auto mt-4">
              <div className="border border-slate-200 bg-white p-6 rounded-none">
                <div className="text-center text-sm text-slate-500">Describe what you want to build</div>
                <Textarea rows={5} value={homePrompt} onChange={(e) => setHomePrompt(e.target.value)} placeholder="e.g., Build a SaaS CRM with auth, billing, and analytics" className="mt-3" />
                <div className="flex items-center justify-between gap-3 mt-3">
                  <div className="text-xs text-slate-500">Project name: <span className="font-medium text-slate-700">{firstWordsName}</span></div>
                  <div className="flex items-center gap-2">
                    <Select value={homeProvider} onValueChange={setHomeProvider}>
                      <SelectTrigger className="w-[140px] rounded-full"><SelectValue placeholder="Provider" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude">Claude</SelectItem>
                        <SelectItem value="gpt">GPT</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={homeModel} onValueChange={setHomeModel}>
                      <SelectTrigger className="w-[180px] rounded-full"><SelectValue placeholder="Model" /></SelectTrigger>
                      <SelectContent>
                        {getModelsForProvider(homeProvider).map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={createFromHomePrompt} disabled={!authed || creating}>
                      {creating ? "Creating…" : "Start Building"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-sm font-semibold mb-3">Your projects</div>
              {listLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-28 border border-slate-200 bg-white animate-pulse" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-sm text-slate-500">No projects yet. Start above.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {projects.map((p) => (
                    <Link key={p.id} to={`/project/${p.id}`} className="block border border-slate-200 bg-white p-4 hover:shadow-sm transition rounded-none">
                      <div className="text-sm font-medium line-clamp-1">{p.name}</div>
                      <div className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</div>
                      <div className="text-[10px] mt-2 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Agent Tab: resizable columns with vertical handle, square corners */}
          <TabsContent value="agent">
            <div className="mt-4" style={{ height: "calc(100vh - 220px)" }}>
              <PanelGroup direction="horizontal">
                <Panel defaultSize={25} minSize={18} maxSize={50}>
                  <div className="h-full border border-slate-200 bg-white rounded-none flex flex-col">
                    <div className="px-4 py-2 text-xs text-slate-500 border-b">Chat</div>
                    <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
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
                    <div className="border-t p-3 space-y-2">
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
                  </div>
                </Panel>
                <PanelResizeHandle className="w-1 bg-slate-200 hover:bg-slate-300 cursor-col-resize" />
                <Panel minSize={40} defaultSize={75}>
                  <div className="h-full border border-slate-200 bg-white rounded-none flex flex-col">
                    <div className="px-4 py-2 border-b">
                      <Tabs defaultValue="preview">
                        <TabsList>
                          <TabsTrigger value="preview">Preview</TabsTrigger>
                          <TabsTrigger value="code">Code</TabsTrigger>
                        </TabsList>
                        <TabsContent value="preview">
                          <div className="h-[calc(100vh-300px)] grid place-items-center text-slate-500">
                            <div>
                              <div className="text-sm text-center">No page generated yet</div>
                              <div className="text-xs text-center mt-1">Start a conversation in the Agent tab to see your landing page here</div>
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="code">
                          <div className="p-4 overflow-auto">
                            {loading ? (
                              <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 w-2/3" />)}</div>
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
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </Panel>
              </PanelGroup>
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <div className="mt-4 border border-slate-200 bg-white rounded-none p-6 text-sm text-slate-500">Files view coming soon.</div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PlanColumn({ title, items }) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2">{title}</div>
      <div className="border border-slate-200 bg-white rounded-none p-3">
        <ul className="text-sm list-disc pl-5 space-y-1">
          {items.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>
    </div>
  );
}