export const isAuthenticated = () => {
  return localStorage.getItem("isSignin") === "true";
};

export const setSignIn = () => {
  localStorage.setItem("isSignin", "true");
};

export const setSignOut = () => {
  localStorage.removeItem("isSignin");
  // This should also clear the cookie from the browser
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
};
