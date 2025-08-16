import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChatHome from "./features/builder/ChatHome";
import ProjectBuilder from "./features/builder/ProjectBuilder";
import ProjectsPage from "./features/projects/ProjectsPage";
import TemplatesPage from "./features/templates/TemplatesPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatHome />} />
        <Route path="/project/:id" element={<ProjectBuilder />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;