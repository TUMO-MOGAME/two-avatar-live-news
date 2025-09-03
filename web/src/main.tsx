
import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Admin from "./pages/Admin";
import Presenter from "./pages/Presenter";
import "./index.css";

const router = createBrowserRouter([
  { path: "/", element: <div className="p-6">Go to <a className="underline" href="/admin">Admin</a> or <a className="underline" href="/presenter">Presenter</a></div> },
  { path: "/admin", element: <Admin /> },
  { path: "/presenter", element: <Presenter /> },
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
