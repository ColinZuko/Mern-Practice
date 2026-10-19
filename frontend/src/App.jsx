import { BrowserRouter as Router, Navigate, Route, Routes, useParams } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./AuthContext";
import { About } from "./pages/About";
import { Recipes } from "./pages/Recipes";
import { Landing } from "./pages/Landing";
import { Home } from "./pages/Home";
import { ReadBlog } from "./pages/ReadBlog";
import { CreateBlog } from "./pages/CreateBlog";
import { EditBlog } from "./pages/EditBlog";
import { Profile } from "./pages/Profile";
import { Author } from "./pages/Author";
import { Admin } from "./pages/Admin";
import { NotFound } from "./pages/NotFound";
import { VerifyEmail } from "./pages/VerifyEmail";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Privacy } from "./pages/Privacy";
import { Unsubscribe } from "./pages/Unsubscribe";
import { PinMaker } from "./pages/PinMaker";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { AnalyticsTracker } from "./components/AnalyticsTracker";

const WRITERS = ["editor", "admin"];

// Old recipe addresses (/readblog/<id>) go to the new ones; the page then adds the title to the address
function OldRecipeAddress() {
  const { id } = useParams();
  return <Navigate to={`/recipe/${id}`} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AnalyticsTracker />
        <Routes>
          <Route path="/login" element={<Landing />} />
          <Route element={<Layout />}>
            {/* Public pages: guests can browse and read */}
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/recipe/:slugId" element={<ReadBlog />} />
            <Route path="/readblog/:id" element={<OldRecipeAddress />} />
            <Route path="/author/:id" element={<Author />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Old link to the recipes page */}
            <Route path="/contact" element={<Navigate to="/recipes" replace />} />

            {/* Any logged-in user */}
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

            {/* Editors and admins */}
            <Route path="/createblog" element={<RequireAuth roles={WRITERS}><CreateBlog /></RequireAuth>} />
            <Route path="/edit-post/:id" element={<RequireAuth roles={WRITERS}><EditBlog /></RequireAuth>} />
            <Route path="/pin/:id" element={<RequireAuth roles={WRITERS}><PinMaker /></RequireAuth>} />

            {/* Admins */}
            <Route path="/admin" element={<RequireAuth roles={["admin"]}><Admin /></RequireAuth>} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
