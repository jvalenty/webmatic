import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ProjectsAPI, ChatAPI, GenerateAPI } from "../projects/api";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "../../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import AuthBar from "../auth/AuthBar";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

export default function ProjectBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Authentication state
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  
  // Core project state - single source of truth
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Preview blob URL for iframe (HTTPS-compatible)
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Chat state - separate from project artifacts
  const [chat, setChat] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  // UI state
  const [msg, setMsg] = useState("");
  const [provider, setProvider] = useState("claude");
  const [generating, setGenerating] = useState(false);
  const [rightTab, setRightTab] = useState("preview");
  const [selectedFile, setSelectedFile] = useState(0);
  
  // Projects list for Home tab
  const [projects, setProjects] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, project: null });

  // Home tab creation
  const [homePrompt, setHomePrompt] = useState("");
  const [creating, setCreating] = useState(false);

  // Load project data - happens once per project ID change
  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      const p = await ProjectsAPI.get(id);
      setProject(p);
      
      // Auto-switch to preview if we have artifacts
      if (p?.artifacts?.html_preview) {
        setRightTab("preview");
      }
    } catch (e) {
      console.error("Failed to load project:", e);
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load chat history - independent of project artifacts
  const loadChat = useCallback(async () => {
    try {
      setChatLoading(true);
      const data = await ChatAPI.getChat(id);
      setChat(data.messages || []);
    } catch (e) {
      console.error("Failed to load chat:", e);
      // Don't toast this error - it's not critical
    } finally {
      setChatLoading(false);
    }
  }, [id]);

  // Load projects list for Home tab
  const loadProjects = useCallback(async () => {
    try {
      setListLoading(true);
      const list = await ProjectsAPI.list();
      setProjects(list);
    } catch (e) {
      console.error("Failed to load projects:", e);
    } finally {
      setListLoading(false);
    }
  }, []);

  // Load data when project ID changes
  useEffect(() => {
    if (id) {
      loadProject();
      loadChat();
      loadProjects();
    }
  }, [id, loadProject, loadChat, loadProjects]);

  // Send message and generate code
  const sendMessage = async () => {
    if (!msg.trim() || !authed) return;
    
    const userMessage = { role: "user", content: msg.trim() };
    
    try {
      setGenerating(true);
      
      // Add user message to chat immediately for UI responsiveness
      setChat(prev => [...prev, userMessage]);
      setMsg("");
      
      // 1. Append user message to backend
      await ChatAPI.appendMessage(id, userMessage.content, userMessage.role);
      
      // 2. Generate code
      const artifacts = await GenerateAPI.generate(id, provider, userMessage.content);
      
      // 3. Update project with new artifacts (single state update)
      setProject(prev => ({
        ...prev,
        artifacts: artifacts
      }));
      
      // 4. Reload chat to get assistant message
      await loadChat();
      
      // 5. Switch to preview if generation succeeded
      if (artifacts.mode === "ai" && artifacts.html_preview) {
        setRightTab("preview");
        toast.success("Generated successfully");
      } else if (artifacts.mode === "stub") {
        toast.warning(`Generated with fallback: ${artifacts.error || "LLM unavailable"}`);
      }
      
    } catch (e) {
      console.error("Generation failed:", e);
      const errorMsg = e?.response?.data?.detail || e?.message || "Generation failed";
      toast.error(errorMsg);
      
      // Remove the optimistic user message on error
      setChat(prev => prev.slice(0, -1));
    } finally {
      setGenerating(false);
    }
  };

  // Create new project from Home tab
  const createProject = async () => {
    if (!homePrompt.trim()) {
      toast.error("Please describe what you want to build");
      return;
    }
    
    try {
      setCreating(true);
      
      const projectName = homePrompt.trim().split(/\s+/).slice(0, 6).join(" ");
      const project = await ProjectsAPI.create({
        name: projectName.charAt(0).toUpperCase() + projectName.slice(1),
        description: homePrompt.trim()
      });
      
      navigate(`/project/${project.id}`);
      toast.success("Project created");
    } catch (e) {
      console.error("Project creation failed:", e);
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  // Delete project
  const deleteProject = async (e, projectId, projectName) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Open custom confirmation dialog instead of window.confirm
    setDeleteDialog({ open: true, project: { id: projectId, name: projectName } });
  };

  const confirmDelete = async () => {
    const { project } = deleteDialog;
    if (!project) return;
    
    try {
      await ProjectsAPI.delete(project.id);
      setProjects(prev => prev.filter(p => p.id !== project.id));
      toast.success("Project deleted successfully");
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error("Failed to delete project");
    } finally {
      setDeleteDialog({ open: false, project: null });
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ open: false, project: null });
  };
  const updateProjectName = async (newName) => {
    if (!newName.trim() || !project) return;
    
    try {
      await ProjectsAPI.update(id, { name: newName.trim() });
      setProject(prev => ({ ...prev, name: newName.trim() }));
      toast.success("Project renamed");
    } catch (e) {
      console.error("Rename failed:", e);
      toast.error("Failed to rename project");
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210,20%,98%)]">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 border-b border-slate-200">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="h-9 w-9 rounded-xl bg-slate-900 grid place-items-center text-white shadow-md">Ξ</Link>
            <div className="flex items-center gap-3">
              <Input
                value={project?.name || ""}
                onChange={(e) => setProject(prev => ({ ...prev, name: e.target.value }))}
                onBlur={(e) => updateProjectName(e.target.value)}
                className="h-8 rounded-none border-slate-300 text-sm w-[280px]"
                placeholder="Project name..."
              />
              <div className="text-xs text-slate-500">WΞBMΛTIC.dev</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user?.email && <div className="text-sm text-slate-600">Welcome back, {user.email}</div>}
            <AuthBar onAuthChange={(ok, me) => { setAuthed(!!ok); setUser(me || null); }} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 py-6">
        <div className="mt-0" style={{ height: "calc(100vh - 180px)" }}>
          <PanelGroup direction="horizontal">
            {/* Left Panel */}
            <Panel key={id} defaultSize={25} minSize={18} maxSize={50}>
              <div className="h-full border border-slate-200 bg-white flex flex-col">
                <div className="px-3 pt-2 border-b">
                  <Tabs defaultValue="agent">
                    <TabsList className="border-b border-slate-200 rounded-none h-auto p-0 bg-transparent sticky top-0 bg-white z-10">
                      <TabsTrigger value="home" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900">Home</TabsTrigger>
                      <TabsTrigger value="agent" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900">Agent</TabsTrigger>
                      <TabsTrigger value="files" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900">Files</TabsTrigger>
                    </TabsList>

                    {/* Home Tab */}
                    <TabsContent value="home">
                      <div className="p-3 space-y-3">
                        <Textarea 
                          rows={4} 
                          value={homePrompt} 
                          onChange={(e) => setHomePrompt(e.target.value)} 
                          placeholder="Describe what you want to build..." 
                        />
                        <Button 
                          className="rounded-full bg-slate-900 hover:bg-slate-800 w-full" 
                          onClick={createProject} 
                          disabled={creating || !homePrompt.trim()}
                        >
                          {creating ? "Creating…" : "Start Building"}
                        </Button>
                        
                        <div className="text-xs font-medium text-slate-600 pt-2">Your projects</div>
                        <div className="space-y-2 overflow-auto" style={{ maxHeight: "32vh" }}>
                          {listLoading ? (
                            [...Array(6)].map((_, i) => (
                              <div key={i} className="h-16 border border-slate-200 bg-white animate-pulse" />
                            ))
                          ) : projects.length === 0 ? (
                            <div className="text-xs text-slate-500">No projects yet.</div>
                          ) : (
                            projects.map((p) => (
                              <div key={p.id} className="group relative">
                                <Link 
                                  to={`/project/${p.id}`} 
                                  className="block border border-slate-200 bg-white p-3 hover:shadow-sm transition"
                                >
                                  <div className="text-xs font-medium line-clamp-1">{p.name}</div>
                                  <div className="text-[10px] text-slate-500 line-clamp-2 mt-1">{p.description}</div>
                                </Link>
                                
                                {/* Three-dot menu */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 hover:bg-slate-100"
                                        onClick={(e) => e.preventDefault()}
                                      >
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                                        </svg>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-32">
                                      <DropdownMenuItem 
                                        className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                        onClick={(e) => deleteProject(e, p.id, p.name)}
                                      >
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Agent Tab */}
                    <TabsContent value="agent">
                      <div className="flex-1 flex flex-col h-full">
                        <div className="px-4 py-2 text-xs text-slate-500 border-b">Chat</div>
                        
                        {/* Chat Messages */}
                        <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
                          {chatLoading ? (
                            <div className="text-xs text-slate-400">Loading chat...</div>
                          ) : chat.length === 0 ? (
                            <div className="text-xs text-slate-400">Start chatting to generate your project.</div>
                          ) : (
                            chat.map((m, i) => (
                              <div key={i} className={`text-sm ${m.role === "user" ? "text-slate-800" : "text-slate-600"}`}>
                                <div className={`${m.role === "user" ? "font-medium" : "italic"}`}>
                                  {m.role === "user" ? "You" : "Assistant"}:
                                </div>
                                <div className="mt-1">{m.content}</div>
                              </div>
                            ))
                          )}
                          
                          {generating && (
                            <div className="text-sm text-slate-600 italic">
                              <div>Assistant:</div>
                              <div className="mt-1">Generating...</div>
                            </div>
                          )}
                        </div>
                        
                        {/* Chat Input */}
                        <div className="border-t p-3 space-y-2">
                          {!authed && (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2">
                              Login required to generate code. Use Login/Register buttons above.
                            </div>
                          )}
                          
                          <Textarea 
                            rows={3} 
                            value={msg} 
                            onChange={(e) => setMsg(e.target.value)} 
                            placeholder="Ask to add features, modify design..."
                            disabled={!authed}
                          />
                          
                          <div className="flex items-center gap-2">
                            <Select value={provider} onValueChange={setProvider}>
                              <SelectTrigger className="w-[120px] rounded-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="claude">Claude</SelectItem>
                                <SelectItem value="gpt">GPT</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button 
                              className="rounded-full bg-slate-900 hover:bg-slate-800 flex-1" 
                              onClick={sendMessage}
                              disabled={!authed || generating || !msg.trim()}
                            >
                              {generating ? "Generating…" : "Send"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Files Tab */}
                    <TabsContent value="files">
                      <div className="p-4">
                        <div className="text-xs text-slate-500 mb-3">Generated Files</div>
                        {project?.artifacts?.files?.length ? (
                          <div className="space-y-1">
                            {project.artifacts.files.map((file, i) => (
                              <div key={i} className="text-xs text-slate-700 font-mono">{file.path}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">No files generated yet.</div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-slate-200 hover:bg-slate-300 cursor-col-resize" />

            {/* Right Panel */}
            <Panel minSize={40} defaultSize={75}>
              <div className="h-full border border-slate-200 bg-white flex flex-col">
                {/* Tab Header */}
                <div className="px-4 pt-2 border-b">
                  <div className="flex items-center justify-between">
                    <Tabs value={rightTab} onValueChange={setRightTab}>
                      <TabsList className="border-b border-slate-200 rounded-none h-auto p-0 bg-transparent">
                        <TabsTrigger value="preview" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900">Preview</TabsTrigger>
                        <TabsTrigger value="code" className="rounded-none px-3 py-2 h-auto border-b-2 border-transparent text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900">Code</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    
                    <div className="flex items-center gap-2 text-xs">
                      {project?.artifacts?.mode && (
                        <span className={`uppercase tracking-wide px-2 py-1 rounded ${
                          project.artifacts.mode === "ai" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {project.artifacts.mode}
                        </span>
                      )}
                      {project?.artifacts?.generated_at && (
                        <span className="text-slate-400">
                          {new Date(project.artifacts.generated_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 min-h-0">
                  <Tabs value={rightTab} onValueChange={setRightTab} className="h-full">
                    {/* Preview Tab */}
                    <TabsContent value="preview" className="h-full m-0 data-[state=active]:flex">
                      {project?.artifacts?.html_preview ? (
                        <iframe 
                          title="preview" 
                          className="w-full h-full border-0" 
                          src={`data:text/html;charset=utf-8,${encodeURIComponent(project.artifacts.html_preview)}`}
                        />
                      ) : (
                        <div className="h-full grid place-items-center text-slate-500">
                          <div className="text-center">
                            <div className="text-sm">No preview generated yet</div>
                            <div className="text-xs mt-1">Use the Agent tab to generate code</div>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    {/* Code Tab */}
                    <TabsContent value="code" className="h-full m-0 data-[state=active]:flex">
                      {project?.artifacts?.files?.length ? (
                        <div className="h-full w-full grid grid-cols-12">
                          <div className="col-span-4 border-r overflow-auto">
                            <ul className="text-xs">
                              {project.artifacts.files.map((file, i) => (
                                <li 
                                  key={i} 
                                  onClick={() => setSelectedFile(i)}
                                  className={cn(
                                    "px-3 py-2 border-b truncate cursor-pointer",
                                    selectedFile === i ? "bg-slate-100" : "hover:bg-slate-50"
                                  )}
                                >
                                  {file.path}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="col-span-8 overflow-auto p-4">
                            <pre className="text-xs whitespace-pre-wrap font-mono">
                              {project.artifacts.files[selectedFile]?.content || "Select a file to view its content"}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full grid place-items-center text-slate-500">
                          <div className="text-center">
                            <div className="text-sm">No code generated yet</div>
                            <div className="text-xs mt-1">Use the Agent tab to generate code</div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.project?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}