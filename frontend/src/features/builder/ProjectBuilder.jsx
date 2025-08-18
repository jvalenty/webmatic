import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ProjectsAPI, BuilderAPI } from "../projects/api";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { cn } from "../../lib/utils";

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
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Home tab chat
  const [homePrompt, setHomePrompt] = useState("");
  const [homeProvider, setHomeProvider] = useState("claude");
  const [creating, setCreating] = useState(false);

  // Load current project
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const p = await ProjectsAPI.get(id);
        setProject(p);
        // Load artifacts into right panel on project switch
        if (p?.artifacts?.html_preview) setRightTab("preview");
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
  // provider-only now; model auto-handled by backend

  // provider-only now for Home tab as well; model auto-handled by backend


  // Load chat from backend when project changes
  useEffect(() => {
    const loadChat = async () => {
      try {
        const data = await BuilderAPI.getChat(id);
        setChat(data.messages || []);
      } catch (e) { /* ignore */ }
    };
    loadChat();
  }, [id]);

  const send = async () => {
    if (!msg.trim()) return;
    const newMsg = { role: "user", content: msg };
    setChat((c) => [...c, newMsg]);
    setMsg("");
    try {
      setRunning(true);
      setBusy(true);
      setErrorMsg("");
      // Require auth for generation flow per your choice
      await BuilderAPI.appendChat(id, newMsg);
      const out = await BuilderAPI.generate(id, provider, newMsg.content);
      // Attach artifacts to project in memory for display
      setProject((p) => ({ ...(p || {}), artifacts: { files: out.files || [], html_preview: out.html_preview || "" } }));
      setRightTab("preview");
      toast.success("Generated");
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail || e?.message || "Failed to generate";
      setErrorMsg(String(msg));
      toast.error(`Generate failed: ${msg}`);
    } finally { setRunning(false); setBusy(false); }
  };

  const counts = useMemo(() => ({
    f: project?.plan?.frontend?.length || 0,
    b: project?.plan?.backend?.length || 0,
    d: project?.plan?.database?.length || 0,
  }), [project]);

  const [rightTab, setRightTab] = useState("preview");

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
      await ProjectsAPI.scaffold(proj.id, homeProvider);
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
            <Link to="/" className="h-9 w-9 rounded-xl bg-slate-900 grid place-items-center text-white shadow-md">Ξ</Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">WΞBMΛTIC.dev</h1>
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
        <div className="mt-0" style={{ height: "calc(100vh - 180px)" }}>
          <PanelGroup direction="horizontal">
            {/* Left column with its own tabs (Home | Agent | Files) */}
            <Panel key={id} defaultSize={25} minSize={18} maxSize={50}>
              <div className="h-full border border-slate-200 bg-white rounded-none flex flex-col">
                <div className="px-3 pt-2 border-b">
                  <Tabs defaultValue="agent">
                    <TabsList className="border-b border-slate-200 rounded-none h-auto p-0 bg-transparent">
                      <TabsTrigger value="home" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 hover:text-slate-800">Home</TabsTrigger>
                      <TabsTrigger value="agent" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 hover:text-slate-800">Agent</TabsTrigger>
                      <TabsTrigger value="files" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 hover:text-slate-800">Files</TabsTrigger>
                    </TabsList>

                    {/* Home content inside left column */}
                    <TabsContent value="home">
                      <div className="p-3 space-y-3">
                        <Textarea rows={4} value={homePrompt} onChange={(e) => setHomePrompt(e.target.value)} placeholder="Describe what you want to build" />
                        <div className="flex items-center gap-2">
                          <Select value={homeProvider} onValueChange={setHomeProvider}>
                            <SelectTrigger className="w-[160px] rounded-full"><SelectValue placeholder="Provider" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="claude">Claude</SelectItem>
                              <SelectItem value="gpt">GPT</SelectItem>
                            </SelectContent>
                          </Select>

                        </div>
                        <Button className="rounded-full bg-slate-900 hover:bg-slate-800 w-full" onClick={createFromHomePrompt} disabled={creating}>
                          {creating ? "Creating…" : "Start Building"}
                        </Button>
                        <div className="text-xs font-medium text-slate-600 pt-2">Your projects</div>
                        <div className="space-y-2 overflow-auto" style={{ maxHeight: "32vh" }}>
                          {listLoading ? (
                            [...Array(6)].map((_, i) => <div key={i} className="h-16 border border-slate-200 bg-white animate-pulse" />)
                          ) : projects.length === 0 ? (
                            <div className="text-xs text-slate-500">No projects yet.</div>
                          ) : (
                            projects.map((p) => (
                              <Link key={p.id} to={`/project/${p.id}`} className="block border border-slate-200 bg-white p-3 hover:shadow-sm transition rounded-none">
                                <div className="text-xs font-medium line-clamp-1">{p.name}</div>
                                <div className="text-[10px] text-slate-500 line-clamp-2 mt-1">{p.description}</div>
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Agent chat inside left column */}
                    <TabsContent value="agent">
                      <div className="flex-1 flex flex-col">
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
                              <SelectTrigger className="w-[160px] rounded-full"><SelectValue placeholder="Provider" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="claude">Claude</SelectItem>
                                <SelectItem value="gpt">GPT</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={send} disabled={running}>{running ? "Generating…" : "Send"}</Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Files placeholder inside left column */}
                    <TabsContent value="files">
                      <div className="p-4 text-xs text-slate-500">Files view coming soon.</div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-slate-200 hover:bg-slate-300 cursor-col-resize" />

            {/* Right column with its own tabs (Preview | Code) */}
            <Panel minSize={40} defaultSize={75}>
              <div className="h-full border border-slate-200 bg-white rounded-none flex flex-col">
                <div className="px-4 pt-2 border-b">
                  <Tabs value={rightTab} onValueChange={setRightTab}>
                    <TabsList className="border-b border-slate-200 rounded-none h-auto p-0 bg-transparent">
                      <TabsTrigger value="preview" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 hover:text-slate-800">Preview</TabsTrigger>
                      <TabsTrigger value="code" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 hover:text-slate-800">Code</TabsTrigger>
                    </TabsList>

                    <TabsContent value="preview">
                      {project?.artifacts?.html_preview ? (
                        <iframe title="preview" className="w-full" style={{ height: "calc(100vh - 300px)", border: "0" }} srcDoc={project.artifacts.html_preview} />
                      ) : (
                        <div className="h-[calc(100vh-300px)] grid place-items-center text-slate-500">
                          <div>
                            <div className="text-sm text-center">No page generated yet</div>
                            <div className="text-xs text-center mt-1">Start a conversation in the Agent tab to see your landing page here</div>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="code">
                      <div className="p-0 h-[calc(100vh-260px)] grid grid-cols-12">
                        <div className="col-span-4 border-r overflow-auto">
                          <ul className="text-xs">
                            {(project?.artifacts?.files || []).map((f, i) => (
                              <li key={i} className="px-3 py-2 border-b truncate">{f.path}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="col-span-8 overflow-auto p-4">
                          {busy ? (<div className="text-xs text-slate-500">Generating…</div>) : null}
                          {errorMsg ? (<div className="text-xs text-red-600">{errorMsg}</div>) : null}
                          {project?.artifacts?.files?.length ? (
                            <pre className="text-xs whitespace-pre-wrap">{project.artifacts.files[0].content}</pre>
                          ) : (
                            <div className="text-xs text-slate-500">No files yet</div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
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