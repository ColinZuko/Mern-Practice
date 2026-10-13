import { HashRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { Landing } from "./pages/Landing";
import { Home } from "./pages/Home";
import { ReadBlog } from "./pages/ReadBlog";
import { CreateBlog } from "./pages/CreateBlog";
import { Profile } from "./pages/Profile";
import { Layout } from "./components/Layout";
import { EditBlog } from "./components/EditBlog";
import { RequireAuth } from "./components/RequireAuth";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<Landing />} />
        <Route element={<Layout />}>
          {/* Public pages: guests can browse and read */}
          <Route path="/home" element={<Home />} />
          <Route path="/readblog/:id" element={<ReadBlog />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          {/* Logged-in only */}
          <Route path="/createblog" element={<RequireAuth><CreateBlog /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/edit-post/:id" element={<RequireAuth><EditBlog /></RequireAuth>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
