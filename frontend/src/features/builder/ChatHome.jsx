import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { ProjectsAPI } from "../projects/api";
import AuthBar from "../auth/AuthBar";
import { Link, useNavigate } from "react-router-dom";

const getModelsForProvider = (prov) => {
  if (prov === "claude") return ["claude-4-sonnet"]; 
  if (prov === "gpt") return ["gpt-5"]; 
  return ["claude-4-sonnet", "gpt-5"]; // auto
};

export default function ChatHome() {
  const [authed, setAuthed] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("claude");
  const [model, setModel] = useState("claude-4-sonnet");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const list = await ProjectsAPI.list();
        setProjects(list);
      } catch (e) {
        // ignore
      } finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const allowed = getModelsForProvider(provider);
    if (!allowed.includes(model)) setModel(allowed[0]);
  }, [provider]);

  const firstWordsName = useMemo(() => {
    const x = prompt.trim().split(/\s+/).slice(0, 6).join(" ");
    if (!x) return "Untitled Project";
    return x.charAt(0).toUpperCase() + x.slice(1);
  }, [prompt]);

  const onCreateFromPrompt = async () => {
    if (!prompt.trim()) { toast("Type what you want to build"); return; }
    try {
      setCreating(true);
      const proj = await ProjectsAPI.create({ name: firstWordsName, description: prompt.trim() });
      toast.success("Project created");
      // immediately trigger plan generation
      await ProjectsAPI.scaffold(proj.id, provider, model);
      window.location.href = `/#/projects?open=${proj.id}`; // in case BrowserRouter fallback; Navigate not possible here
    } catch (e) {
      console.error(e);
      toast.error("Failed to create from prompt");
    } finally { setCreating(false); }
  };

  return (
    <div className="min-h-screen bg-[hsl(210,20%,98%)]">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 grid place-items-center text-white shadow-md">WM</div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Webmatic.dev</h1>
              <p className="text-xs text-slate-500">AI-powered builder</p>
            </div>
          </div>
          <AuthBar onAuthChange={(ok) => setAuthed(!!ok)} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Centered chat-like box */}
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-6 space-y-4">
              <div className="text-center text-sm text-slate-500">Describe what you want to build</div>
              <Textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Build a SaaS CRM with auth, billing, and analytics" />
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">Project name: <span className="font-medium text-slate-700">{firstWordsName}</span></div>
                <div className="flex items-center gap-2">
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="w-[140px] rounded-full"><SelectValue placeholder="Provider" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="gpt">GPT</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="w-[180px] rounded-full"><SelectValue placeholder="Model" /></SelectTrigger>
                    <SelectContent>
                      {getModelsForProvider(provider).map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={onCreateFromPrompt} disabled={!authed || creating}>
                    {creating ? "Creating…" : "Start Building"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project grid 4 x N */}
        <div className="mt-10">
          <div className="text-sm font-semibold mb-3">Your projects</div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="h-28 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-sm text-slate-500">No projects yet. Start by describing what you want to build above.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {projects.map((p) => (
                <a key={p.id} href={`/#/project/${p.id}`} className="block group">
                  <Card className="border-slate-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="text-sm font-medium line-clamp-1">{p.name}</div>
                      <div className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</div>
                      <div className="text-[10px] mt-2 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</div>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}