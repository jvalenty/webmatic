import React, { useEffect, useMemo, useState } from "react";
import { ProjectsAPI } from "./api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { Toaster } from "../../components/ui/sonner";
import { toast } from "sonner";
import { Calendar } from "../../components/ui/calendar";
import { Calendar as CalendarIcon, Rocket, Plus, RefreshCw } from "lucide-react";

const StatusBadge = ({ status }) => {
  const color = status === "planned" ? "bg-emerald-600" : status === "created" ? "bg-slate-700" : "bg-blue-600";
  return <Badge className={`${color} text-white`}>{status}</Badge>;
};

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState("auto");

  const load = async () => {
    try {
      setLoading(true);
      const list = await ProjectsAPI.list();
      setProjects(list);
      if (list.length) setSelected(list[0]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // ping health silently for diagnostics
    ProjectsAPI.health().catch(() => {});
  }, []);

  const createProject = async () => {
    if (!name.trim() || !description.trim()) {
      toast("Please fill name and description");
      return;
    }
    try {
      setCreating(true);
      const p = await ProjectsAPI.create({ name, description });
      setProjects((prev) => [p, ...prev]);
      setSelected(p);
      setName("");
      setDescription("");
      toast.success("Project created");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const scaffold = async (id) => {
    try {
      toast.loading("Generating plan...", { id: `scaffold-${id}` });
      const p = await ProjectsAPI.scaffold(id);
      setProjects((prev) => prev.map((x) => (x.id === id ? p : x)));
      setSelected(p.id === selected?.id ? p : selected);
      toast.success("Plan generated", { id: `scaffold-${id}` });
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate plan", { id: `scaffold-${id}` });
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210,20%,98%)]">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 grid place-items-center text-white shadow-md">WM</div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Webmatic.dev</h1>
              <p className="text-xs text-slate-500">AI-powered full-stack app generator</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" className="rounded-full">Docs</Button>
            <Button className="rounded-full bg-slate-900 hover:bg-slate-800"><Rocket size={16} className="mr-2" />Generate</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Creator */}
        <section className="lg:col-span-1">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Create a Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project name</label>
                <Input placeholder="e.g., SaaS CRM" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Describe your app</label>
                <Textarea rows={6} placeholder="Describe features, auth, payments, etc." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CalendarIcon size={14} /> Ready in seconds
                </div>
                <Button onClick={createProject} disabled={creating} className="rounded-full bg-slate-900 hover:bg-slate-800">
                  <Plus size={16} className="mr-2" />Create
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Planner</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar mode="single" className="rounded-xl border" />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Projects + Details */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-5 w-1/4" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-36" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((p) => (
                        <TableRow key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(p)}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell><StatusBadge status={p.status} /></TableCell>
                          <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Button variant="outline" size="sm" className="rounded-full" onClick={(e) => { e.stopPropagation(); setSelected(p); }}>
                                View
                              </Button>
                              <Button size="sm" className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={(e) => { e.stopPropagation(); scaffold(p.id); }}>
                                <RefreshCw size={14} className="mr-1" />Generate Plan
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="text-slate-500">Select a project to view details.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{selected.name}</h3>
                      <p className="text-sm text-slate-600">{selected.description}</p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  <Tabs defaultValue="plan" className="mt-4">
                    <TabsList>
                      <TabsTrigger value="plan">Plan</TabsTrigger>
                      <TabsTrigger value="api">API</TabsTrigger>
                      <TabsTrigger value="db">DB</TabsTrigger>
                    </TabsList>
                    <TabsContent value="plan">
                      {!selected.plan ? (
                        <div className="text-sm text-slate-500">No plan yet. Click "Generate Plan" on the project.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <PlanList title="Frontend" items={selected.plan.frontend} />
                          <PlanList title="Backend" items={selected.plan.backend} />
                          <PlanList title="Database" items={selected.plan.database} />
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="api">
                      <ul className="text-sm list-disc pl-6 space-y-1">
                        <li>GET /api/health</li>
                        <li>POST /api/projects</li>
                        <li>GET /api/projects</li>
                        <li>GET /api/projects/:id</li>
                        <li>POST /api/projects/:id/scaffold</li>
                      </ul>
                    </TabsContent>
                    <TabsContent value="db">
                      <ul className="text-sm list-disc pl-6 space-y-1">
                        <li>Collection: projects</li>
                        <li>Primary key: _id (UUID string)</li>
                        <li>Fields: id, name, description, status, plan, created_at, updated_at</li>
                      </ul>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 mt-10">
        <div className="max-w-7xl mx-auto px-6 text-xs text-slate-500 flex items-center justify-between">
          <div>© {new Date().getFullYear()} Webmatic.dev</div>
          <div>Staging build • Internal use</div>
        </div>
      </footer>

      <Toaster richColors position="top-right" />
    </div>
  );
}

function PlanList({ title, items }) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>
      <div className="rounded-xl border p-4 bg-white/70">
        <ul className="text-sm space-y-1 list-disc pl-5">
          {items.map((it, idx) => (
            <li key={idx}>{it}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}