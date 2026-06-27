const $ = (id) => document.getElementById(id);

chrome.storage.local.get(["baseUrl", "userId"], (cfg) => {
  if (cfg.baseUrl) $("baseUrl").value = cfg.baseUrl;
  if (cfg.userId) $("userId").value = cfg.userId;
  $("status").innerHTML = cfg.userId ? '<span class="ok">✓ Connected</span>' : "Not connected yet.";
});

$("save").addEventListener("click", () => {
  const baseUrl = $("baseUrl").value.trim().replace(/\/$/, "");
  const userId = $("userId").value.trim();
  chrome.storage.local.set({ baseUrl, userId }, () => {
    $("status").innerHTML = userId ? '<span class="ok">✓ Saved</span>' : "Enter your reader ID.";
  });
});
