import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProjectsAPI } from "./api";
import { TemplatesAPI } from "../templates/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Toaster } from "../../components/ui/sonner";
import { toast } from "sonner";
import { Calendar } from "../../components/ui/calendar";
import { Calendar as CalendarIcon, Rocket, Plus, RefreshCw, Scale } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import AuthBar from "../auth/AuthBar";

const StatusBadge = ({ status }) => {
  const color = status === "planned" ? "bg-emerald-600" : status === "created" ? "bg-slate-700" : "bg-blue-600";
  return <Badge className={`${color} text-white`}>{status}</Badge>;
};

const getModelsForProvider = (prov) => {
  if (prov === "claude") return ["claude-4-sonnet"];
  if (prov === "gpt") return ["gpt-5"];
  return ["claude-4-sonnet", "gpt-5"]; // auto
};

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState("auto");
  const [model, setModel] = useState("claude-4-sonnet");
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateNames, setTemplateNames] = useState({});
  const [authed, setAuthed] = useState(false);

  // compare state
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareData, setCompareData] = useState(null);

  useEffect(() => {
    // Adjust model when provider changes
    const allowed = getModelsForProvider(provider);
    if (!allowed.includes(model)) setModel(allowed[0]);
  }, [provider]);

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

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const list = await TemplatesAPI.list();
      setTemplates(list);
    } catch (e) {
      console.error(e);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadRuns = async (pid) => {
    if (!pid) return;
    try {
      setRunsLoading(true);
      const data = await ProjectsAPI.runs(pid);
      setRuns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setRunsLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadTemplates();
    ProjectsAPI.health().catch(() => {});
  }, []);

  useEffect(() => {
    if (selected?.id) loadRuns(selected.id);
  }, [selected?.id]);

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
      const p = await ProjectsAPI.scaffold(id, provider, model);
      setProjects((prev) => prev.map((x) => (x.id === id ? p : x)));
      setSelected(p.id === selected?.id ? p : selected);
      await loadRuns(id);
      toast.success("Plan generated", { id: `scaffold-${id}` });
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate plan", { id: `scaffold-${id}` });
    }
  };

  const createFromTemplate = async (tpl) => {
    try {
      const projName = templateNames[tpl.id] || tpl.name;
      toast.loading("Creating from template...", { id: `tpl-${tpl.id}` });
      const p = await TemplatesAPI.createFromTemplate({ template_id: tpl.id, name: projName, provider, model });
      setProjects((prev) => [p, ...prev]);
      setSelected(p);
      await loadRuns(p.id);
      toast.success("Project created from template", { id: `tpl-${tpl.id}` });
    } catch (e) {
      console.error(e);
      toast.error("Failed to create from template", { id: `tpl-${tpl.id}` });
    }
  };

  const compareProviders = async () => {
    if (!selected?.id) return;
    try {
      setCompareLoading(true);
      const data = await ProjectsAPI.compareProviders(selected.id);
      setCompareData(data);
      setCompareOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Comparison failed");
    } finally {
      setCompareLoading(false);
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
            <AuthBar onAuthChange={(ok) => setAuthed(!!ok)} />
            <Link to="/templates">
              <Button variant="secondary" className="rounded-full">Templates</Button>
            </Link>
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
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CalendarIcon size={14} /> Ready in seconds
                </div>
                <div className="flex items-center gap-2">
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="w-[160px] rounded-full">
                      <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="gpt">GPT</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="w-[200px] rounded-full">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelsForProvider(provider).map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={createProject} disabled={creating || !authed} className="rounded-full bg-slate-900 hover:bg-slate-800">
                    <Plus size={16} className="mr-2" />Create
                  </Button>
                </div>
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

          <div className="mt-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Templates</CardTitle>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-4 w-1/2 mt-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {templates.map((tpl) => (
                      <div key={tpl.id} className="rounded-xl border p-4 bg-white/70">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{tpl.name}</div>
                            <div className="text-xs text-slate-600">{tpl.description}</div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {tpl.tags?.map((t) => (
                                <Badge key={t} className="bg-slate-800 text-white">{t}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Input
                            placeholder={`${tpl.name} project name`}
                            value={templateNames[tpl.id] || ""}
                            onChange={(e) => setTemplateNames((prev) => ({ ...prev, [tpl.id]: e.target.value }))}
                          />
                          <Button className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={() => createFromTemplate(tpl)} disabled={!authed}>
                            Create from Template
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Projects + Details */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Projects</CardTitle>
              <div className="flex items-center gap-2">
                <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-full" onClick={compareProviders} disabled={!selected || !authed}>
                      <Scale size={14} className="mr-2" />Compare Providers
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Provider comparison</DialogTitle>
                    </DialogHeader>
                    {compareLoading ? (
                      <div className="grid grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                          <Skeleton key={i} className="h-4 w-full" />
                        ))}
                      </div>
                    ) : !compareData ? (
                      <div className="text-sm text-slate-500">No comparison data</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CompareColumn title={`${compareData.baseline.provider} • ${compareData.baseline.model}`} plan={compareData.baseline.plan} />
                        {compareData.variants.map((v, idx) => (
                          <CompareColumn key={idx} title={`${v.provider} • ${v.model}`} plan={v.plan} />
                        ))}
                        <div>
                          <div className="text-sm font-semibold mb-2">Diff</div>
                          <DiffBlock label="Frontend" data={compareData.diff.frontend} />
                          <DiffBlock label="Backend" data={compareData.diff.backend} />
                          <DiffBlock label="Database" data={compareData.diff.database} />
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
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
                              <Button size="sm" className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={(e) => { e.stopPropagation(); scaffold(p.id); }} disabled={!authed}>
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
                      <TabsTrigger value="runs">Runs</TabsTrigger>
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
                        <li>POST /api/projects/from-template</li>
                        <li>POST /api/projects/:id/compare-providers</li>
                      </ul>
                    </TabsContent>
                    <TabsContent value="db">
                      <ul className="text-sm list-disc pl-6 space-y-1">
                        <li>Collections: projects, runs, templates</li>
                        <li>Primary keys: _id (UUID string)</li>
                        <li>Projects: id, name, description, status, plan, created_at, updated_at</li>
                      </ul>
                    </TabsContent>
                    <TabsContent value="runs">
                      {runsLoading ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          ))}
                        </div>
                      ) : runs.length === 0 ? (
                        <div className="text-sm text-slate-500">No runs yet.</div>
                      ) : (
                        <div className="overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>When</TableHead>
                                <TableHead>Provider</TableHead>
                                <TableHead>Mode</TableHead>
                                <TableHead>Counts</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {runs.map((r) => (
                                <TableRow key={r.id}>
                                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                                  <TableCell className="capitalize">{r.provider}</TableCell>
                                  <TableCell className="capitalize">{r.mode}</TableCell>
                                  <TableCell>{`F:${r?.plan_counts?.frontend || 0} • B:${r?.plan_counts?.backend || 0} • D:${r?.plan_counts?.database || 0}`}</TableCell>
                                  <TableCell>{r.status}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
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

function CompareColumn({ title, plan }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="space-y-4">
        <PlanList title="Frontend" items={plan.frontend || []} />
        <PlanList title="Backend" items={plan.backend || []} />
        <PlanList title="Database" items={plan.database || []} />
      </div>
    </div>
  );
}

function DiffBlock({ label, data }) {
  if (!data) return <div className="text-sm text-slate-500">No diff</div>;
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
      <div className="grid grid-cols-1 gap-2">
        <div className="rounded-lg border p-2">
          <div className="text-xs text-slate-500 mb-1">Only in baseline</div>
          <ul className="text-xs list-disc pl-5 space-y-1">
            {data.only_in_a?.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border p-2">
          <div className="text-xs text-slate-500 mb-1">Only in variant</div>
          <ul className="text-xs list-disc pl-5 space-y-1">
            {data.only_in_b?.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border p-2">
          <div className="text-xs text-slate-500 mb-1">Overlap</div>
          <ul className="text-xs list-disc pl-5 space-y-1">
            {data.overlap?.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}