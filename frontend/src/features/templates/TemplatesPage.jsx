import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TemplatesAPI } from "./api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Toaster } from "../../components/ui/sonner";
import { toast } from "sonner";
import { Eye, Rocket } from "lucide-react";
import AuthBar from "../auth/AuthBar";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState("auto");
  const [model, setModel] = useState("claude-4-sonnet");
  const [nameById, setNameById] = useState({});
  const [previewId, setPreviewId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [overridesDraftById, setOverridesDraftById] = useState({}); // id -> [{k, v}]
  const [authed, setAuthed] = useState(false);
  const navigate = useNavigate();

  const getModelsForProvider = (prov) => {
    if (prov === "claude") return ["claude-4-sonnet"];
    if (prov === "gpt") return ["gpt-5"];
    return ["claude-4-sonnet", "gpt-5"]; // auto
  };

  useEffect(() => {
    const allowed = getModelsForProvider(provider);
    if (!allowed.includes(model)) setModel(allowed[0]);
  }, [provider]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const list = await TemplatesAPI.list();
      setTemplates(list);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const openPreview = async (id) => {
    try {
      setPreviewLoading(true);
      setPreview(null);
      setPreviewId(id);
      const detail = await TemplatesAPI.get(id);
      setPreview(detail);
      setOverridesDraftById((prev) => prev[id] ? prev : { ...prev, [id]: [] });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load template");
    } finally {
      setPreviewLoading(false);
    }
  };

  const rowsFor = (id) => overridesDraftById[id] || [];
  const addRow = (id) => setOverridesDraftById((prev) => ({ ...prev, [id]: [...(prev[id] || []), { k: "", v: "" }] }));
  const updateRow = (id, index, field, value) => setOverridesDraftById((prev) => {
    const next = [...(prev[id] || [])];
    next[index] = { ...next[index], [field]: value };
    return { ...prev, [id]: next };
  });
  const removeRow = (id, index) => setOverridesDraftById((prev) => {
    const next = [...(prev[id] || [])];
    next.splice(index, 1);
    return { ...prev, [id]: next };
  });

  const overridesObject = (id) => {
    const rows = rowsFor(id);
    const obj = {};
    rows.forEach(({ k, v }) => {
      if (k && k.trim()) obj[k.trim()] = v;
    });
    return obj;
  };

  const createFromTemplate = async (tpl, withOverrides = false) => {
    try {
      const projName = nameById[tpl.id] || tpl.name;
      const overrides = withOverrides ? overridesObject(tpl.id) : undefined;
      toast.loading("Creating from template...", { id: `tpl-${tpl.id}` });
      const p = await TemplatesAPI.createFromTemplate({ template_id: tpl.id, name: projName, provider, model, overrides });
      toast.success("Project created", { id: `tpl-${tpl.id}` });
      navigate("/");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create from template", { id: `tpl-${tpl.id}` });
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(210,20%,98%)]">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 grid place-items-center text-white shadow-md">Ξ</div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">WΞBMΛTIC.dev</h1>
              <p className="text-xs text-slate-500">Kickstart with proven blueprints</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AuthBar onAuthChange={(ok) => setAuthed(!!ok)} />
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
              <SelectTrigger className="w-[220px] rounded-full">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {getModelsForProvider(provider).map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link to="/">
              <Button variant="secondary" className="rounded-full">Back to Projects</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="shadow-sm border-slate-200">
                <CardHeader>
                  <Skeleton className="h-5 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                  <div className="mt-4 flex items-center gap-3">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-36" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="shadow-sm border-slate-200 hover:shadow-md transition-shadow duration-150">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{tpl.name}</span>
                    <span className="text-xs text-slate-500">{tpl.category}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 min-h-12">{tpl.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tpl.tags?.map((t) => (
                      <Badge key={t} className="bg-slate-800 text-white">{t}</Badge>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="rounded-full">
                          <Eye size={14} className="mr-2" />Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{preview?.name || "Template"}</DialogTitle>
                        </DialogHeader>
                        {previewLoading ? (
                          <div className="space-y-2">
                            {[...Array(4)].map((_, i) => (
                              <Skeleton key={i} className="h-4 w-full" />
                            ))}
                          </div>
                        ) : (
                          <TemplatePreview id={tpl.id} load={openPreview} data={preview} activeId={previewId} rowsFor={rowsFor} addRow={addRow} updateRow={updateRow} removeRow={removeRow} onCreate={() => createFromTemplate(tpl, true)} />
                        )}
                      </DialogContent>
                    </Dialog>

                    <Input
                      placeholder={`${tpl.name} project name`}
                      value={nameById[tpl.id] || ""}
                      onChange={(e) => setNameById((prev) => ({ ...prev, [tpl.id]: e.target.value }))}
                    />
                    <Button className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={() => createFromTemplate(tpl, false)} disabled={!authed}>
                      <Rocket size={14} className="mr-2" />Create
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}

function TemplatePreview({ id, load, data, activeId, rowsFor, addRow, updateRow, removeRow, onCreate }) {
  useEffect(() => {
    if (!data || activeId !== id) load(id);
  }, [id, activeId, data, load]);

  const rows = rowsFor(id);

  return (
    <div className="space-y-4">
      {!data || activeId !== id ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : (
        <>
          {data.description && (
            <section>
              <h4 className="text-sm font-semibold mb-1">Description</h4>
              <p className="text-sm text-slate-600">{data.description}</p>
            </section>
          )}

          {data.entities?.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold mb-1">Entities</h4>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {data.entities.map((e, idx) => (
                  <li key={idx}>{e.name}: {Array.isArray(e.fields) ? e.fields.join(", ") : ""}</li>
                ))}
              </ul>
            </section>
          )}

          {data.api_endpoints?.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold mb-1">API Endpoints</h4>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {data.api_endpoints.map((ep, idx) => (
                  <li key={idx}>{ep}</li>
                ))}
              </ul>
            </section>
          )}

          {data.ui_structure?.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold mb-1">UI Structure</h4>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {data.ui_structure.map((u, idx) => (
                  <li key={idx}>{u}</li>
                ))}
              </ul>
            </section>
          )}

          {data.integrations?.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold mb-1">Integrations</h4>
              <div className="flex flex-wrap gap-1">
                {data.integrations.map((i) => (
                  <Badge key={i} className="bg-slate-800 text-white">{i}</Badge>
                ))}
              </div>
            </section>
          )}

          {data.acceptance_criteria?.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold mb-1">Acceptance Criteria</h4>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {data.acceptance_criteria.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h4 className="text-sm font-semibold mb-2">Parameters (Overrides)</h4>
            {rows.length === 0 && (
              <p className="text-xs text-slate-500 mb-2">Add custom parameters to guide generation.</p>
            )}
            <div className="space-y-2">
              {rows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input placeholder="Key" value={row.k} onChange={(e) => updateRow(id, idx, 'k', e.target.value)} />
                  <Input placeholder="Value" value={row.v} onChange={(e) => updateRow(id, idx, 'v', e.target.value)} />
                  <Button variant="outline" className="rounded-full" onClick={() => removeRow(id, idx)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="rounded-full" onClick={() => addRow(id)}>
                Add parameter
              </Button>
            </div>
            <div className="mt-4">
              <Button className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={onCreate}>
                Create with Overrides
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}