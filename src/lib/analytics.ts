import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = "G-MCLCFGYM63";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;

  ReactGA.initialize(GA_MEASUREMENT_ID);
  initialized = true;
}

export function trackPageView(path: string) {
  if (!initialized) return;

  ReactGA.send({
    hitType: "pageview",
    page: path,
  });
}
