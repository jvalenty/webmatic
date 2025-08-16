import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import { AuthAPI } from "./api";

export default function AuthBar({ onAuthChange }) {
  const [user, setUser] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const fetchMe = async () => {
    try {
      const me = await AuthAPI.me();
      setUser(me);
      onAuthChange?.(true, me);
    } catch (e) {
      setUser(null);
      onAuthChange?.(false, null);
    }
  };

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = () => {
    AuthAPI.logout();
    setUser(null);
    onAuthChange?.(false, null);
    toast.success("Signed out");
  };

  return (
    <div className="flex items-center gap-2">
      {!user ? (
        <>
          <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full">Login</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Login</DialogTitle>
              </DialogHeader>
              <AuthForm mode="login" onSuccess={() => { setLoginOpen(false); fetchMe(); }} />
            </DialogContent>
          </Dialog>

          <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full">Register</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Register</DialogTitle>
              </DialogHeader>
              <AuthForm mode="register" onSuccess={() => { setRegisterOpen(false); fetchMe(); }} />
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-600">{user.email}</div>
          <Button variant="outline" className="rounded-full" onClick={onLogout}>Sign out</Button>
        </div>
      )}
    </div>
  );
}

function AuthForm({ mode, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) { toast("Fill email and password"); return; }
    try {
      setLoading(true);
      if (mode === "login") await AuthAPI.login(email, password);
      else await AuthAPI.register(email, password);
      toast.success(mode === "login" ? "Welcome back" : "Account created");
      onSuccess?.();
    } catch (e) {
      console.error(e);
      toast.error("Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-xs font-medium">Email</div>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </div>
      <div className="space-y-1">
        <div className="text-xs font-medium">Password</div>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      <Button onClick={submit} disabled={loading} className="w-full rounded-full">{loading ? "Please wait" : (mode === "login" ? "Login" : "Register")}</Button>
    </div>
  );
}