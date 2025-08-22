import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "../../components/ui/dropdown-menu";
import { toast } from "sonner";
import { ProjectsAPI, BuilderAPI } from "../projects/api";
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

  // provider-only selector; model is chosen server-side


  const firstWordsName = useMemo(() => {
    const x = prompt.trim().split(/\s+/).slice(0, 6).join(" ");
    if (!x) return "Untitled Project";
    return x.charAt(0).toUpperCase() + x.slice(1);
  }, [prompt]);

  const navigate = useNavigate();

  const onCreateFromPrompt = async () => {
    if (!prompt.trim()) { toast("Type what you want to build"); return; }
    try {
      setCreating(true);
      const proj = await ProjectsAPI.create({ name: firstWordsName, description: prompt.trim() });
      // Immediately navigate, then trigger full generation (auth required)
      navigate(`/project/${proj.id}`);
      try {
        await BuilderAPI.appendChat(proj.id, { role: "user", content: prompt.trim() });
        await BuilderAPI.generate(proj.id, provider, prompt.trim());
        toast.success("Preview generated");
      } catch (err) {
        toast.error((err?.response?.data?.detail) || "Generation failed. Please login and try again.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create from prompt");
    } finally { setCreating(false); }
  };

  const onDeleteProject = async (e, projectId, projectName) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await ProjectsAPI.delete(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success("Project deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210,20%,98%)]">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 border-b border-slate-200">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 grid place-items-center text-white shadow-md">Ξ</div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">WΞBMΛTIC.dev</h1>
            </div>
          </div>
          <AuthBar onAuthChange={(ok) => setAuthed(!!ok)} />
        </div>
      </header>

      <main className="w-full px-6 py-10">
        {/* Centered chat-like box */}
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-6 space-y-4">
              <div className="text-center text-sm text-slate-500">Describe what you want to build</div>
              <Textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Build a SaaS CRM with auth, billing, and analytics" />
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">Project name: <span className="font-medium text-slate-700">{firstWordsName}</span></div>
                <div className="flex items-center gap-2">
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="w-[160px] rounded-full"><SelectValue placeholder="Provider" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="gpt">GPT</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={onCreateFromPrompt} disabled={creating}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="h-28 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-sm text-slate-500">No projects yet. Start by describing what you want to build above.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {projects.map((p) => (
                <Link key={p.id} to={`/project/${p.id}`} className="block group">
                  <Card className="border-slate-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="text-sm font-medium line-clamp-1">{p.name}</div>
                      <div className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</div>
                      <div className="text-[10px] mt-2 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}