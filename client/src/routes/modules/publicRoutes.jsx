import { Route } from "react-router-dom";

import RouterPublic from "../../utils/RoutePublic";
import { Forgot, Reset, Signin, Signup } from "../../module/auth";

const renderPublicRoutes = () => (
  <Route element={<RouterPublic />}>
    <Route path="/" element={<Signin />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/forgot-password" element={<Forgot />} />
    <Route path="/reset-password" element={<Reset />} />
  </Route>
);

export default renderPublicRoutes;
